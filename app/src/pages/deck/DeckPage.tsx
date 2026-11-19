import { type PointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isApiError } from '../../core/api/errors';
import type { DeckBook, SessionId } from '../../core/api/types';
import {
  ask as askMode,
  cancelAsk,
  type DeckState,
  type Gesture,
  goesToShelf,
  isFinished,
  judge,
  type Reaction,
  startDeck,
  undo as undoDeck,
} from '../../core/deck';
import { createVoice, endOfBatchLine, noResultLine, type VoiceKey } from '../../core/voice';
import { api, newIdempotencyKey, recallDeck, rememberDeck } from '../../platform/appApi';
import { requestSearchFocus, takeDeckOrigin } from '../../platform/handoff';
import { goBack, navigate } from '../../platform/router';
import { enqueueWrite } from '../../platform/writes';
import { useAnnounce } from '../../ui/a11y/Announcer';
import { useEscape } from '../../ui/a11y/escape';
import { Icon, type IconName } from '../../ui/icons/Icon';
import { Mascot, type MascotHandle, type MascotMood } from '../../ui/mascot/Mascot';
import { animate, DUR, EASE, reducedMotion } from '../../ui/motion';
import { Summary, type SummaryItem, summaryHeader } from '../../ui/Summary';
import { cardLabel, DeckCard } from './DeckCard';
import './deck.css';

/* Página do baralho (DESIGN.md §6 "Baralho", "Já li no baralho", "Fim do lote"; §4 "Do livro").
   Gestos: direita guarda, esquerda passa, para cima "já li"; teclado ← → ↑, Enter gira, Z desfaz, Esc sai. */

interface Loaded {
  sessionId: SessionId;
  query: string;
  books: DeckBook[];
  /** ♥ cheio: o livro está na estante agora. */
  onShelf: Record<string, boolean>;
}

/** Arrastar além disso solta o card; num gesto rápido, basta 60px (DESIGN.md §4). */
const THRESHOLD = 110;
const FLICK = 60;
const FLICK_SPEED = 0.8;
const TAP = 6;

const voice = createVoice();

