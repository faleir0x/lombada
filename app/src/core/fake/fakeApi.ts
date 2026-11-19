import type { Api } from '../api/api';
import { ApiError } from '../api/errors';
import type {
  BookId,
  CreatedSession,
  CreateSessionInput,
  Iso,
  Rating,
  Result,
  SessionDetail,
  SessionId,
  SessionSummary,
  ShelfOrigin,
} from '../api/types';
import { type KeyValueStore, memoryStore } from '../storage';
import { CATALOG, catalogBook, PROTOTYPE_DECK, publicBook } from './catalog';
import { IDEA_SETS, NEARBY, SEED_SESSIONS } from './seed';

/* API falsa: implementa o contrato do ROADMAP.md em memória, com o estado salvo no aparelho
   para a estante sobreviver ao recarregar. Serve à fase visual até a API real (fase B).

   Simplificação da busca: não há busca de verdade. Os livros saem do catálogo de exemplo, primeiro os
   que a pessoa nunca julgou, depois os do baralho do protótipo, depois numa ordem que depende do texto. */

export type FakeScenario = 'normal' | 'sem-resultado' | 'erro' | 'lento' | 'offline';
export type FakeSeed = 'exemplo' | 'vazio';
export type FakeOperation = keyof Api;

export const FAKE_SCENARIOS: readonly FakeScenario[] = [
  'normal',
  'sem-resultado',
  'erro',
  'lento',
  'offline',
];
export const FAKE_STORAGE_KEY = 'lombada-fake-api';

export interface FakeApiOptions {
  /** Onde o estado fica salvo. Padrão: memória (some ao recriar). */
  storage?: KeyValueStore;
  storageKey?: string;
  /** Estado inicial quando não há nada salvo. Padrão: "exemplo", igual ao protótipo. */
  seed?: FakeSeed;
  scenario?: FakeScenario;
  /** Espera simulada, em ms, por operação. Padrão: busca de 1 a 6 s, o resto rápido. */
  latency?: (op: FakeOperation, scenario: FakeScenario) => number;
  now?: () => Date;
  random?: () => number;
}

export interface FakeApi extends Api {
  setScenario(scenario: FakeScenario): void;
  /** Volta ao estado inicial e apaga o que estava salvo. */
  reset(seed?: FakeSeed): void;
}

const DECK_SIZE = 10;
/** Quantos cards já chegam com "por que combina"; o resto vem por getWhy. */
const WHY_READY = 3;
const PAGE_SIZE = 20;
const RESULTS: readonly Result[] = ['love', 'pass', 'read_loved', 'read_disliked'];
const RATINGS: readonly Rating[] = ['up', 'down', null];

interface StoredSession {
  id: SessionId;
  query: string;
  created_at: Iso;
  continues: SessionId | null;
  seed_book_id: BookId | null;
  idempotency_key: string | null;
  books: BookId[];
  judgments: Record<BookId, { result: Result; judged_at: Iso }>;
}

interface StoredShelfEntry {
  book_id: BookId;
  added_at: Iso;
  rating: Rating;
  from: ShelfOrigin | null;
  /** Busca cujo julgamento pôs o livro aqui; Desfazer só tira o que o próprio julgamento pôs. */
  via_judgment: SessionId | null;
}

interface FakeState {
  version: 1;
  seq: number;
  ideas_turn: number;
  sessions: StoredSession[];
  /** Na ordem da estante. */
  shelf: StoredShelfEntry[];
}

export function defaultLatency(random: () => number) {
  return (op: FakeOperation, scenario: FakeScenario): number => {
    if (op === 'createSession') return scenario === 'lento' ? 9000 : 1000 + random() * 5000;
    if (op === 'getWhy') return 600 + random() * 900;
    return 120;
  };
}

function seedState(seed: FakeSeed): FakeState {
  const state: FakeState = { version: 1, seq: 0, ideas_turn: 0, sessions: [], shelf: [] };
  if (seed === 'vazio') return state;
  for (const s of SEED_SESSIONS) {
    const id = `s_${++state.seq}`;
    const judgments: StoredSession['judgments'] = {};
    s.books.forEach((book, i) => {
      const result = s.results[i];
      if (result) judgments[book] = { result, judged_at: s.created_at };
    });
    state.sessions.push({
      id,
      query: s.query,
      created_at: s.created_at,
      continues: null,
      seed_book_id: null,
      idempotency_key: null,
      books: [...s.books],
      judgments,
    });
    s.books.forEach((book, i) => {
      if (s.results[i] === 'love') {
        state.shelf.push({
          book_id: book,
          added_at: s.created_at,
          rating: null,
          from: { session_id: id, query: s.query },
          via_judgment: id,
        });
      }
    });
  }
  return state;
}

