import { useSyncExternalStore } from 'react';
import { MASCOTS, type MascotId } from '../core/api/types';
import { api } from './appApi';
import { enqueueWrite, writesSettled } from './outbox';

/* Mascote escolhido (página Mascote, DESIGN.md §6): vale para o app inteiro. Fica numa cópia no aparelho,
   para o primeiro quadro já sair com o mascote certo, e na API (GET/PATCH /me), que vence ao abrir. */

const KEY = 'lombada-mascote';
const listeners = new Set<() => void>();

function readLocal(): MascotId {
  try {
    const v = localStorage.getItem(KEY);
    return MASCOTS.includes(v as MascotId) ? (v as MascotId) : 'fantasma';
  } catch {
    return 'fantasma';
  }
}

let current: MascotId = readLocal();

function set(kind: MascotId) {
  if (kind === current) return;
  current = kind;
  try {
    localStorage.setItem(KEY, kind);
  } catch {
    // Sem armazenamento: vale nesta sessão e vem da API na próxima.
  }
  for (const l of listeners) l();
}

/** Escolhe o mascote e grava na API pela fila. */
export function chooseMascot(kind: MascotId) {
  set(kind);
  enqueueWrite({ kind: 'updateMe', patch: { mascot: kind } });
}

/** Ao abrir o app: a escolha salva na API vence a cópia do aparelho (depois das escritas pendentes). */
export function syncMascot() {
  writesSettled()
    .then(() => api.getMe())
    .then((me) => set(me.mascot))
    .catch(() => {});
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useMascotKind = (): MascotId => useSyncExternalStore(subscribe, () => current);
