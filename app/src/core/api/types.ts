/* Tipos do contrato da API, versão 0. Fonte da verdade: ROADMAP.md, seção "Contrato da API".
   Os nomes seguem o JSON do contrato (snake_case) para não precisar de tradução entre as camadas. */

export type BookId = string;
export type SessionId = string;
/** Data e hora em ISO 8601, sempre em UTC. */
export type Iso = string;

export interface Cover {
  /** Foto da capa. Pode vir null e aparecer numa leitura seguinte. */
  url: string | null;
  source: 'openlibrary' | 'google' | null;
  /** Sempre vem: cor da capa gerada e da lombada na estante. */
  color: string;
}

export interface Attribution {
  label: string;
  url: string;
}

export interface Book {
  id: BookId;
  title: string;
  authors: string[];
  year: number | null;
  pages: number | null;
  synopsis: string;
  cover: Cover;
  attribution: Attribution;
}

/** Ideia do balão "Pedir ideia" e busca vizinha quando não há resultado. */
export interface Idea {
  query: string;
  reason: string;
}

/** O que a pessoa fez com o card: ♥, ✕, "já li e amei", "já li e não curti". */
export type Result = 'love' | 'pass' | 'read_loved' | 'read_disliked';

/** Nota de "Depois de ler". */
export type Rating = 'up' | 'down' | null;

export interface User {
  user_id: string;
  token: string;
}

export interface IdeasResponse {
  title: string;
  ideas: Idea[];
}

export interface CreateSessionInput {
  query: string;
  /** Livro de "Buscar parecidos". */
  seed_book_id: BookId | null;
  /** Busca anterior, quando é "Mais dez". */
  continues: SessionId | null;
}

export interface DeckBook extends Book {
  /** "Por que combina". Pode vir null e chegar depois por getWhy. */
  why: string | null;
}

export interface CreatedSession {
  session_id: SessionId;
  query: string;
  created_at: Iso;
  /** Dez livros, ou nenhum quando a busca não acha nada. */
  books: DeckBook[];
  /** Até três buscas vizinhas, só quando books está vazio. */
  nearby: Idea[];
}

export interface SessionSummary {
  session_id: SessionId;
  query: string;
  created_at: Iso;
  /** Julgados que estão na estante agora. */
  loved: number;
  /** Julgados que não estão na estante. */
  passed: number;
  loved_preview: Book[];
}

export interface SessionPage {
  sessions: SessionSummary[];
  next_cursor: string | null;
}

export interface SessionBook extends Book {
  result: Result | null;
  /** ♥ cheio: o estado atual da estante, não o julgamento. */
  on_shelf: boolean;
}

export interface SessionDetail {
  session_id: SessionId;
  query: string;
  created_at: Iso;
  continues: SessionId | null;
  /** Na ordem do baralho. */
  books: SessionBook[];
}

export interface ShelfOrigin {
  session_id: SessionId;
  query: string;
}

export interface ShelfBook extends Book {
  /** 1 é a primeira. */
  position: number;
  rating: Rating;
  added_at: Iso;
  from: ShelfOrigin | null;
}

export interface Shelf {
  books: ShelfBook[];
}

export interface ShelfPatch {
  position?: number;
  rating?: Rating;
}
