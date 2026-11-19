import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Rating, ShelfBook } from '../../core/api/types';
import { layoutShelf, moveItem, placeLine, shelfLine, spineHeight, spineWidth } from '../../core/shelf';
import { createVoice } from '../../core/voice';
import { api } from '../../platform/appApi';
import { requestSearch, requestSearchFocus } from '../../platform/handoff';
import { enqueueWrite, writesSettled } from '../../platform/outbox';
import { goBack } from '../../platform/router';
import { useAnnounce } from '../../ui/a11y/Announcer';
import { Lamp } from '../../ui/Lamp';
import { Mascot, type MascotMood } from '../../ui/mascot/Mascot';
import { EASE, reducedMotion } from '../../ui/motion';
import { PageTop } from '../../ui/PageTop';
import { Sheet } from '../../ui/shell/Sheet';
import { useShell } from '../../ui/shell/Shell';
import { BookDetail } from './BookDetail';
import '../home/home.css';
import '../../ui/summary.css';
import './shelf.css';

/* A estante (DESIGN.md §6 "Estante", revisão D2, "Tirar da prateleira"; §4 "Um por um").
   Mudar a ordem tem três caminhos com o mesmo resultado (R11): segurar e arrastar, Alt + setas na lombada,
   e ‹ › no detalhe. A ordem vai para a API e sobrevive ao recarregar. */

const LIFT = 'translateY(-10px) rotate(-4deg) scale(1.06)';
const HOLD = 400;
const SCROLL_SLOP = 8;
const SPINE_TEXT = '#EDE6D3';

const voice = createVoice();

interface Drag {
  id: string;
  x: number;
  y: number;
  pointer: number;
  spine: HTMLElement;
  timer: ReturnType<typeof setTimeout>;
  ghost?: HTMLElement;
  ox: number;
  oy: number;
  last: number;
  startIndex: number;
}