export function DeckPage({ sessionId }: { sessionId: SessionId }) {
  const announce = useAnnounce();
  const [deck, setDeck] = useState<Loaded | null>(null);
  const [state, setState] = useState<DeckState | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [mood, setMoodState] = useState<MascotMood>('idle');
  const [line, setLine] = useState<{ text: string; icon?: IconName; n: number } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const mbox = useRef<HTMLDivElement>(null);
  const acts = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const undoBtn = useRef<HTMLButtonElement>(null);
  const readBtn = useRef<HTMLButtonElement>(null);
  const mascot = useRef<MascotHandle>(null);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const entered = useRef<SessionId | null>(null);
  const mascotFrom = useRef<DOMRect | null>(null);
  const focusAfter = useRef<'card' | 'undo' | 'read' | 'summary' | null>(null);
  const undoFrom = useRef<string | null>(null);
  const drag = useRef({ active: false, x: 0, y: 0, dx: 0, dy: 0, t: 0 });
  const queued = useRef<Gesture[]>([]);
  const release = useRef(false);
  /** Cards que subiram na pilha: a animação (fill: forwards) sai depois do novo render, senão o arrasto não move o card. */
  const shifted = useRef<HTMLElement[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    [],
  );

  const setMood = useCallback((m: MascotMood) => setMoodState(m), []);

  /** Fala do mascote do baralho: aparece no balão e vai para o leitor de tela junto com o que mudou. */
  const say = useCallback(
    (text: string, options: { mood?: MascotMood; icon?: IconName; extra?: string } = {}) => {
      setLine((prev) => ({ text, ...(options.icon ? { icon: options.icon } : {}), n: (prev?.n ?? 0) + 1 }));
      mascot.current?.talk();
      if (options.mood) setMood(options.mood);
      announce(options.extra ? `${text} ${options.extra}` : text);
    },
    [announce, setMood],
  );
  const sayKey = useCallback(
    (key: VoiceKey, options: { mood?: MascotMood; extra?: string } = {}) => say(voice.pick(key), options),
    [say],
  );
  const settle = useCallback(
    (ms = 1500) =>
      later(
        () =>
          setMoodState((m) =>
            m === 'happy' || m === 'roll' || m === 'doubt' || m === 'surprise' ? 'idle' : m,
          ),
        ms,
      ),
    [later],
  );

  // Carrega a busca: a que acabou de chegar da home, ou de novo pela API (link direto, recarregar).
  useEffect(() => {
    let live = true;
    const fresh = recallDeck(sessionId);
    if (fresh) {
      setDeck({ sessionId, query: fresh.query, books: fresh.books, onShelf: {} });
      setState(startDeck(fresh.books.map(() => null)));
      return;
    }
    api
      .getSession(sessionId)
      .then((s) => {
        if (!live) return;
        setDeck({
          sessionId,
          query: s.query,
          books: s.books.map((b) => ({ ...b, why: null })),
          onShelf: Object.fromEntries(s.books.map((b) => [b.id, b.on_shelf])),
        });
        setState(startDeck(s.books.map((b) => b.result)));
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (isApiError(e, 'not_found')) navigate({ name: 'home' }, { replace: true });
        else say(voice.pick('error'), { mood: 'doubt', icon: 'offline' });
      });
    return () => {
      live = false;
    };
  }, [sessionId, say]);

  // "Por que combina" que chega depois: pede o do topo e dos dois de trás.
  const index = state?.index ?? 0;
  useEffect(() => {
    if (!deck) return;
    const missing = deck.books.slice(index, index + 3).filter((b) => b.why === null);
    if (!missing.length) return;
    let live = true;
    api
      .getWhy(
        deck.sessionId,
        missing.map((b) => b.id),
      )
      .then((why) => {
        if (!live) return;
        setDeck(
          (d) =>
            d && {
              ...d,
              books: d.books.map((b) => (b.why === null && why[b.id] ? { ...b, why: why[b.id] ?? null } : b)),
            },
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [deck, index]);

  /* "Do livro": as cartas saem do livro do mascote da home, de 8% e 14° de giro até o lugar, 80ms uma atrás
     da outra. Aberto por outro caminho, descem do topo. Só depois de um quadro desenhado (R6). */
  useLayoutEffect(() => {
    if (!deck || !state || entered.current === deck.sessionId) return;
    entered.current = deck.sessionId;
    const origin = takeDeckOrigin();
    if (isFinished(state)) {
      sayKey('deckStart', { mood: 'happy' });
      return;
    }
    const first = deck.books[state.index];
    sayKey('deckStart', {
      mood: 'happy',
      extra: first ? `${state.index + 1} de ${state.size}: ${cardLabel(first)}` : '',
    });
    settle(1600);
    if (reducedMotion()) return;
    requestAnimationFrame(() => {
      const box = stack.current;
      if (!box) return;
      const sr = box.getBoundingClientRect();
      const bx = origin ? origin.x - (sr.left + sr.width / 2) : 0;
      const by = origin ? origin.y - (sr.top + sr.height / 2) : -260;
      [...box.querySelectorAll<HTMLElement>('.k-cw')].forEach((card, i) => {
        const base = getComputedStyle(card).transform;
        card.animate(
          [
            { transform: `translate(${bx}px,${by}px) scale(.08) rotate(-14deg)`, opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { transform: base === 'none' ? 'none' : base, opacity: 1 },
          ],
          { duration: 600, delay: i * 80, easing: EASE.out, fill: 'backwards' },
        );
      });
    });
  }, [deck, state, sayKey, settle]);

  // Depois de cada mudança: foco no lugar certo (R12), card voltando do desfazer, mascote indo para o canto.
  useLayoutEffect(() => {
    if (release.current) {
      release.current = false;
      busy.current = false;
    }
    if (!busy.current && shifted.current.length) {
      for (const el of shifted.current) for (const a of el.getAnimations()) a.cancel();
      shifted.current = [];
    }
    const where = focusAfter.current;
    focusAfter.current = null;
    if (where === 'card') top.current?.focus({ preventScroll: true });
    else if (where === 'undo') undoBtn.current?.focus({ preventScroll: true });
    else if (where === 'read') readBtn.current?.focus({ preventScroll: true });
    else if (where === 'summary') {
      (endRef.current?.querySelector<HTMLElement>('.hb') ?? root.current)?.focus({ preventScroll: true });
    }
    const from = undoFrom.current;
    undoFrom.current = null;
    if (from && top.current) {
      animate(
        top.current,
        [
          { transform: from, opacity: 0.3 },
          { transform: 'none', opacity: 1 },
        ],
        {
          duration: 300,
          easing: EASE.out,
        },
      );
    }
    const r0 = mascotFrom.current;
    mascotFrom.current = null;
    if (r0 && mbox.current && !reducedMotion()) {
      const r1 = mbox.current.getBoundingClientRect();
      mbox.current.animate(
        [{ transform: `translate(${r0.left - r1.left}px,${r0.top - r1.top}px)` }, { transform: 'none' }],
        {
          duration: 360,
          easing: EASE.drawer,
        },
      );
      const parts = endRef.current?.querySelectorAll<HTMLElement>('.k-sumh, .gl li, .k-endfoot');
      parts?.forEach((el, i) => {
        if (i > 11) return;
        el.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 240,
            delay: 80 + i * 30,
            easing: EASE.out,
            fill: 'backwards',
          },
        );
      });
    }
  });

  const react = useCallback(
    (reaction: Reaction, next: DeckState, loaded: Loaded, shelf: Record<string, boolean>) => {
      if (isFinished(next)) {
        const loved = loaded.books.filter((b) => shelf[b.id]).length;
        const summary = summaryHeader(summaryItems(loaded, next, shelf));
        say(endOfBatchLine(loved), { mood: 'happy', extra: summary });
        settle();
        return;
      }
      const card = loaded.books[next.index];
      sayKey(reaction.line, {
        mood: reaction.mood,
        extra: card ? `${next.index + 1} de ${next.size}: ${cardLabel(card)}` : '',
      });
      settle();
    },
    [say, sayKey, settle],
  );

  /** ♥ ou ✕ (ou, no modo "já li", "amei" ou "não curti"): o card sai e a pilha sobe. */
  const commit = useCallback(
    (gesture: Gesture, from = { x: 0, y: 0 }) => {
      if (busy.current) {
        // Gesto feito enquanto o card sai: entra na fila e vale na ordem, sem se perder.
        queued.current.push(gesture);
        return;
      }
      if (!state || !deck) return;
      const step = judge(state, gesture);
      if (!step) return;
      const book = deck.books[step.judged.index];
      if (!book) return;
      busy.current = true;
      const lostFocus = acts.current?.contains(document.activeElement) ?? false;
      // R12: o card com foco vai sair; o foco passa para o próximo.
      const cardHadFocus = top.current?.contains(document.activeElement) ?? false;
      // Cada julgamento termina uma vez só: o plano B de tempo (R6) de um card não pode rodar no seguinte.
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        // A trava abre só depois que o novo estado for desenhado; até lá, gestos entram na fila.
        release.current = true;
        const shelf = goesToShelf(step.judged.result) ? { ...deck.onShelf, [book.id]: true } : deck.onShelf;
        const result = step.judged.result;
        enqueueWrite(() => api.judge(deck.sessionId, book.id, result, new Date().toISOString()));
        if (isFinished(step.state)) {
          mascotFrom.current = mbox.current?.getBoundingClientRect() ?? null;
          if (lostFocus || cardHadFocus) focusAfter.current = 'summary';
        } else if (cardHadFocus) {
          focusAfter.current = 'card';
        }
        setDeck({ ...deck, onShelf: shelf });
        setState(step.state);
        setFlipped(false);
        react(step.reaction, step.state, deck, shelf);
      };
      const card = top.current;
      if (!card || reducedMotion()) {
        finish();
        return;
      }
      const sign = gesture === 'love' ? 1 : -1;
      const up = step.judged.result === 'read_loved' || step.judged.result === 'read_disliked';
      const to = up
        ? `translate(${from.x}px,-640px)`
        : `translate(${sign * 480}px,${from.y - 30}px) rotate(${sign * 22}deg)`;
      const out = card.animate(
        [
          { transform: `translate(${from.x}px,${from.y}px) rotate(${from.x * 0.05}deg)` },
          { transform: to, opacity: 0.2 },
        ],
        { duration: DUR.card, easing: EASE.out, fill: 'forwards' },
      );
      for (const c of stack.current?.querySelectorAll<HTMLElement>('.k-cw:not([data-depth="0"])') ?? []) {
        const d = Number(c.dataset.depth);
        shifted.current.push(c);
        c.animate(
          [
            { transform: `translateY(${d * 12}px) scale(${1 - d * 0.05})` },
            { transform: `translateY(${(d - 1) * 12}px) scale(${1 - (d - 1) * 0.05})` },
          ],
          { duration: DUR.card, easing: EASE.out, fill: 'forwards' },
        );
      }
      // R6: o julgamento não espera a animação se o navegador não animar.
      out.finished.then(finish, finish);
      setTimeout(finish, DUR.card + 150);
    },
    [deck, react, state],
  );

  // Aplica o gesto que esperou o card anterior sair.
  useEffect(() => {
    if (busy.current || !state) return;
    const g = queued.current.shift();
    if (g) commit(g);
  }, [state, commit]);

  const undo = useCallback(() => {
    if (busy.current || !state || !deck) return;
    const step = undoDeck(state);
    if (!step) return;
    const book = deck.books[step.undone.index];
    if (!book) return;
    enqueueWrite(() => api.unjudge(deck.sessionId, book.id));
    const shelf = goesToShelf(step.undone.result) ? { ...deck.onShelf, [book.id]: false } : deck.onShelf;
    const r = step.undone.result;
    const sign = r === 'love' || r === 'read_loved' ? 1 : -1;
    undoFrom.current =
      r === 'read_loved' || r === 'read_disliked'
        ? 'translate(0,-560px)'
        : `translate(${sign * 420}px,-20px) rotate(${sign * 18}deg)`;
    if (
      top.current?.contains(document.activeElement) ||
      (step.state.history.length === 0 && document.activeElement === undoBtn.current)
    ) {
      focusAfter.current = 'card';
    }
    setDeck({ ...deck, onShelf: shelf });
    setState(step.state);
    setFlipped(false);
    setMood('surprise');
    later(() => setMood('idle'), 1000);
    announce(`${step.state.index + 1} de ${step.state.size}: ${cardLabel(book)}`);
  }, [announce, deck, later, setMood, state]);

  const enterAsk = useCallback(() => {
    if (!state || isFinished(state) || state.asking || busy.current) return;
    if (document.activeElement === readBtn.current) focusAfter.current = 'undo';
    setState(askMode(state));
    setFlipped(false);
    sayKey('ask', { mood: 'listen' });
  }, [sayKey, state]);

  const leaveAsk = useCallback(() => {
    if (!state?.asking) return;
    if (document.activeElement === undoBtn.current) focusAfter.current = 'read';
    setState(cancelAsk(state));
    sayKey('askCancel', { mood: 'idle' });
  }, [sayKey, state]);

  // Esc no modo "já li" só sai do modo; fora dele, a página fecha (Shell).
  useEscape(leaveAsk, Boolean(state?.asking));

  const flip = useCallback(() => {
    setFlipped((f) => {
      if (!f) {
        setMood('read');
        later(() => setMoodState((m) => (m === 'read' ? 'idle' : m)), 1600);
      }
      return !f;
    });
  }, [later, setMood]);

  // Arrastar o card do topo: segue o dedo com 0,05° de giro por px.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy.current || e.button > 0) return;
    drag.current = { active: true, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = 'none';
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.dx = e.clientX - d.x;
    d.dy = e.clientY - d.y;
    const up = d.dy < 0 && Math.abs(d.dy) > Math.abs(d.dx);
    e.currentTarget.style.transform = `translate(${d.dx}px,${up ? d.dy : d.dy * 0.25}px) rotate(${d.dx * 0.05}deg)`;
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const card = e.currentTarget;
    const back = () => {
      card.style.transition = `transform 300ms ${EASE.out}`;
      card.style.transform = '';
    };
    if (Math.abs(d.dx) < TAP && Math.abs(d.dy) < TAP) {
      card.style.transform = '';
      if (e.type === 'pointerup') flip();
      return;
    }
    if (d.dy < -THRESHOLD && Math.abs(d.dy) > Math.abs(d.dx)) {
      back();
      if (state?.asking) leaveAsk();
      else enterAsk();
      return;
    }
    const speed = Math.abs(d.dx) / Math.max(performance.now() - d.t, 1);
    if (Math.abs(d.dx) > THRESHOLD || (speed > FLICK_SPEED && Math.abs(d.dx) > FLICK)) {
      card.style.transform = '';
      commit(d.dx > 0 ? 'love' : 'pass', { x: d.dx, y: d.dy * 0.25 });
      return;
    }
    back();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    // Num botão, Enter e espaço são do botão; as setas e o Z continuam valendo (o foco costuma estar no ♥).
    const onButton = target.closest('button') !== null;
    if (onButton && (e.key === 'Enter' || e.key === ' ')) return;
    if (target.closest('.k-end')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      commit('love');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      commit('pass');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state?.asking) leaveAsk();
      else enterAsk();
    } else if ((e.key === 'Enter' || e.key === ' ') && target.classList.contains('k-cw')) {
      e.preventDefault();
      flip();
    } else if (e.key.toLowerCase() === 'z' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (state?.asking) leaveAsk();
      else undo();
    }
  };

  /* Os atalhos valem na página inteira: o foco começa na seção da página (Shell), não dentro do baralho. */
  const keys = useRef(onKeyDown);
  keys.current = onKeyDown;
  useEffect(() => {
    const page = root.current?.closest<HTMLElement>('.a-page');
    if (!page) return;
    const handler = (e: KeyboardEvent) => keys.current(e);
    page.addEventListener('keydown', handler);
    return () => page.removeEventListener('keydown', handler);
  }, []);

  // Resumo: mudar o ♥ depois (DESIGN.md §6).
  const toggle = useCallback(
    (item: SummaryItem) => {
      if (!deck) return;
      const on = !item.onShelf;
      enqueueWrite(() => (on ? api.addToShelf(item.id, deck.sessionId) : api.removeFromShelf(item.id)));
      setDeck({ ...deck, onShelf: { ...deck.onShelf, [item.id]: on } });
      sayKey(on ? 'rescue' : 'unlove', { mood: on ? 'happy' : 'doubt' });
      settle(1200);
    },
    [deck, sayKey, settle],
  );

  const back = () => {
    requestSearchFocus();
    goBack();
  };

  const more = () => {
    if (!deck || loadingMore) return;
    setLoadingMore(true);
    sayKey('deckMore', { mood: 'read' });
    api
      .createSession(
        { query: deck.query, seed_book_id: null, continues: deck.sessionId },
        { idempotencyKey: newIdempotencyKey() },
      )
      .then((s) => {
        setLoadingMore(false);
        if (!s.books.length) {
          say(noResultLine(deck.query), { mood: 'doubt' });
          return;
        }
        rememberDeck(s);
        navigate({ name: 'baralho', sessionId: s.session_id }, { replace: true });
      })
      .catch(() => {
        setLoadingMore(false);
        say(voice.pick('error'), { mood: 'surprise', icon: 'offline' });
        later(() => setMood('doubt'), 1200);
      });
  };

  const finished = state ? isFinished(state) : false;
  const asking = state?.asking ?? false;
  const visible = deck && state ? deck.books.slice(state.index, state.index + 3) : [];

  return (
    <div className="deck" ref={root} data-end={finished}>
      <header className="k-top">
        <button className="a-ib" type="button" aria-label="Voltar" onClick={back}>
          <Icon name="back" />
        </button>
        <h2 id="baralho-title" className="sr">
          Baralho
        </h2>
        <p className="k-q">{deck?.query ?? ''}</p>
        <span className="k-count">{state && !finished ? `${state.index + 1} de ${state.size}` : ''}</span>
      </header>

      <div className="k-stage">
        <div className="k-stack" ref={stack}>
          {visible
            .map((book, d) => ({ book, d }))
            .reverse()
            .map(({ book, d }) => (
              <DeckCard
                key={book.id}
                book={book}
                depth={d}
                flipped={d === 0 && flipped}
                {...(d === 0
                  ? {
                      ref: top,
                      onPointerDown,
                      onPointerMove,
                      onPointerUp: onPointerEnd,
                      onPointerCancel: onPointerEnd,
                    }
                  : {})}
              />
            ))}
        </div>

        {finished && deck && state && (
          <div className="k-end" ref={endRef}>
            <p className="k-sumh">{summaryHeader(summaryItems(deck, state, deck.onShelf))}</p>
            <Summary className="k-sum" items={summaryItems(deck, state, deck.onShelf)} onToggle={toggle} />
            <div className="k-endfoot">
              <button className="btn-quiet" type="button" onClick={back}>
                Nova busca
              </button>
              <button className="btn-primary" type="button" onClick={more} disabled={loadingMore}>
                Mais dez
              </button>
            </div>
          </div>
        )}

        <div className="k-mbox" ref={mbox}>
          <Mascot ref={mascot} className="k-m" mood={mood} />
        </div>
        {line && (
          <div key={line.n} className="k-bub pop" aria-hidden="true">
            {line.icon && <Icon name={line.icon} />}
            {line.text}
          </div>
        )}
      </div>

      {!finished && (
        <div className="k-acts" ref={acts} data-mode={asking ? 'read' : undefined}>
          <button
            ref={undoBtn}
            className="k-small"
            type="button"
            aria-label={asking ? 'Sair do já li' : 'Desfazer'}
            disabled={!asking && !state?.history.length}
            onClick={asking ? leaveAsk : undo}
          >
            <Icon name={asking ? 'back' : 'refresh'} />
          </button>
          <button
            className="k-round"
            type="button"
            aria-label={asking ? 'Já li e não curti' : 'Passar'}
            onClick={() => commit('pass')}
          >
            <Icon name="close" />
            <span className="k-badge" aria-hidden="true">
              <Icon name="book" />
            </span>
          </button>
          <button
            className="k-round yes"
            type="button"
            aria-label={asking ? 'Já li e amei' : 'Guardar na estante'}
            onClick={() => commit('love')}
          >
            <Icon name="heart" />
            <span className="k-badge" aria-hidden="true">
              <Icon name="book" />
            </span>
          </button>
          <button
            ref={readBtn}
            className="k-small"
            type="button"
            aria-label="Já li esse"
            aria-pressed={asking}
            disabled={asking}
            onClick={enterAsk}
          >
            <Icon name="book" />
          </button>
        </div>
      )}
    </div>
  );
}

function summaryItems(deck: Loaded, state: DeckState, shelf: Record<string, boolean>): SummaryItem[] {
  return state.history
    .slice()
    .sort((a, b) => a.index - b.index)
    .flatMap(({ index, result }) => {
      const b = deck.books[index];
      return b
        ? [
            {
              id: b.id,
              title: b.title,
              authors: b.authors,
              cover: b.cover,
              result,
              onShelf: Boolean(shelf[b.id]),
            },
          ]
        : [];
    });
}
