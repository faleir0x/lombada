import type { Result } from './api/types';
import type { VoiceKey } from './voice';

/* Regras do baralho (DESIGN.md §6, "Baralho" e "Já li no baralho"), sem tela: qual card está no topo,
   o que cada gesto significa, o desfazer, o modo "já li" e a fala do mascote depois de cada julgamento.
   Puro, para a página do baralho e os testes. */

/** Os dois botões grandes: ♥ (direita) e ✕ (esquerda). No modo "já li", viram "já li e amei" e "não curti". */
export type Gesture = 'love' | 'pass';

export interface Judged {
  index: number;
  result: Result;
}

export interface DeckState {
  size: number;
  /** Card no topo; igual a size quando o lote acabou. */
  index: number;
  /** Modo "já li": o ♥ e o ✕ ganham o selo de livro. */
  asking: boolean;
  history: Judged[];
  /** ✕ seguidos; no terceiro, o mascote pede outra busca. */
  passStreak: number;
}

export type MascotMoodHint = 'happy' | 'roll' | 'doubt' | 'idle';

export interface Reaction {
  line: VoiceKey;
  mood: MascotMoodHint;
}

/** Começa um lote; se veio de uma busca já começada, segue do primeiro card sem julgamento. */
export function startDeck(results: readonly (Result | null)[]): DeckState {
  const history: Judged[] = [];
  results.forEach((result, index) => {
    if (result) history.push({ index, result });
  });
  const first = results.indexOf(null);
  return {
    size: results.length,
    index: first < 0 ? results.length : first,
    asking: false,
    history,
    passStreak: 0,
  };
}

export const isFinished = (s: DeckState) => s.index >= s.size;

export function resultFor(gesture: Gesture, asking: boolean): Result {
  if (asking) return gesture === 'love' ? 'read_loved' : 'read_disliked';
  return gesture;
}

/** ♥ (e "já li e amei") põe na estante; ✕ e "já li e não curti" não. */
export const goesToShelf = (r: Result) => r === 'love' || r === 'read_loved';

export function judge(
  s: DeckState,
  gesture: Gesture,
): { state: DeckState; judged: Judged; reaction: Reaction } | null {
  if (isFinished(s)) return null;
  const result = resultFor(gesture, s.asking);
  const judged = { index: s.index, result };
  let passStreak = result === 'pass' ? s.passStreak + 1 : 0;
  let reaction: Reaction;
  if (result === 'read_loved') reaction = { line: 'loved', mood: 'happy' };
  else if (result === 'read_disliked') reaction = { line: 'readNo', mood: 'doubt' };
  else if (result === 'love') reaction = { line: 'like', mood: 'happy' };
  else if (passStreak >= 3) {
    passStreak = 0;
    reaction = { line: 'dislike3', mood: 'doubt' };
  } else reaction = { line: 'dislike', mood: 'roll' };
  return {
    state: { ...s, index: s.index + 1, asking: false, history: [...s.history, judged], passStreak },
    judged,
    reaction,
  };
}

/** Desfazer traz de volta o último card julgado, pelo mesmo caminho. */
export function undo(s: DeckState): { state: DeckState; undone: Judged } | null {
  const undone = s.history.at(-1);
  if (!undone) return null;
  return {
    state: { ...s, index: undone.index, asking: false, history: s.history.slice(0, -1) },
    undone,
  };
}

/** Entrar no modo "já li" (↑, botão de livro ou arrastar para cima). */
export const ask = (s: DeckState): DeckState => (isFinished(s) || s.asking ? s : { ...s, asking: true });

/** Sair do modo "já li" não desfaz o último gesto. */
export const cancelAsk = (s: DeckState): DeckState => (s.asking ? { ...s, asking: false } : s);
