/* Tipos do motor copiado de design-explorations/mascote.js (ver engine.js). */

import type { MascotId } from '../../core/api/types';

export type MascotKind = MascotId;
export type MascotMood = 'idle' | 'listen' | 'read' | 'happy' | 'roll' | 'doubt' | 'surprise' | 'sleep';

export class Mascot {
  constructor(host: HTMLElement, kind: MascotKind);
  readonly mood: MascotMood;
  /** Mascote desenhado agora. */
  readonly key: MascotKind;
  /** Campo que o olhar acompanha no humor "listen". */
  attn: HTMLInputElement | HTMLTextAreaElement | null | undefined;
  setMood(mood: MascotMood): void;
  setShape(kind: MascotKind): void;
  /** Mexe a boca por ~0,9 s. */
  talk(): void;
  destroy(): void;
}

export const ORDER: MascotKind[];
/** Humores com o nome em pt-BR, na ordem do DESIGN.md §4. */
export const ML: [MascotMood, string][];
