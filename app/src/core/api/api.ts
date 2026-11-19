import type {
  BookId,
  CreatedSession,
  CreateSessionInput,
  IdeasResponse,
  Iso,
  Result,
  SessionDetail,
  SessionId,
  SessionPage,
  Shelf,
  ShelfPatch,
  User,
} from './types';

/* Um método por endpoint do contrato. A API falsa e a real implementam esta interface e passam
   pela mesma bateria de testes (contract.suite.ts). Falhas viram ApiError. */
export interface Api {
  /** POST /users */
  createUser(): Promise<User>;
  /** GET /ideas. Chamar de novo traz outras três. */
  getIdeas(): Promise<IdeasResponse>;
  /** POST /sessions. A mesma idempotencyKey devolve a mesma busca. */
  createSession(input: CreateSessionInput, options?: { idempotencyKey?: string }): Promise<CreatedSession>;
  /** GET /sessions/{id}/why?book_ids=… */
  getWhy(sessionId: SessionId, bookIds: BookId[]): Promise<Record<BookId, string | null>>;
  /** PUT /sessions/{id}/judgments/{book_id} */
  judge(sessionId: SessionId, bookId: BookId, result: Result, judgedAt: Iso): Promise<void>;
  /** DELETE /sessions/{id}/judgments/{book_id}: Desfazer. */
  unjudge(sessionId: SessionId, bookId: BookId): Promise<void>;
  /** GET /sessions?cursor=… Só buscas com julgamento, mais recente primeiro. */
  listSessions(cursor?: string | null): Promise<SessionPage>;
  /** GET /sessions/{id} */
  getSession(sessionId: SessionId): Promise<SessionDetail>;
  /** GET /shelf */
  getShelf(): Promise<Shelf>;
  /** PUT /shelf/{book_id}: ♥ cheio no resumo. */
  addToShelf(bookId: BookId, fromSession: SessionId): Promise<void>;
  /** DELETE /shelf/{book_id}: ♥ vazio no resumo, ou a lixeira do detalhe. */
  removeFromShelf(bookId: BookId): Promise<void>;
  /** PATCH /shelf/{book_id}: posição e nota de "Depois de ler". */
  updateShelfBook(bookId: BookId, patch: ShelfPatch): Promise<void>;
}
