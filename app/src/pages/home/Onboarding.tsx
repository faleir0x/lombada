import { useEffect, useRef, useState } from 'react';
import { GeneratedCover } from '../../ui/Cover';
import { Icon } from '../../ui/icons/Icon';
import { Lamp } from '../../ui/Lamp';
import { Mascot, type MascotHandle, type MascotMood } from '../../ui/mascot/Mascot';
import { animate, DUR, EASE } from '../../ui/motion';

/* Onboarding (DESIGN.md §6): três telas na primeira visita, por cima da cena do abajur. "Pular" no topo;
   deslizar troca de tela; o leitor de tela ouve "Tela 1 de 3". */

type Prop = 'none' | 'pill' | 'cards';

const STEPS: { title: string; body: string; mood: MascotMood; prop: Prop }[] = [
  {
    title: 'Terminou um livro e nada mais te prende?',
    body: 'É ressaca literária. Me conta o que você quer sentir e eu acho o próximo.',
    mood: 'idle',
    prop: 'none',
  },
  {
    title: 'Me conta o que você quer sentir.',
    body: 'Ou o último livro que te pegou. Eu procuro o resto.',
    mood: 'listen',
    prop: 'pill',
  },
  {
    title: 'Direita pra guardar, esquerda pra passar.',
    body: 'Cada livro que você julga me deixa mais certeiro.',
    mood: 'happy',
    prop: 'cards',
  },
];

function StepProp({ prop }: { prop: Prop }) {
  if (prop === 'pill') {
    return (
      <div className="o-pill" aria-hidden="true">
        <Icon name="idea" />
        <span>algo curto e triste</span>
        <i>
          <Icon name="send" />
        </i>
      </div>
    );
  }
  if (prop === 'cards') {
    return (
      <div className="o-cards" aria-hidden="true">
        <div className="o-card l">
          <GeneratedCover title="A hora da estrela" author="Clarice Lispector" color="#7A2E3A" width={96} />
          <span className="o-tag">
            <Icon name="close" />
          </span>
        </div>
        <div className="o-card r">
          <GeneratedCover title="Torto Arado" author="Itamar Vieira Junior" color="#2F4A3F" width={96} />
          <span className="o-tag">
            <Icon name="heart" />
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function Onboarding({ onSkip, onFinish }: { onSkip(): void; onFinish(): void }) {
  const [step, setStep] = useState(0);
  const direction = useRef(0);
  const text = useRef<HTMLDivElement>(null);
  const prop = useRef<HTMLDivElement>(null);
  const mascot = useRef<MascotHandle>(null);
  const swipeStart = useRef<number | null>(null);
  const current = STEPS[step] ?? STEPS[0];
  const last = step === STEPS.length - 1;

  const go = (next: number, dir: number) => {
    if (next < 0 || next >= STEPS.length) return;
    direction.current = dir;
    setStep(next);
  };

  // Troca de tela: 24px + fade em 280ms (--dur-step); o mascote comenta.
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda a cada troca de tela.
  useEffect(() => {
    const dir = direction.current;
    if (dir) {
      for (const el of [text.current, prop.current]) {
        if (el) {
          animate(
            el,
            [
              { opacity: 0, transform: `translateX(${24 * dir}px)` },
              { opacity: 1, transform: 'none' },
            ],
            {
              duration: DUR.step,
              easing: EASE.out,
              fill: 'backwards',
            },
          );
        }
      }
    }
    mascot.current?.talk();
  }, [step]);

  if (!current) return null;
  return (
    <section
      className="a-onb"
      aria-label="Boas-vindas"
      onPointerDown={(e) => {
        swipeStart.current = e.clientX;
      }}
      onPointerUp={(e) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (start === null) return;
        const dx = e.clientX - start;
        if (Math.abs(dx) < 50) return;
        if (dx < 0) go(step + 1, 1);
        else go(step - 1, -1);
      }}
    >
      <div className="o-top">
        <span className="a-word t-brand">lombada</span>
        <button className="o-skip" type="button" onClick={onSkip}>
          Pular
        </button>
      </div>
      <div className="o-art" data-prop={current.prop}>
        <div className="a-stage">
          <Lamp />
          <Mascot ref={mascot} className="o-m" mood={current.mood} />
        </div>
        <div ref={prop}>
          <StepProp prop={current.prop} />
        </div>
      </div>
      <div className="o-text" ref={text} aria-live="polite">
        <span className="sr">
          Tela {step + 1} de {STEPS.length}.
        </span>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
      </div>
      <div className="o-foot">
        <div className="o-dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <i key={s.title} data-on={i === step} />
          ))}
        </div>
        <button className="o-next" type="button" onClick={() => (last ? onFinish() : go(step + 1, 1))}>
          {last ? 'Começar' : 'Continuar'}
          <Icon name="next" />
        </button>
      </div>
    </section>
  );
}
