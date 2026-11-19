/* Movimento da lombada (DESIGN.md §4). Os mesmos valores de tokens.css, para uso no WAAPI;
   motion.test.ts confere que os dois não se separam. Toda animação passa por animate(), que
   respeita prefers-reduced-motion num lugar só (R4). */

export const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const;

export const DUR = {
  speech: 200,
  theme: 600,
  lamp: 700,
  flicker: 220,
  fly: 480,
  sheetOpen: 420,
  sheetClose: 280,
  step: 280,
  press: 200,
  tap: 120,
  hover: 150,
  flip: 420,
  card: 280,
} as const;

const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

/** Lido na hora, para seguir a mudança da preferência sem recarregar. */
export const reducedMotion = (): boolean => query?.matches ?? false;

export interface MotionOptions extends KeyframeAnimationOptions {
  /** Roda mesmo com movimento reduzido (só para fades curtos que substituem o movimento). */
  evenWhenReduced?: boolean;
}

/** Element.animate com a regra de movimento reduzido. Devolve null quando não anima. */
export function animate(el: Element, keyframes: Keyframe[], options: MotionOptions): Animation | null {
  const { evenWhenReduced, ...timing } = options;
  if (reducedMotion() && !evenWhenReduced) return null;
  if (typeof el.animate !== 'function') return null;
  return el.animate(keyframes, timing);
}