export function ShelfPage({ titleId }: { titleId: string }) {
  const announce = useAnnounce();
  const { returnFocus } = useShell();
  const [books, setBooksState] = useState<ShelfBook[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [width, setWidth] = useState(354);
  const [line, setLine] = useState('');
  const [mood, setMood] = useState<MascotMood>('idle');
  const [holeId, setHoleId] = useState<string | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const shelves = useRef<HTMLDivElement>(null);
  const booksRef = useRef<ShelfBook[]>([]);
  const flipFrom = useRef<Map<string, DOMRect> | null>(null);
  const focusSpine = useRef<string | null>(null);
  const focusMove = useRef<-1 | 1 | null>(null);
  const focusAfterRemove = useRef<string | 'empty' | null>(null);
  const entered = useRef(false);
  const drag = useRef<Drag | null>(null);
  const dragEnd = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    [],
  );

  const setBooks = useCallback((next: ShelfBook[]) => {
    booksRef.current = next;
    setBooksState(next);
  }, []);

  // Carrega depois das escritas pendentes (um ♥ recém-dado já aparece).
  useEffect(() => {
    let live = true;
    writesSettled()
      .then(() => api.getShelf())
      .then((s) => {
        if (!live) return;
        setBooks(s.books);
        setLine(shelfLine(s.books.length));
        setMood(s.books.length ? 'idle' : 'doubt');
        announce(s.books.length ? shelfLine(s.books.length) : 'Estante vazia.');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [announce, setBooks]);

  // As prateleiras quebram pela largura disponível.
  useLayoutEffect(() => {
    const el = shelves.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth - 36);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () =>
      layoutShelf(
        (books ?? []).map((b) => spineWidth(b.title)),
        width,
      ),
    [books, width],
  );

  /** Reordena com FLIP: os vizinhos abrem espaço em 300ms (--ease-out). */
  const reorder = useCallback(
    (next: ShelfBook[]) => {
      if (!reducedMotion() && shelves.current) {
        const before = new Map<string, DOMRect>();
        for (const el of shelves.current.querySelectorAll<HTMLElement>('.spine[data-id]')) {
          before.set(el.dataset.id ?? '', el.getBoundingClientRect());
        }
        flipFrom.current = before;
      }
      setBooks(next);
    },
    [setBooks],
  );

  useLayoutEffect(() => {
    const before = flipFrom.current;
    flipFrom.current = null;
    if (before && shelves.current) {
      for (const el of shelves.current.querySelectorAll<HTMLElement>('.spine[data-id]')) {
        const b = before.get(el.dataset.id ?? '');
        if (!b) continue;
        const a = el.getBoundingClientRect();
        const dx = b.left - a.left;
        const dy = b.top - a.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], {
          duration: 300,
          easing: EASE.out,
        });
      }
    }
    const id = focusSpine.current;
    focusSpine.current = null;
    if (id)
      shelves.current
        ?.querySelector<HTMLElement>(`.spine[data-id="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
    const dir = focusMove.current;
    focusMove.current = null;
    if (dir) {
      const sheet = document.querySelector<HTMLElement>('.a-sheet[data-open="true"]');
      const same = sheet?.querySelector<HTMLButtonElement>(`.d-mv[data-move="${dir}"]`);
      const other = sheet?.querySelector<HTMLButtonElement>(`.d-mv[data-move="${-dir}"]`);
      // R12: na ponta o botão desativa; o foco passa para o outro.
      (same && !same.disabled ? same : other)?.focus({ preventScroll: true });
    }
    const after = focusAfterRemove.current;
    focusAfterRemove.current = null;
    if (after) {
      const target =
        after === 'empty'
          ? root.current?.querySelector<HTMLElement>('.p-empty .btn-primary')
          : shelves.current?.querySelector<HTMLElement>(`.spine[data-id="${CSS.escape(after)}"]`);
      returnFocus(target ?? root.current?.closest<HTMLElement>('.a-page') ?? null);
    }
  });

  /* "Um por um" (DESIGN.md §4): ao abrir, os livros das três primeiras prateleiras deslizam da borda
     direita, um atrás do outro, e se amassam um pouco ao encostar. Só ao abrir; depois de um quadro (R6). */
  useLayoutEffect(() => {
    if (!books || entered.current) return;
    entered.current = true;
    if (reducedMotion() || !books.length) return;
    requestAnimationFrame(() => {
      const rows = [...(shelves.current?.querySelectorAll<HTMLElement>('.p-row') ?? [])].slice(0, 3);
      rows.forEach((row, ri) => {
        const rw = row.clientWidth;
        [...row.querySelectorAll<HTMLElement>('.spine')].forEach((sp, i) => {
          const dist = rw - sp.offsetLeft + 20;
          sp.style.transformOrigin = '0% 100%';
          const a = sp.animate(
            [
              { transform: `translateX(${dist}px)` },
              { transform: 'translateX(0) scaleX(1)', offset: 0.78 },
              { transform: 'translateX(0) scaleX(.86) scaleY(1.04)', offset: 0.88 },
              { transform: 'translateX(0) scaleX(1)' },
            ],
            {
              duration: 520,
              delay: 300 + ri * 60 + Math.min(i, 10) * 45,
              easing: 'cubic-bezier(.3,.7,.4,1)',
              fill: 'backwards',
            },
          );
          const reset = () => {
            sp.style.transformOrigin = '';
          };
          a.finished.then(reset, reset);
        });
      });
    });
  }, [books]);

  /** Muda um livro de lugar e grava a posição nova. */
  const move = useCallback(
    (id: string, to: number, persist = true) => {
      const list = booksRef.current;
      const from = list.findIndex((b) => b.id === id);
      if (from < 0) return null;
      const target = Math.max(0, Math.min(list.length - 1, to));
      if (from === target) return null;
      reorder(moveItem(list, from, target));
      if (persist) enqueueWrite({ kind: 'updateShelfBook', bookId: id, patch: { position: target + 1 } });
      return target;
    },
    [reorder],
  );

  const sayFor = useCallback(
    (text: string, m: MascotMood, ms: number) => {
      setLine(text);
      setMood(m);
      announce(text);
      later(() => {
        setMood(booksRef.current.length ? 'idle' : 'doubt');
        setLine(shelfLine(booksRef.current.length));
      }, ms);
    },
    [announce, later],
  );

  // Teclado: foco na lombada e Alt com as setas move uma posição (R11).
  const onSpineKey = (e: KeyboardEvent<HTMLButtonElement>, book: ShelfBook) => {
    if (!e.altKey || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
    e.preventDefault();
    const from = booksRef.current.findIndex((b) => b.id === book.id);
    const to = move(book.id, from + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1));
    if (to === null) return;
    focusSpine.current = book.id;
    announce(placeLine(book.title, to + 1));
  };

  /* Segurar 0,4s tira o livro da prateleira; mexer mais de 8px antes disso é rolagem, não arrasto. */
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const spine = (e.target as HTMLElement).closest<HTMLElement>('.spine[data-id]');
    if (!spine || e.button > 0 || drag.current) return;
    spine.classList.add('press');
    const d: Drag = {
      id: spine.dataset.id ?? '',
      x: e.clientX,
      y: e.clientY,
      pointer: e.pointerId,
      spine,
      timer: setTimeout(() => lift(), HOLD),
      ox: 0,
      oy: 0,
      last: 0,
      startIndex: booksRef.current.findIndex((b) => b.id === spine.dataset.id),
    };
    drag.current = d;
  };

  const lift = () => {
    const d = drag.current;
    const page = root.current;
    if (!d || !page) return;
    d.spine.classList.remove('press');
    try {
      shelves.current?.setPointerCapture(d.pointer);
    } catch {
      // O ponteiro já soltou.
    }
    const pr = page.getBoundingClientRect();
    const r = d.spine.getBoundingClientRect();
    const ghost = d.spine.cloneNode(true) as HTMLElement;
    ghost.className = 'spine ghost';
    for (const a of ['data-id', 'data-index', 'aria-label', 'aria-describedby']) ghost.removeAttribute(a);
    ghost.setAttribute('aria-hidden', 'true');
    ghost.tabIndex = -1;
    ghost.style.left = `${r.left - pr.left}px`;
    ghost.style.top = `${r.top - pr.top}px`;
    page.appendChild(ghost);
    d.ghost = ghost;
    d.ox = d.x - r.left;
    d.oy = d.y - r.top;
    if (reducedMotion()) ghost.style.transform = LIFT;
    else
      ghost.animate([{ transform: 'none' }, { transform: LIFT }], {
        duration: 180,
        easing: EASE.out,
        fill: 'forwards',
      });
    setHoleId(d.id);
    setMood('listen');
    try {
      navigator.vibrate?.(8);
    } catch {
      // Sem vibração: tudo bem.
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.ghost) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > SCROLL_SLOP) {
        clearTimeout(d.timer);
        d.spine.classList.remove('press');
        drag.current = null;
      }
      return;
    }
    const page = root.current;
    if (!page) return;
    const pr = page.getBoundingClientRect();
    d.ghost.style.left = `${e.clientX - pr.left - d.ox}px`;
    d.ghost.style.top = `${e.clientY - pr.top - d.oy}px`;
    // Perto da borda da página, ela rola.
    const br = body.current?.getBoundingClientRect();
    if (body.current && br) {
      if (e.clientY > br.bottom - 60) body.current.scrollTop += 10;
      else if (e.clientY < br.top + 60) body.current.scrollTop -= 10;
    }
    const now = performance.now();
    if (now - d.last < 90) return;
    const list = booksRef.current;
    const di = list.findIndex((b) => b.id === d.id);
    const rows = [...(shelves.current?.querySelectorAll<HTMLElement>('.p-row') ?? [])];
    if (!rows.length || di < 0) return;
    const row = rows.find((r) => e.clientY < r.getBoundingClientRect().bottom + 22) ?? rows[rows.length - 1];
    if (!row) return;
    const spines = [...row.querySelectorAll<HTMLElement>('.spine[data-id]')].filter(
      (s) => s.dataset.id !== d.id,
    );
    const pos = (s: HTMLElement) => {
      const j = Number(s.dataset.index);
      return j > di ? j - 1 : j;
    };
    const before = spines.find((s) => {
      const rr = s.getBoundingClientRect();
      return e.clientX < rr.left + rr.width / 2;
    });
    const last = spines.at(-1);
    const to = before ? pos(before) : last ? pos(last) + 1 : di;
    if (to !== di) {
      d.last = now;
      move(d.id, to, false);
    }
  };

  const drop = (d: Drag) => {
    const list = booksRef.current;
    const index = list.findIndex((b) => b.id === d.id);
    const book = list[index];
    dragEnd.current = performance.now();
    if (book) {
      announce(placeLine(book.title, index + 1));
      if (index !== d.startIndex)
        enqueueWrite({ kind: 'updateShelfBook', bookId: d.id, patch: { position: index + 1 } });
    }
    setMood('happy');
    later(() => setMood('idle'), 1200);
    const ghost = d.ghost;
    const finish = () => {
      ghost?.remove();
      setHoleId(null);
      drag.current = null;
    };
    const hole = shelves.current?.querySelector<HTMLElement>(`.spine[data-id="${CSS.escape(d.id)}"]`);
    const page = root.current;
    if (!ghost || !hole || !page || reducedMotion()) {
      finish();
      return;
    }
    const pr = page.getBoundingClientRect();
    const r = hole.getBoundingClientRect();
    const dx = r.left - pr.left - Number.parseFloat(ghost.style.left);
    const dy = r.top - pr.top - Number.parseFloat(ghost.style.top);
    for (const a of ghost.getAnimations()) a.cancel();
    const a = ghost.animate([{ transform: LIFT }, { transform: `translate(${dx}px,${dy}px)` }], {
      duration: 240,
      easing: EASE.out,
      fill: 'forwards',
    });
    a.finished.then(finish, finish);
    setTimeout(finish, 400);
  };

  const onPointerEnd = () => {
    const d = drag.current;
    if (!d) return;
    clearTimeout(d.timer);
    d.spine.classList.remove('press');
    if (d.ghost) drop(d);
    else drag.current = null;
  };

  // Enquanto arrasta, o toque não rola a página; segurar não abre o menu do sistema.
  useEffect(() => {
    const el = shelves.current;
    if (!el) return;
    const touch = (e: TouchEvent) => {
      if (drag.current?.ghost) e.preventDefault();
    };
    const menu = (e: Event) => {
      if ((e.target as HTMLElement).closest('.spine')) e.preventDefault();
    };
    el.addEventListener('touchmove', touch, { passive: false });
    el.addEventListener('contextmenu', menu);
    return () => {
      el.removeEventListener('touchmove', touch);
      el.removeEventListener('contextmenu', menu);
    };
  }, []);

  const openBook = (id: string) => {
    if (performance.now() - dragEnd.current < 400) return;
    setOpenId(id);
    setMood('happy');
    later(() => setMood('idle'), 1400);
  };

  const current = books?.find((b) => b.id === openId) ?? null;
  const position = current && books ? books.indexOf(current) + 1 : 0;
  // A folha desce com o conteúdo de antes, em vez de esvaziar na hora.
  const lastShown = useRef<{ book: ShelfBook; position: number; total: number } | null>(null);
  if (current) lastShown.current = { book: current, position, total: books?.length ?? 0 };

  const moveInDetail = (dir: -1 | 1) => {
    if (!current) return;
    const to = move(current.id, position - 1 + dir);
    if (to === null) return;
    focusMove.current = dir;
    announce(placeLine(current.title, to + 1));
  };

  const rate = (value: Exclude<Rating, null>) => {
    if (!current) return;
    const rating: Rating = current.rating === value ? null : value;
    setBooks(booksRef.current.map((b) => (b.id === current.id ? { ...b, rating } : b)));
    enqueueWrite({ kind: 'updateShelfBook', bookId: current.id, patch: { rating } });
    if (rating)
      sayFor(voice.pick(rating === 'up' ? 'rateUp' : 'rateDown'), rating === 'up' ? 'happy' : 'doubt', 3000);
  };

  const remove = () => {
    if (!current || !books) return;
    const i = books.indexOf(current);
    const next = books.filter((b) => b.id !== current.id);
    focusAfterRemove.current = next[i]?.id ?? next[i - 1]?.id ?? 'empty';
    enqueueWrite({ kind: 'removeFromShelf', bookId: current.id });
    setOpenId(null);
    setBooks(next);
    setLine(shelfLine(next.length));
    setMood('roll');
    later(() => setMood(booksRef.current.length ? 'idle' : 'doubt'), 1600);
  };

  const similar = () => {
    if (!current) return;
    requestSearch({ query: `Igual ${current.title}`, seedBookId: current.id });
    setOpenId(null);
    goBack();
  };

  const findBook = () => {
    requestSearchFocus();
    goBack();
  };

  const n = books?.length ?? 0;
  const lastRow = layout.rows.length - 1;

  return (
    <div className="shelf" ref={root}>
      <PageTop
        titleId={titleId}
        title="Sua estante"
        aside={n ? `${n} ${n === 1 ? 'livro' : 'livros'}` : ''}
        onBack={goBack}
      />
      <div className="p-body" ref={body}>
        <div className="p-head">
          {line && <div className="p-bub">{line}</div>}
          <div className="a-stage p-stage">
            <Lamp />
            <Mascot className="p-m" mood={mood} />
          </div>
        </div>
        <div
          className="p-shelves"
          ref={shelves}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {books &&
            layout.rows.map((row, ri) => (
              <div key={row[0] ?? `vazia-${ri}`}>
                <div className="p-row">
                  {row.map((i) => {
                    const b = books[i];
                    if (!b) return null;
                    const style = {
                      '--c': b.cover.color,
                      '--t': SPINE_TEXT,
                      '--sw': `${spineWidth(b.title)}px`,
                      '--sh': `${spineHeight(b.id, b.title)}px`,
                    } as CSSProperties;
                    return (
                      <button
                        key={b.id}
                        className={b.id === holeId ? 'spine hole' : 'spine'}
                        type="button"
                        data-id={b.id}
                        data-index={i}
                        data-spring="off"
                        aria-label={`${b.title}, ${b.authors.join(', ')}`}
                        aria-describedby="estante-dica"
                        style={style}
                        onClick={() => openBook(b.id)}
                        onKeyDown={(e) => onSpineKey(e, b)}
                      >
                        <span>{b.title}</span>
                      </button>
                    );
                  })}
                  {ri === lastRow &&
                    Array.from({ length: layout.slots }, (_, j) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: os espaços tracejados não têm identidade.
                        key={j}
                        className="slot"
                        style={{ '--sh': `${126 + j * 8}px` } as CSSProperties}
                        aria-hidden="true"
                      />
                    ))}
                </div>
                <div className="p-plank" aria-hidden="true" />
              </div>
            ))}
        </div>
        {books && n === 0 && (
          <div className="p-empty">
            <h3>Estante vazia, por enquanto.</h3>
            <p>Livro que você arrastar pra direita vem morar aqui.</p>
            <button className="btn-primary" type="button" onClick={findBook}>
              Buscar um livro
            </button>
          </div>
        )}
      </div>
      <p className="sr" id="estante-dica">
        Alt e as setas mudam o livro de lugar.
      </p>
      <Sheet open={current !== null} onClose={() => setOpenId(null)} label="Livro">
        {lastShown.current && (
          <BookDetail
            book={lastShown.current.book}
            position={lastShown.current.position}
            total={lastShown.current.total}
            onMove={moveInDetail}
            onRate={rate}
            onRemove={remove}
            onSimilar={similar}
          />
        )}
      </Sheet>
    </div>
  );
}
