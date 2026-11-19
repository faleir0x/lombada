import type { Api } from './api/api';
import { isApiError } from './api/errors';
import type { BookId, Iso, MePatch, Result, SessionId, ShelfPatch } from './api/types';

/* Fila de escritas (ROADMAP.md, "Sem conexão"). Toda escrita do app entra aqui como dado, fica salva no
   aparelho e sobe na ordem, uma por vez. Resposta 2xx, 404 ou 409 tira da fila; erro de rede ou 5xx para a
   fila, que tenta de novo depois. Pura: o armazenamento é injetado (IndexedDB no app, memória nos testes). */

export type WriteOp =
  | { kind: 'judge'; sessionId: SessionId; bookId: BookId; result: Result; judgedAt: Iso }
  | { kind: 'unjudge'; sessionId: SessionId; bookId: BookId }
  | { kind: 'addToShelf'; bookId: BookId; fromSession: SessionId }
  | { kind: 'removeFromShelf'; bookId: BookId }
  | { kind: 'updateShelfBook'; bookId: BookId; patch: ShelfPatch }
  | { kind: 'updateMe'; patch: MePatch }
  | { kind: 'deleteSessions' };

export interface QueuedWrite {
  id: number;
  op: WriteOp;
  /** Chave de idempotência, para a API real (cabeçalho Idempotency-Key). */
  key: string;
  queuedAt: Iso;
}

export interface OutboxStore {
  all(): Promise<QueuedWrite[]>;
  put(write: QueuedWrite): Promise<void>;
  delete(id: number): Promise<void>;
}

export function memoryOutboxStore(): OutboxStore {
  const rows = new Map<number, QueuedWrite>();
  return {
    all: async () => [...rows.values()].sort((a, b) => a.id - b.id),
    put: async (w) => void rows.set(w.id, structuredCopy(w)),
    delete: async (id) => void rows.delete(id),
  };
}

const structuredCopy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function applyWrite(api: Api, op: WriteOp): Promise<void> {
  switch (op.kind) {
    case 'judge':
      return api.judge(op.sessionId, op.bookId, op.result, op.judgedAt);
    case 'unjudge':
      return api.unjudge(op.sessionId, op.bookId);
    case 'addToShelf':
      return api.addToShelf(op.bookId, op.fromSession);
    case 'removeFromShelf':
      return api.removeFromShelf(op.bookId);
    case 'updateShelfBook':
      return api.updateShelfBook(op.bookId, op.patch);
    case 'updateMe':
      return api.updateMe(op.patch);
    case 'deleteSessions':
      return api.deleteSessions();
  }
}

/** Erro que não melhora tentando de novo: a escrita sai da fila. */
const isFinal = (e: unknown) =>
  isApiError(e, 'not_found') || isApiError(e, 'conflict') || isApiError(e, 'bad_request');

export type FlushResult = 'drained' | 'blocked';

export interface Outbox {
  /** Carrega o que ficou salvo de antes (ao abrir o app). */
  load(): Promise<void>;
  enqueue(op: WriteOp): Promise<void>;
  /** Sobe a fila na ordem até acabar ou bater num erro de rede. Chamadas juntas dividem a mesma subida. */
  flush(): Promise<FlushResult>;
  /** Espera a subida em andamento parar (acabou ou bloqueou). */
  settled(): Promise<FlushResult>;
  size(): number;
  subscribe(listener: () => void): () => void;
}

export function createOutbox({
  api,
  store,
  now = () => new Date(),
  newKey = () => `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  onDropped = () => {},
}: {
  api: Api;
  store: OutboxStore;
  now?: () => Date;
  newKey?: () => string;
  /** Escrita recusada de vez (400/404/409): sai da fila. */
  onDropped?: (w: QueuedWrite, error: unknown) => void;
}): Outbox {
  const queue: QueuedWrite[] = [];
  const listeners = new Set<() => void>();
  let nextId = 1;
  let loaded: Promise<void> | null = null;
  let running: Promise<FlushResult> | null = null;
  let last: FlushResult = 'drained';
  const emit = () => {
    for (const l of listeners) l();
  };

  const load = () => {
    loaded ??= store.all().then((rows) => {
      // O que estava salvo vem antes do que entrou enquanto carregava.
      queue.unshift(...rows.filter((r) => !queue.some((q) => q.id === r.id)));
      nextId = Math.max(nextId, ...queue.map((q) => q.id + 1));
      emit();
    });
    return loaded;
  };

  async function run(): Promise<FlushResult> {
    await load();
    while (queue.length) {
      const head = queue[0];
      if (!head) break;
      try {
        await applyWrite(api, head.op);
      } catch (e) {
        if (!isFinal(e)) return 'blocked';
        onDropped(head, e);
      }
      queue.shift();
      await store.delete(head.id);
      emit();
    }
    return 'drained';
  }

  const flush = () => {
    running ??= run().then(
      (r) => {
        running = null;
        last = r;
        return r;
      },
      () => {
        running = null;
        last = 'blocked';
        return 'blocked' as const;
      },
    );
    return running;
  };

  return {
    load,
    async enqueue(op) {
      const write: QueuedWrite = { id: nextId++, op, key: newKey(), queuedAt: now().toISOString() };
      queue.push(write);
      emit();
      await store.put(write);
      void flush();
    },
    flush,
    settled: () => running ?? Promise.resolve(last),
    size: () => queue.length,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
