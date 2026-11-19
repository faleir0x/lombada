import { REACTIONS } from './icons/reactions';
import { animate, EASE, reducedMotion } from './motion';

/* "Mola + ícone" (DESIGN.md §4), para todo botão do app: aperta para 90% em 100ms, solta passando
   por 106% e 98% em 380ms, e o ícone faz o seu gesto no clique. Pelo teclado, o aperto é rápido (90ms).
   Botão desativado não anima. Um botão sai da regra com data-spring="off". */

const pressed = new WeakMap<HTMLButtonElement, Animation>();

function buttonOf(target: EventTarget | null): HTMLButtonElement | null {
  const b = target instanceof Element ? target.closest('button') : null;
  return b && !b.disabled && b.dataset.spring !== 'off' ? b : null;
}

function pressIn(b: HTMLButtonElement) {
  pressed.get(b)?.cancel();
  const a = animate(b, [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }], {
    duration: 100,
    easing: EASE.out,
    fill: 'forwards',
  });
  if (a) pressed.set(b, a);
}

function pressOut(b: HTMLButtonElement) {
  const a = pressed.get(b);
  if (!a) return;
  a.cancel();
  pressed.delete(b);
  animate(
    b,
    [
      { transform: 'scale(.9)' },
      { transform: 'scale(1.06)', offset: 0.45 },
      { transform: 'scale(.98)', offset: 0.75 },
      { transform: 'scale(1)' },
    ],
    { duration: 380, easing: 'linear' },
  );
}

function react(b: HTMLButtonElement) {
  const icon = b.querySelector<SVGElement>('.ico[data-ico]');
  const r = icon && REACTIONS[icon.dataset.ico as keyof typeof REACTIONS];
  if (!icon || !r) return;
  icon.style.transformOrigin = r.origin ?? '50% 50%';
  animate(icon, r.keyframes, { duration: r.duration, easing: r.easing ?? EASE.out });
}

export function installSpringButtons(root: Document = document): () => void {
  const down = (e: Event) => {
    const b = buttonOf(e.target);
    if (b) pressIn(b);
  };
  const up = (e: Event) => {
    const b = buttonOf(e.target);
    if (b) pressOut(b);
  };
  const click = (e: MouseEvent) => {
    const b = buttonOf(e.target);
    if (!b) return;
    // detail 0: clique pelo teclado (Enter ou espaço).
    if (e.detail === 0 && !reducedMotion()) {
      pressIn(b);
      setTimeout(() => pressOut(b), 90);
    }
    react(b);
  };
  root.addEventListener('pointerdown', down, true);
  root.addEventListener('pointerup', up, true);
  root.addEventListener('pointercancel', up, true);
  root.addEventListener('pointerleave', up, true);
  root.addEventListener('click', click, true);
  return () => {
    root.removeEventListener('pointerdown', down, true);
    root.removeEventListener('pointerup', up, true);
    root.removeEventListener('pointercancel', up, true);
    root.removeEventListener('pointerleave', up, true);
    root.removeEventListener('click', click, true);
  };
}
