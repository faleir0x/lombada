import { type PointerEvent, type Ref, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MASCOTS, type MascotId } from '../../core/api/types';
import { chooseMascot, useMascotKind } from '../../platform/mascot';
import { useAnnounce } from '../../ui/a11y/Announcer';
import { Icon } from '../../ui/icons/Icon';
import { Lamp } from '../../ui/Lamp';
import { Mascot, type MascotMood } from '../../ui/mascot/Mascot';
import { EASE, reducedMotion } from '../../ui/motion';
import { PageTop } from '../../ui/PageTop';

/* Página Mascote ("Palco", DESIGN.md §6; troca em §4): um mascote por vez, debaixo do abajur da home, com a
   fala de apresentação. ‹ ›, deslizar ou ← → trocam o mostrado sem mudar o escolhido; "Usar o …" confirma e
   vale para o app inteiro. */

export const MASCOT_INFO: Record<MascotId, { name: string; feminine: boolean; line: string; hello: string }> =
  {
    coruja: {
      name: 'Coruja',
      feminine: true,
      line: 'Lê de madrugada e lembra de tudo.',
      hello: 'Fico acordada até você achar o livro.',
    },
    barba: {
      name: 'Bibliotecário',
      feminine: false,
      line: 'Já leu tudo. Julga por cima dos óculos.',
      hello: 'Já li a seção inteira. Pode perguntar.',
    },
    corvo: {
      name: 'Corvo',
      feminine: false,
      line: 'Debochado. Coleciona o que brilha.',
      hello: 'Gosto dos livros que acabam mal.',
    },
    fantasma: {
      name: 'Fantasma',
      feminine: false,
      line: 'O livro que não sai da cabeça.',
      hello: 'Sou o livro que você não esquece.',
    },
    traca: {
      name: 'Traça',
      feminine: true,
      line: 'Come livro, literalmente.',
      hello: 'Eu como livro. Só os ruins, prometo.',
    },
  };

const SWIPE = 40;

export function MascotPage({ onBack, ref }: { onBack: () => void; ref?: Ref<HTMLElement> }) {
  const announce = useAnnounce();
  const chosen = useMascotKind();
  const [index, setIndex] = useState(() => MASCOTS.indexOf(chosen));
  const [shown, setShown] = useState<MascotId>(chosen);
  const [mood, setMood] = useState<MascotMood>('idle');
  const fig = useRef<HTMLDivElement>(null);
  const target = useRef<MascotId>(chosen);
  const entering = useRef(false);
  const prev = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<'prev' | 'next' | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const section = useRef<HTMLElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    [],
  );

  const key = MASCOTS[index] ?? 'fantasma';
  const info = MASCOT_INFO[key];
  const inUse = key === chosen;

  /** Troca o mostrado: o atual encolhe para 60% e some em 140ms; o novo cresce de 70% em 280ms. */
  const swap = (to: MascotId) => {
    target.current = to;
    const el = fig.current;
    if (!el || reducedMotion()) {
      setShown(to);
      return;
    }
    for (const a of el.getAnimations()) a.cancel();
    const out = el.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(8%) scale(.6)', opacity: 0 },
      ],
      { duration: 140, easing: 'ease-in', fill: 'forwards' },
    );
    // Trocar de novo no meio corta a animação e segue para o último escolhido.
    out.onfinish = () => {
      entering.current = true;
      setShown(target.current);
    };
  };

  useLayoutEffect(() => {
    const el = fig.current;
    if (entering.current && el) {
      entering.current = false;
      for (const a of el.getAnimations()) a.cancel();
      el.animate(
        [
          { transform: 'translateY(10%) scale(.7)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 280, easing: EASE.out },
      );
    }
    const f = focusAfter.current;
    focusAfter.current = null;
    if (f === 'prev') prev.current?.focus({ preventScroll: true });
    else if (f === 'next') next.current?.focus({ preventScroll: true });
  });

  const go = (d: -1 | 1, fromButton = false) => {
    const j = Math.max(0, Math.min(MASCOTS.length - 1, index + d));
    if (j === index) return;
    setIndex(j);
    swap(MASCOTS[j] ?? 'fantasma');
    // R12: na ponta a seta desativa; o foco passa para a outra.
    if (fromButton && (j === 0 || j === MASCOTS.length - 1)) focusAfter.current = d > 0 ? 'prev' : 'next';
  };

  const use = () => {
    chooseMascot(key);
    setMood('happy');
    timers.current.push(setTimeout(() => setMood('idle'), 1400));
    announce(`${info.name} ${info.feminine ? 'escolhida' : 'escolhido'}.`);
    // O botão vira "Em uso" e desativa; o foco vai para uma seta.
    focusAfter.current = index < MASCOTS.length - 1 ? 'next' : 'prev';
  };

  // ← → trocam o mostrado (sem Alt, que fica para outras coisas).
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const keys = (e: KeyboardEvent) => {
      if (e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      goRef.current(e.key === 'ArrowLeft' ? -1 : 1);
    };
    el.addEventListener('keydown', keys);
    return () => el.removeEventListener('keydown', keys);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  return (
    <section
      className="a-page mp"
      ref={(el) => {
        section.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      tabIndex={-1}
      aria-labelledby="mascote-title"
    >
      <PageTop titleId="mascote-title" title="Mascote" onBack={onBack} />
      <div
        className="mp-stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <div className="mp-row">
          <button
            ref={prev}
            className="a-ib mp-nav"
            type="button"
            aria-label="Anterior"
            disabled={index === 0}
            onClick={() => go(-1, true)}
          >
            <Icon name="back" />
          </button>
          <div className="a-stage mp-fig">
            <Lamp />
            <div className="mp-bub" aria-hidden="true">
              {info.hello}
            </div>
            <div className="mp-m" ref={fig}>
              <Mascot kind={shown} mood={mood} className="mp-mm" />
            </div>
          </div>
          <button
            ref={next}
            className="a-ib mp-nav"
            type="button"
            aria-label="Próximo"
            disabled={index === MASCOTS.length - 1}
            onClick={() => go(1, true)}
          >
            <Icon name="next" />
          </button>
        </div>
        <p className="mp-nm" aria-live="polite">
          {info.name}
        </p>
        <p className="mp-cur">{inUse ? 'Em uso' : info.line}</p>
        <div className="mp-dots" aria-hidden="true">
          {MASCOTS.map((m, j) => (
            <i key={m} className={j === index ? 'on' : undefined} />
          ))}
        </div>
      </div>
      <div className="mp-foot">
        <button className="btn-primary" type="button" disabled={inUse} onClick={use}>
          {inUse ? 'Em uso' : `Usar ${info.feminine ? 'a' : 'o'} ${info.name}`}
        </button>
      </div>
    </section>
  );
}