/** FNV-1a de 32 bits: ordem estável por texto, sem sorteio. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const wait = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const notFound = (what: string) => new ApiError('not_found', `${what} não encontrado.`, 404);
const badRequest = (what: string) => new ApiError('bad_request', what, 400);

export function createFakeApi(options: FakeApiOptions = {}): FakeApi {
  const storage = options.storage ?? memoryStore();
  const key = options.storageKey ?? FAKE_STORAGE_KEY;
  const seed = options.seed ?? 'exemplo';
  const now = options.now ?? (() => new Date());
  const random = options.random ?? Math.random;
  const latency = options.latency ?? defaultLatency(random);
  let scenario: FakeScenario = options.scenario ?? 'normal';
  let state = load();

  function load(): FakeState {
    const raw = storage.get(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as FakeState;
        if (parsed.version === 1) return parsed;
      } catch {
        // Estado corrompido: começa de novo.
      }
    }
    const fresh = seedState(seed);
    storage.set(key, JSON.stringify(fresh));
    return fresh;
  }

  const save = () => storage.set(key, JSON.stringify(state));

  async function run<T>(op: FakeOperation, fn: () => T): Promise<T> {
    await wait(latency(op, scenario));
    if (scenario === 'offline' || (scenario === 'erro' && op === 'createSession')) {
      throw new ApiError('network', 'Sem conexão.');
    }
    return fn();
  }

  const findSession = (id: SessionId) => {
    const s = state.sessions.find((x) => x.id === id);
    if (!s) throw notFound('Busca');
    return s;
  };
  const shelfIndex = (bookId: BookId) => state.shelf.findIndex((e) => e.book_id === bookId);
  const onShelf = (bookId: BookId) => shelfIndex(bookId) >= 0;
  const removeShelfAt = (i: number) => void state.shelf.splice(i, 1);

  function pickBooks(input: CreateSessionInput): BookId[] {
    const excluded = new Set(state.shelf.map((e) => e.book_id));
    if (input.seed_book_id) excluded.add(input.seed_book_id);
    // "Mais dez": nada do que já apareceu na cadeia de buscas volta.
    for (let id = input.continues; id; ) {
      const s = state.sessions.find((x) => x.id === id);
      if (!s) break;
      for (const b of s.books) excluded.add(b);
      id = s.continues;
    }
    const judged = new Set(state.sessions.flatMap((s) => Object.keys(s.judgments)));
    const deckRank = (id: BookId) => {
      const i = PROTOTYPE_DECK.indexOf(id);
      return i < 0 ? PROTOTYPE_DECK.length : i;
    };
    return CATALOG.map((b) => b.id)
      .filter((id) => !excluded.has(id))
      .sort(
        (a, b) =>
          Number(judged.has(a)) - Number(judged.has(b)) ||
          deckRank(a) - deckRank(b) ||
          hash(input.query + a) - hash(input.query + b),
      )
      .slice(0, DECK_SIZE);
  }

  function createdView(s: StoredSession): CreatedSession {
    return {
      session_id: s.id,
      query: s.query,
      created_at: s.created_at,
      books: s.books.map((id, i) => ({
        ...publicBook(id),
        why: i < WHY_READY ? (catalogBook(id)?.why ?? null) : null,
      })),
      nearby: s.books.length ? [] : NEARBY.map((n) => ({ ...n })),
    };
  }

  function summary(s: StoredSession): SessionSummary {
    const judged = s.books.filter((id) => s.judgments[id]);
    const loved = judged.filter(onShelf);
    return {
      session_id: s.id,
      query: s.query,
      created_at: s.created_at,
      loved: loved.length,
      passed: judged.length - loved.length,
      loved_preview: loved.slice(0, 3).map(publicBook),
    };
  }

  const api: FakeApi = {
    setScenario(next) {
      scenario = next;
    },

    reset(next = seed) {
      state = seedState(next);
      save();
    },

    createUser: () => run('createUser', () => ({ user_id: 'u_exemplo', token: 'token-de-exemplo' })),

    getIdeas: () =>
      run('getIdeas', () => {
        const set = IDEA_SETS[state.ideas_turn % IDEA_SETS.length] ?? IDEA_SETS[0];
        if (!set) throw new ApiError('server', 'Sem ideias de exemplo.', 500);
        state.ideas_turn++;
        save();
        const hour = now().getHours();
        return { title: set.title(hour >= 18 || hour < 5), ideas: set.ideas.map((i) => ({ ...i })) };
      }),

    createSession: (input, opts) =>
      run('createSession', () => {
        const query = input.query.trim();
        if (!query) throw badRequest('A busca está vazia.');
        if (input.continues) findSession(input.continues);
        if (input.seed_book_id && !catalogBook(input.seed_book_id)) throw notFound('Livro');
        const key = opts?.idempotencyKey ?? null;
        const repeated = key ? state.sessions.find((s) => s.idempotency_key === key) : undefined;
        if (repeated) return createdView(repeated);
        const session: StoredSession = {
          id: `s_${++state.seq}`,
          query,
          created_at: now().toISOString(),
          continues: input.continues,
          seed_book_id: input.seed_book_id,
          idempotency_key: key,
          books: scenario === 'sem-resultado' ? [] : pickBooks({ ...input, query }),
          judgments: {},
        };
        state.sessions.push(session);
        save();
        return createdView(session);
      }),

    getWhy: (sessionId, bookIds) =>
      run('getWhy', () => {
        const s = findSession(sessionId);
        return Object.fromEntries(
          bookIds.map((id) => [id, s.books.includes(id) ? (catalogBook(id)?.why ?? null) : null]),
        );
      }),

    judge: (sessionId, bookId, result, judgedAt) =>
      run('judge', () => {
        const s = findSession(sessionId);
        if (!s.books.includes(bookId)) throw notFound('Livro nesta busca');
        if (!RESULTS.includes(result)) throw badRequest(`Resultado inválido: ${result}`);
        if (Number.isNaN(Date.parse(judgedAt))) throw badRequest('judged_at não é uma data.');
        const previous = s.judgments[bookId];
        s.judgments[bookId] = { result, judged_at: judgedAt };
        if (previous?.result !== result) {
          const goesToShelf = result === 'love' || result === 'read_loved';
          const i = shelfIndex(bookId);
          const entry = state.shelf[i];
          if (goesToShelf && !entry) {
            state.shelf.push({
              book_id: bookId,
              added_at: now().toISOString(),
              rating: result === 'read_loved' ? 'up' : null,
              from: { session_id: s.id, query: s.query },
              via_judgment: s.id,
            });
          } else if (goesToShelf && entry?.via_judgment === s.id) {
            entry.rating = result === 'read_loved' ? 'up' : null;
          } else if (!goesToShelf && entry?.via_judgment === s.id) {
            removeShelfAt(i);
          }
        }
        save();
      }),

    unjudge: (sessionId, bookId) =>
      run('unjudge', () => {
        const s = findSession(sessionId);
        if (!s.judgments[bookId]) return;
        delete s.judgments[bookId];
        const i = shelfIndex(bookId);
        if (state.shelf[i]?.via_judgment === s.id) removeShelfAt(i);
        save();
      }),

    listSessions: (cursor) =>
      run('listSessions', () => {
        const offset = cursor ? Number(cursor) : 0;
        if (!Number.isInteger(offset) || offset < 0) throw badRequest('Cursor inválido.');
        const judged = state.sessions.filter((s) => Object.keys(s.judgments).length > 0).reverse();
        const next = offset + PAGE_SIZE;
        return {
          sessions: judged.slice(offset, next).map(summary),
          next_cursor: next < judged.length ? String(next) : null,
        };
      }),

    getSession: (sessionId) =>
      run('getSession', (): SessionDetail => {
        const s = findSession(sessionId);
        return {
          session_id: s.id,
          query: s.query,
          created_at: s.created_at,
          continues: s.continues,
          books: s.books.map((id) => ({
            ...publicBook(id),
            result: s.judgments[id]?.result ?? null,
            on_shelf: onShelf(id),
          })),
        };
      }),

    getShelf: () =>
      run('getShelf', () => ({
        books: state.shelf.map((e, i) => ({
          ...publicBook(e.book_id),
          position: i + 1,
          rating: e.rating,
          added_at: e.added_at,
          from: e.from ? { ...e.from } : null,
        })),
      })),

    addToShelf: (bookId, fromSession) =>
      run('addToShelf', () => {
        const s = findSession(fromSession);
        if (!s.books.includes(bookId)) throw notFound('Livro nesta busca');
        if (onShelf(bookId)) return;
        state.shelf.push({
          book_id: bookId,
          added_at: now().toISOString(),
          rating: s.judgments[bookId]?.result === 'read_loved' ? 'up' : null,
          from: { session_id: s.id, query: s.query },
          via_judgment: null,
        });
        save();
      }),

    removeFromShelf: (bookId) =>
      run('removeFromShelf', () => {
        const i = shelfIndex(bookId);
        if (i < 0) return;
        removeShelfAt(i);
        save();
      }),

    updateShelfBook: (bookId, patch) =>
      run('updateShelfBook', () => {
        const i = shelfIndex(bookId);
        const entry = state.shelf[i];
        if (!entry) throw notFound('Livro na estante');
        if (patch.rating !== undefined) {
          if (!RATINGS.includes(patch.rating)) throw badRequest(`Nota inválida: ${patch.rating}`);
          entry.rating = patch.rating;
        }
        if (patch.position !== undefined) {
          if (!Number.isInteger(patch.position) || patch.position < 1) {
            throw badRequest('A posição começa em 1.');
          }
          removeShelfAt(i);
          state.shelf.splice(Math.min(patch.position, state.shelf.length + 1) - 1, 0, entry);
        }
        save();
      }),
  };

  return api;
}
