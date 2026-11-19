import type { CreatedSession, SessionId } from '../core/api/types';
import { createAppApi } from './api';

/** A Api do app inteiro (falsa até a fase B; ver api.ts). */
export const api = createAppApi();

/* O baralho recém-buscado passa da home para a página do baralho por aqui, sem pedir de novo:
   o "por que combina" de getSession não vem, e a busca acabou de chegar. */
const decks = new Map<SessionId, CreatedSession>();
export const rememberDeck = (s: CreatedSession) => decks.set(s.session_id, s);
export const recallDeck = (id: SessionId) => decks.get(id);

/** Chave para uma busca não ser criada duas vezes num reenvio. */
export function newIdempotencyKey(): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
