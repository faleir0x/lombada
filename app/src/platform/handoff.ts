/* Recados entre telas que não cabem na URL. Cada um é lido uma vez. */

export interface Point {
  x: number;
  y: number;
}

let deckOrigin: Point | null = null;

/** De onde as cartas saem no "Do livro": o livro que o mascote da home segura (coordenadas da janela). */
export function setDeckOrigin(p: Point | null) {
  deckOrigin = p;
}
export function takeDeckOrigin(): Point | null {
  const p = deckOrigin;
  deckOrigin = null;
  return p;
}

let focusSearch = false;

/** Ao voltar para a home, o foco vai para o campo de busca ("Nova busca", voltar do baralho). */
export function requestSearchFocus() {
  focusSearch = true;
}
export function takeSearchFocus(): boolean {
  const v = focusSearch;
  focusSearch = false;
  return v;
}

export interface PendingSearch {
  query: string;
  seedBookId: string | null;
}

let pendingSearch: PendingSearch | null = null;

/** "Buscar parecidos" (detalhe do livro): volta para a home e busca "Igual …" com o livro-semente. */
export function requestSearch(search: PendingSearch) {
  pendingSearch = search;
}
export function takePendingSearch(): PendingSearch | null {
  const s = pendingSearch;
  pendingSearch = null;
  return s;
}
