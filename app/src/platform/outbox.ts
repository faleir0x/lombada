import { type IDBPDatabase, openDB } from 'idb';
import { useSyncExternalStore } from 'react';
import {
  createOutbox,
  memoryOutboxStore,
  type OutboxStore,
  type QueuedWrite,
  type WriteOp,
} from '../core/outbox';
import { api, newIdempotencyKey } from './appApi';

/* A fila de escritas do app, salva no IndexedDB: julgar, desfazer, mudar o ♥, a ordem e a nota da estante,
   o mascote. Sobe ao abrir o app, quando a conexão volta e, se a rede falhar com a conexão ligada, de novo
   em alguns segundos. */

const DB = 'lombada';
const STORE = 'escritas';

function indexedDbStore(): OutboxStore {
  let db: Promise<IDBPDatabase> | null = null;
  const open = () => {
    db ??= openDB(DB, 1, {
      upgrade(d) {
        d.createObjectStore(STORE, { keyPath: 'id' });
      },
    });
    return db;
  };
  return {
    all: async () => ((await (await open()).getAll(STORE)) as QueuedWrite[]).sort((a, b) => a.id - b.id),
    put: async (w) => void (await (await open()).put(STORE, w)),
    delete: async (id) => void (await (await open()).delete(STORE, id)),
  };
}

// Sem IndexedDB (janela anônima em alguns navegadores), a fila vive só na memória desta sessão.
const store: OutboxStore = typeof indexedDB === 'undefined' ? memoryOutboxStore() : indexedDbStore();

const outbox = createOutbox({
  api,
  store,
  newKey: newIdempotencyKey,
  onDropped: (w, e) => console.warn('Escrita recusada pela API, saiu da fila:', w.op, e),
});

const RETRY = [2000, 5000, 15000, 30000];
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function kick() {
  clearTimeout(retryTimer);
  void outbox.flush().then((result) => {
    if (result === 'drained') {
      attempt = 0;
      return;
    }
    // Bloqueou com a conexão ligada (servidor fora): tenta de novo mais tarde.
    if (navigator.onLine) {
      retryTimer = setTimeout(kick, RETRY[Math.min(attempt, RETRY.length - 1)]);
      attempt++;
    }
  });
}

void outbox.load().then(kick);
addEventListener('online', () => {
  attempt = 0;
  kick();
});

export function enqueueWrite(op: WriteOp): Promise<void> {
  return outbox.enqueue(op);
}

/** Espera a fila parar de subir (acabou ou ficou presa sem conexão). */
export const writesSettled = (): Promise<unknown> => outbox.load().then(() => outbox.settled());

export const pendingWrites = () => outbox.size();
export const usePendingWrites = () => useSyncExternalStore(outbox.subscribe, outbox.size);

/* Conexão do navegador. */
const onlineListeners = new Set<() => void>();
const emitOnline = () => {
  for (const l of onlineListeners) l();
};
addEventListener('online', emitOnline);
addEventListener('offline', emitOnline);
const subscribeOnline = (l: () => void) => {
  onlineListeners.add(l);
  return () => onlineListeners.delete(l);
};
export const useOnline = (): boolean => useSyncExternalStore(subscribeOnline, () => navigator.onLine);
