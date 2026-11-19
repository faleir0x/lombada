import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError } from '../../core/api/errors';
import type { CreatedSession, Idea } from '../../core/api/types';
import { ANNOUNCED, createVoice, noResultLine, type VoiceKey } from '../../core/voice';
import { api, newIdempotencyKey, rememberDeck } from '../../platform/appApi';
import { setDeckOrigin, takeSearchFocus } from '../../platform/handoff';
import { navigate } from '../../platform/router';
import { useTheme } from '../../platform/theme';
import { firstOpenOfSession, markOnboardingSeen, onboardingSeen } from '../../platform/visit';
import { writesSettled } from '../../platform/writes';
import { useAnnounce } from '../../ui/a11y/Announcer';
import { Bubble } from '../../ui/Bubble';
import { Icon, type IconName } from '../../ui/icons/Icon';
import { Lamp, type LampHandle } from '../../ui/Lamp';
import { Mascot, type MascotHandle, type MascotMood } from '../../ui/mascot/Mascot';
import { DUR, EASE, reducedMotion } from '../../ui/motion';
import { useShell } from '../../ui/shell/Shell';
import { Onboarding } from './Onboarding';
import './home.css';

/* A home (DESIGN.md §1, §5, §6, §7): o abajur preso ao mascote, o balão, a busca na zona do polegar.
   A lógica segue a do protótipo: falas por situação, timers de parado/sono, busca, ideias e erro. */

type Say =
  | { kind: 'speech'; text: string; icon?: IconName; retry?: boolean }
  | { kind: 'ideas'; text: string; items: Idea[]; more: boolean };

const IDLE_NUDGE = 10_000;
const IDLE_DROWSY = 17_000;
const IDLE_SLEEP = 20_000;
/** Aos 2 s de busca, o mascote comenta que está demorando (DESIGN.md §6). */
const SEARCH_SLOW = 1900;

const isFocused = (el: Element | null) => el !== null && document.activeElement === el;

