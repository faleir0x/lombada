import { EASE } from '../motion';
import type { IconName } from './hugeicons';

/* O gesto que cada ícone faz no clique ("Mola + ícone", DESIGN.md §4). Copiado do REACT do protótipo. */
export interface Reaction {
  keyframes: Keyframe[];
  duration: number;
  easing?: string;
  origin?: string;
}

const turn = (deg: number) => [{ transform: 'rotate(0)' }, { transform: `rotate(${deg}deg)` }];
const nudge = (px: number) => [
  { transform: 'translateX(0)' },
  { transform: `translateX(${px}px)`, offset: 0.4 },
  { transform: 'translateX(0)' },
];
const shake = (a: number, b: number, c: number) => [
  { transform: 'rotate(0)' },
  { transform: `rotate(${a}deg)`, offset: 0.25 },
  { transform: `rotate(${b}deg)`, offset: 0.55 },
  { transform: `rotate(${c}deg)`, offset: 0.8 },
  { transform: 'rotate(0)' },
];

export const REACTIONS: Partial<Record<IconName, Reaction>> = {
  heart: {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.35)', offset: 0.3 },
      { transform: 'scale(.9)', offset: 0.55 },
      { transform: 'scale(1.1)', offset: 0.75 },
      { transform: 'scale(1)' },
    ],
    duration: 480,
  },
  close: { keyframes: turn(90), duration: 260, easing: EASE.out },
  refresh: { keyframes: turn(-360), duration: 420, easing: EASE.inOut },
  back: { keyframes: nudge(-5), duration: 300 },
  next: { keyframes: nudge(5), duration: 300 },
  book: {
    keyframes: [
      { transform: 'scaleX(1)' },
      { transform: 'scaleX(.15)', offset: 0.45 },
      { transform: 'scaleX(1)' },
    ],
    duration: 340,
    easing: EASE.inOut,
  },
  lamp: {
    keyframes: [
      { transform: 'rotate(0)' },
      { transform: 'rotate(12deg)', offset: 0.2 },
      { transform: 'rotate(-8deg)', offset: 0.45 },
      { transform: 'rotate(4deg)', offset: 0.7 },
      { transform: 'rotate(0)' },
    ],
    duration: 650,
    origin: '50% 0',
  },
  shelf: { keyframes: shake(-10, 7, -3), duration: 450, origin: '50% 100%' },
  user: {
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-3px)', offset: 0.3 },
      { transform: 'translateY(0)', offset: 0.6 },
      { transform: 'translateY(-1px)', offset: 0.8 },
      { transform: 'translateY(0)' },
    ],
    duration: 360,
  },
  idea: {
    keyframes: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.35, transform: 'scale(1)', offset: 0.2 },
      { opacity: 1, transform: 'scale(1.18)', offset: 0.5 },
      { opacity: 1, transform: 'scale(1)' },
    ],
    duration: 420,
  },
  send: {
    keyframes: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-10px)', opacity: 0, offset: 0.45 },
      { transform: 'translateY(10px)', opacity: 0, offset: 0.46 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    duration: 420,
  },
  search: {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.2) rotate(-12deg)', offset: 0.4 },
      { transform: 'scale(1)' },
    ],
    duration: 360,
  },
  up: {
    keyframes: [
      { transform: 'rotate(0) translateY(0)' },
      { transform: 'rotate(-14deg) translateY(-2px)', offset: 0.4 },
      { transform: 'rotate(0) translateY(0)' },
    ],
    duration: 380,
    origin: '30% 80%',
  },
  down2: {
    keyframes: [
      { transform: 'rotate(0) translateY(0)' },
      { transform: 'rotate(14deg) translateY(2px)', offset: 0.4 },
      { transform: 'rotate(0) translateY(0)' },
    ],
    duration: 380,
    origin: '30% 20%',
  },
  trash: { keyframes: shake(-10, 8, -4), duration: 420, origin: '50% 100%' },
};