export function Home({ covered }: { covered: boolean }) {
  const announce = useAnnounce();
  const { theme, toggle } = useTheme();
  const { returnFocus } = useShell();

  const [showOnboarding, setShowOnboarding] = useState(() => !onboardingSeen());
  const voice = useRef(createVoice({ firstVisit: showOnboarding })).current;
  const [say, setSay] = useState<Say>(() => ({ kind: 'speech', text: '' }));
  const [pop, setPop] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [mood, setMoodState] = useState<MascotMood>('idle');
  const [value, setValue] = useState('');
  const [shelfCount, setShelfCount] = useState(0);

  const homeRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const mascotWrap = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const mascot = useRef<MascotHandle>(null);
  const lamp = useRef<LampHandle>(null);

  // Estado lido pelos timers: sempre o atual, sem esperar render.
  const S = useRef({
    busy: false,
    ideas: false,
    action: false,
    mood: 'idle' as MascotMood,
    last: performance.now(),
    stage: 0,
    query: '',
    retry: () => {},
    covered,
    onboarding: showOnboarding,
    alive: true,
  });
  S.current.covered = covered;
  S.current.onboarding = showOnboarding;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const setMood = useCallback((m: MascotMood) => {
    S.current.mood = m;
    setMoodState(m);
  }, []);

  const show = useCallback((next: Say, { silent = false } = {}) => {
    setSay(next);
    setHidden(false);
    if (!silent) {
      setPop((n) => n + 1);
      mascot.current?.talk();
    }
  }, []);

  const speak = useCallback(
    (key: VoiceKey, options: { icon?: IconName; retry?: boolean; silent?: boolean } = {}) => {
      const text = voice.pick(key);
      if (ANNOUNCED.has(key)) announce(text);
      S.current.ideas = false;
      S.current.action = Boolean(options.retry);
      show(
        {
          kind: 'speech',
          text,
          ...(options.icon ? { icon: options.icon } : {}),
          ...(options.retry ? { retry: true } : {}),
        },
        { silent: options.silent ?? false },
      );
    },
    [announce, show, voice],
  );

  /** Qualquer toque: zera o relógio de parado e acorda o mascote com susto. */
  const touch = useCallback(() => {
    const s = S.current;
    s.last = performance.now();
    s.stage = 0;
    if (s.mood === 'sleep' && !s.busy) {
      setMood('surprise');
      speak('wake');
      clear();
      later(() => {
        if (!S.current.busy) setMood(isFocused(input.current) ? 'listen' : 'idle');
      }, 1300);
    }
  }, [clear, later, setMood, speak]);

  const goIdle = useCallback(() => {
    clear();
    setMood('idle');
    speak('idle');
    S.current.last = performance.now();
  }, [clear, setMood, speak]);

  // Primeira fala.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só ao montar.
  useEffect(() => {
    S.current.alive = true;
    if (!S.current.onboarding) speak('idle');
    return () => {
      S.current.alive = false;
      clear();
    };
  }, []);

  // Contador da estante: atualiza sempre que a home volta a ficar à vista, depois das escritas pendentes.
  useEffect(() => {
    if (covered) return;
    // A home ainda está inerte enquanto a página sai; a casca põe o foco quando puder.
    if (takeSearchFocus()) returnFocus(input.current);
    let live = true;
    writesSettled()
      .then(() => api.getShelf())
      .then((s) => live && setShelfCount(s.books.length))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [covered, returnFocus]);

  /* Entrada "Acender" (DESIGN.md §4): só na primeira abertura da sessão, depois que o navegador desenha
     um quadro (R6). fill: 'backwards' segura cada peça escondida só até o atraso dela. */
  const enter = useCallback(() => {
    if (document.hidden) return;
    requestAnimationFrame(() => {
      const run = (
        el: Element | null | undefined,
        keyframes: Keyframe[],
        options: KeyframeAnimationOptions,
      ) => el?.animate(keyframes, { fill: 'backwards', ...options });
      if (reducedMotion()) {
        run(homeRef.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
        return;
      }
      run(topRef.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease' });
      // À noite (abajur aceso), a lâmpada pisca e o feixe e a poeira acendem depois.
      if (getComputedStyle(document.documentElement).getPropertyValue('--lamp-on').trim() === '1') {
        const { bulb, cone, motes } = lamp.current?.parts() ?? {};
        run(
          bulb,
          [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0.25, offset: 0.5 }, { opacity: 1 }],
          {
            duration: 300,
            easing: 'linear',
          },
        );
        run(cone, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 250, easing: EASE.out });
        run(motes, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 400, easing: EASE.out });
      }
      run(
        mascotWrap.current,
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 520,
          delay: 300,
          easing: EASE.out,
        },
      );
      run(
        dockRef.current,
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 420,
          delay: 520,
          easing: EASE.out,
        },
      );
      run(
        sayRef.current,
        [
          { opacity: 0, transform: 'translateY(4px) scale(.96)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 220,
          delay: 760,
          easing: EASE.out,
        },
      );
      later(() => mascot.current?.talk(), 760);
    });
  }, [later]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só ao montar.
  useEffect(() => {
    if (!S.current.onboarding && firstOpenOfSession()) enter();
  }, []);

  // Parado: aos 10 s puxa conversa, aos 17 s avisa que vai dormir, aos 20 s dorme (DESIGN.md §7).
  useEffect(() => {
    const id = setInterval(() => {
      const s = S.current;
      if (
        s.busy ||
        s.ideas ||
        s.action ||
        s.mood !== 'idle' ||
        s.onboarding ||
        s.covered ||
        isFocused(input.current)
      )
        return;
      const t = performance.now() - s.last;
      if (t > IDLE_SLEEP) {
        clear();
        setMood('sleep');
        setHidden(true);
      } else if (t > IDLE_DROWSY && s.stage < 2) {
        s.stage = 2;
        speak('drowsy');
      } else if (t > IDLE_NUDGE && s.stage < 1) {
        s.stage = 1;
        speak('nudge');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [clear, setMood, speak]);

  /** "Vai para o livro": o texto sai do campo, faz um arco e entra no livro do mascote. */
  const fly = useCallback((text: string) => {
    const home = homeRef.current;
    const field = input.current;
    const target = mascotWrap.current;
    if (!home || !field || !target) return;
    const hr = home.getBoundingClientRect();
    const ir = field.getBoundingClientRect();
    const mr = target.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'fly';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = text.split('\n')[0] ?? text;
    home.appendChild(span);
    const x0 = ir.left - hr.left + 2;
    const y0 = ir.top - hr.top + 12;
    const x1 = mr.left - hr.left + mr.width * 0.5 - 12;
    const y1 = mr.top - hr.top + mr.height * 0.72;
    const a = span.animate(
      [
        { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 },
        { transform: `translate(${(x0 + x1) / 2}px,${y1 - 60}px) scale(.7)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${x1}px,${y1}px) scale(.3)`, opacity: 0 },
      ],
      { duration: DUR.fly, easing: EASE.inOut, fill: 'forwards' },
    );
    const remove = () => span.remove();
    a.finished.then(remove, remove);
    setTimeout(remove, DUR.fly + 200);
  }, []);

  const showIdeas = useCallback(
    (title: string, items: Idea[], more: boolean) => {
      S.current.ideas = true;
      S.current.action = false;
      announce(`${title} ${items.map((i) => i.query).join(', ')}`);
      show({ kind: 'ideas', text: title, items, more });
    },
    [announce, show],
  );

  const failed = useCallback(
    (retry: () => void) => {
      S.current.busy = false;
      S.current.retry = retry;
      setMood('surprise');
      speak('error', { icon: 'offline', retry: true });
      later(() => setMood('doubt'), 1200);
    },
    [later, setMood, speak],
  );

  const result = useCallback(
    (session: CreatedSession) => {
      S.current.busy = false;
      rememberDeck(session);
      // As cartas saem do livro que o mascote segura ("Do livro").
      const m = mascotWrap.current?.getBoundingClientRect();
      setDeckOrigin(m ? { x: m.left + m.width * 0.5, y: m.top + m.height * 0.72 } : null);
      announce(voice.pick('result'));
      // O balão some antes do baralho abrir, para não aparecer por baixo do fade ("Do livro").
      setHidden(true);
      navigate({ name: 'baralho', sessionId: session.session_id }, { transition: 'fade' });
      later(() => {
        setMood('idle');
        speak('idle', { silent: true });
      }, 700);
    },
    [announce, later, setMood, speak, voice],
  );

  const noResult = useCallback(
    (query: string, nearby: Idea[]) => {
      S.current.busy = false;
      setMood('doubt');
      showIdeas(noResultLine(query), nearby, false);
      later(() => {
        if (!S.current.busy) setMood('idle');
      }, 2400);
    },
    [later, setMood, showIdeas],
  );

  const search = useCallback(
    (text?: string) => {
      touch();
      const s = S.current;
      if (s.busy) return;
      clear();
      const query = (text ?? input.current?.value ?? '').trim();
      if (!query) {
        setMood('doubt');
        speak('empty');
        later(() => {
          if (S.current.busy) return;
          const f = isFocused(input.current);
          setMood(f ? 'listen' : 'idle');
          speak(f ? 'listen' : 'idle');
        }, 2800);
        return;
      }
      s.query = query;
      s.busy = true;
      s.ideas = false;
      s.action = false;
      input.current?.blur();
      if (!reducedMotion()) {
        fly(query);
        later(() => {
          if (!S.current.busy) return;
          setMood('read');
          speak('read');
        }, 300);
      } else {
        setMood('read');
        speak('read');
      }
      // A busca usa o texto guardado; "Tentar de novo" funciona com o campo vazio.
      setValue('');
      later(() => {
        if (S.current.busy) speak('readLong');
      }, SEARCH_SLOW);
      api
        .createSession(
          { query, seed_book_id: null, continues: null },
          { idempotencyKey: newIdempotencyKey() },
        )
        .then((session) => {
          if (!S.current.alive) return;
          clear();
          if (session.books.length) result(session);
          else noResult(query, session.nearby);
        })
        .catch((e: unknown) => {
          if (!S.current.alive) return;
          clear();
          if (!isApiError(e)) console.error(e);
          failed(() => search(S.current.query));
        });
    },
    [clear, failed, fly, later, noResult, result, setMood, speak, touch],
  );

  const askIdeas = useCallback(() => {
    touch();
    if (S.current.busy) return;
    clear();
    setMood('read');
    speak('think');
    const started = performance.now();
    api
      .getIdeas()
      .then((r) => {
        if (!S.current.alive || S.current.busy) return;
        // O mascote pensa pelo menos 0,9 s antes de mostrar (protótipo).
        later(
          () => {
            showIdeas(r.title, r.ideas, true);
            setMood('happy');
            later(() => {
              if (S.current.ideas && !S.current.busy) setMood('idle');
            }, 1500);
          },
          Math.max(0, 900 - (performance.now() - started)),
        );
      })
      .catch(() => {
        if (S.current.alive) failed(askIdeas);
      });
  }, [clear, failed, later, setMood, showIdeas, speak, touch]);

  const moreIdeas = useCallback(() => {
    touch();
    api
      .getIdeas()
      .then((r) => S.current.alive && showIdeas(r.title, r.ideas, true))
      .catch(() => S.current.alive && failed(askIdeas));
  }, [askIdeas, failed, showIdeas, touch]);

  const closeIdeas = useCallback(() => {
    touch();
    S.current.ideas = false;
    setMood('idle');
    speak('idle');
  }, [setMood, speak, touch]);

  const pickIdea = useCallback(
    (query: string) => {
      setValue(query);
      search(query);
    },
    [search],
  );

  /** O abajur: troca o tema, puxa a cordinha, pisca ao acender; o mascote se assusta e comenta. */
  const switchLamp = useCallback(() => {
    touch();
    if (S.current.busy) return;
    const wasDark = theme === 'dark';
    toggle();
    lamp.current?.tug();
    if (!wasDark && !reducedMotion()) lamp.current?.flicker();
    setMood('surprise');
    speak(wasDark ? 'day' : 'night');
    clear();
    later(() => {
      if (!S.current.busy) setMood('idle');
    }, 1400);
  }, [clear, later, setMood, speak, theme, toggle, touch]);

  // Campo que cresce até 4 linhas e depois rola.
  // biome-ignore lint/correctness/useExhaustiveDependencies: recalcula a cada mudança do texto.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = '46px';
    el.style.height = `${Math.max(46, el.scrollHeight)}px`;
  }, [value]);

  const finishOnboarding = (thenEnter: boolean) => {
    markOnboardingSeen();
    setShowOnboarding(false);
    S.current.onboarding = false;
    goIdle();
    if (thenEnter) enter();
  };

  const ready = value.trim().length > 0;
  const count = shelfCount > 99 ? '99+' : String(shelfCount);

  return (
    <div
      className="home"
      ref={homeRef}
      data-onb={showOnboarding}
      onPointerDown={touch}
      onPointerMove={() => {
        if (S.current.mood === 'sleep' && performance.now() - S.current.last > 1500) touch();
      }}
    >
      <header className="a-top" ref={topRef}>
        <h1 className="a-word t-brand">lombada</h1>
        <nav className="a-icons" aria-label="Atalhos">
          <button
            className="a-ib"
            type="button"
            aria-label={theme === 'dark' ? 'Apagar o abajur (modo dia)' : 'Acender o abajur (modo noite)'}
            onClick={switchLamp}
          >
            <Icon name="lamp" />
          </button>
          <button
            className="a-ib"
            type="button"
            aria-label={
              shelfCount ? `Estante, ${shelfCount} ${shelfCount === 1 ? 'livro' : 'livros'}` : 'Estante vazia'
            }
            onClick={() => navigate({ name: 'estante' })}
          >
            <Icon name="shelf" />
            {shelfCount > 0 && <span className="a-badge t-count">{count}</span>}
          </button>
          <button
            className="a-ib"
            type="button"
            aria-label="Perfil"
            onClick={() => navigate({ name: 'voce' })}
          >
            <Icon name="user" />
          </button>
        </nav>
      </header>

      <main className="a-scene" tabIndex={-1}>
        <div className="a-say" ref={sayRef}>
          {say.kind === 'ideas' ? (
            <Bubble
              popKey={pop}
              hidden={hidden}
              ideas={{
                items: say.items,
                onPick: pickIdea,
                onClose: closeIdeas,
                ...(say.more ? { onMore: moreIdeas } : {}),
              }}
            >
              {say.text}
            </Bubble>
          ) : (
            <Bubble
              popKey={pop}
              hidden={hidden || !say.text}
              {...(say.icon ? { icon: say.icon } : {})}
              {...(say.retry
                ? {
                    action: {
                      label: 'Tentar de novo',
                      icon: 'refresh' as const,
                      onClick: () => S.current.retry(),
                    },
                  }
                : {})}
            >
              {say.text}
            </Bubble>
          )}
        </div>
        <div className="a-stage">
          <Lamp ref={lamp} onPull={switchLamp} />
          <div ref={mascotWrap}>
            <Mascot ref={mascot} className="a-m" mood={mood} attn={input} />
          </div>
        </div>
      </main>

      <div className="a-dock" ref={dockRef}>
        <form
          className="a-form"
          data-ready={ready}
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <button className="a-ask" type="button" aria-label="Pedir uma ideia" onClick={askIdeas}>
            <Icon name="idea" />
          </button>
          <textarea
            ref={input}
            rows={1}
            value={value}
            autoComplete="off"
            placeholder="Conta seu humor, ou um livro"
            aria-label="Conta seu humor, ou um livro que amou"
            className="t-input"
            onChange={(e) => {
              touch();
              setValue(e.target.value);
              if (S.current.ideas || S.current.action) {
                S.current.ideas = false;
                S.current.action = false;
                setMood('listen');
                speak('listen');
              }
            }}
            onFocus={() => {
              touch();
              if (!S.current.busy && !S.current.ideas) {
                setMood('listen');
                speak('listen');
              }
            }}
            onBlur={(e) => {
              if (!S.current.busy && !e.target.value && !S.current.ideas && !S.current.action) {
                setMood('idle');
                speak('idle');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button className="a-send" type="submit" aria-label="Buscar">
            <Icon name="send" />
          </button>
        </form>
      </div>

      {showOnboarding && (
        <Onboarding onSkip={() => finishOnboarding(false)} onFinish={() => finishOnboarding(true)} />
      )}
    </div>
  );
}
