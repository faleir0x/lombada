import { describe, expect, it } from 'vitest';
import type { Api } from './api';
import { isApiError } from './errors';
import type { BookId, CreatedSession, SessionId } from './types';

/* Bateria de testes do contrato (ROADMAP.md, "Contrato da API"). Roda contra qualquer implementação
   de Api: hoje a falsa, na fase B a real. Cada teste pede uma Api nova, de uma pessoa sem histórico.
   Só testa o que o contrato promete; detalhes da API falsa ficam em fakeApi.test.ts. */

export function runContractSuite(name: string, makeApi: () => Api | Promise<Api>) {
  const JUDGED_AT = '2026-11-19T21:05:12.000Z';

  async function start(api: Api, query = 'acabei Torto Arado e nada me prende'): Promise<CreatedSession> {
    const s = await api.createSession({ query, seed_book_id: null, continues: null });
    expect(s.books.length).toBeGreaterThan(0);
    return s;
  }

  const bookAt = (s: CreatedSession, i: number): BookId => {
    const b = s.books[i];
    if (!b) throw new Error(`Busca ${s.session_id} não tem o livro ${i}.`);
    return b.id;
  };

  async function shelfIds(api: Api): Promise<BookId[]> {
    return (await api.getShelf()).books.map((b) => b.id);
  }

  async function sessionBook(api: Api, sessionId: SessionId, bookId: BookId) {
    const book = (await api.getSession(sessionId)).books.find((b) => b.id === bookId);
    if (!book) throw new Error(`Livro ${bookId} não está na busca ${sessionId}.`);
    return book;
  }

  async function expectError(promise: Promise<unknown>, code: Parameters<typeof isApiError>[1]) {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(isApiError(error, code), `esperava ApiError ${code}, veio ${String(error)}`).toBe(true);
  }

  describe(`contrato da API · ${name}`, () => {
    describe('pessoa e ideias', () => {
      it('cria uma pessoa com token', async () => {
        const user = await (await makeApi()).createUser();
        expect(user.user_id).toBeTruthy();
        expect(user.token).toBeTruthy();
      });

      it('traz três ideias com motivo, e outras três ao pedir de novo', async () => {
        const api = await makeApi();
        const first = await api.getIdeas();
        expect(first.title).toBeTruthy();
        expect(first.ideas).toHaveLength(3);
        for (const idea of first.ideas) {
          expect(idea.query).toBeTruthy();
          expect(idea.reason).toBeTruthy();
        }
        const second = await api.getIdeas();
        expect(second.ideas.map((i) => i.query)).not.toEqual(first.ideas.map((i) => i.query));
      });
    });

    describe('busca', () => {
      it('devolve dez livros diferentes, todos com cor de capa', async () => {
        const s = await start(await makeApi());
        expect(s.session_id).toBeTruthy();
        expect(s.books).toHaveLength(10);
        expect(new Set(s.books.map((b) => b.id)).size).toBe(10);
        expect(s.nearby).toEqual([]);
        for (const b of s.books) {
          expect(b.cover.color).toMatch(/^#[0-9a-f]{6}$/i);
          expect(b.title).toBeTruthy();
          expect(b.authors.length).toBeGreaterThan(0);
          expect(b.synopsis).toBeTruthy();
          expect(b.why === null || typeof b.why === 'string').toBe(true);
        }
      });

      it('recusa busca vazia', async () => {
        const api = await makeApi();
        await expectError(
          api.createSession({ query: '   ', seed_book_id: null, continues: null }),
          'bad_request',
        );
      });

      it('a mesma Idempotency-Key não cria duas buscas', async () => {
        const api = await makeApi();
        const input = { query: 'curto e triste', seed_book_id: null, continues: null };
        const a = await api.createSession(input, { idempotencyKey: 'k-1' });
        const b = await api.createSession(input, { idempotencyKey: 'k-1' });
        const c = await api.createSession(input, { idempotencyKey: 'k-2' });
        expect(b.session_id).toBe(a.session_id);
        expect(b.books.map((x) => x.id)).toEqual(a.books.map((x) => x.id));
        expect(c.session_id).not.toBe(a.session_id);
      });

      it('"Mais dez" não repete nada da busca anterior nem da estante', async () => {
        const api = await makeApi();
        const first = await start(api);
        await api.judge(first.session_id, bookAt(first, 0), 'love', JUDGED_AT);
        const more = await api.createSession({
          query: first.query,
          seed_book_id: null,
          continues: first.session_id,
        });
        const before = new Set(first.books.map((b) => b.id));
        for (const b of more.books) expect(before.has(b.id)).toBe(false);
      });

      it('"Mais dez" de uma busca que não existe é not_found', async () => {
        const api = await makeApi();
        await expectError(
          api.createSession({ query: 'x', seed_book_id: null, continues: 'nao-existe' }),
          'not_found',
        );
      });

      it('"Buscar parecidos" não devolve o próprio livro', async () => {
        const api = await makeApi();
        const first = await start(api);
        const seedBook = bookAt(first, 0);
        const similar = await api.createSession({
          query: 'Igual …',
          seed_book_id: seedBook,
          continues: null,
        });
        expect(similar.books.map((b) => b.id)).not.toContain(seedBook);
      });

      it('"por que combina" responde por livro, com texto ou null se ainda não ficou pronto', async () => {
        const api = await makeApi();
        const s = await start(api);
        const ids = s.books.map((b) => b.id);
        const why = await api.getWhy(s.session_id, ids);
        expect(Object.keys(why).sort()).toEqual([...ids].sort());
        for (const id of ids) expect(why[id] === null || typeof why[id] === 'string').toBe(true);
      });
    });

    describe('julgar um card', () => {
      it('♥ põe o livro no fim da estante, sem nota, com a busca de origem', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 1), 'love', JUDGED_AT);
        const shelf = (await api.getShelf()).books;
        expect(shelf.map((b) => b.id)).toEqual([bookAt(s, 0), bookAt(s, 1)]);
        expect(shelf.map((b) => b.position)).toEqual([1, 2]);
        expect(shelf[1]?.rating).toBeNull();
        expect(shelf[1]?.from).toEqual({ session_id: s.session_id, query: s.query });
        expect(Date.parse(shelf[1]?.added_at ?? '')).not.toBeNaN();
      });

      it('"já li e amei" vai para a estante já com 👍', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'read_loved', JUDGED_AT);
        const shelf = (await api.getShelf()).books;
        expect(shelf.map((b) => [b.id, b.rating])).toEqual([[bookAt(s, 0), 'up']]);
      });

      it('✕ e "já li e não curti" não vão para a estante', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'pass', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 1), 'read_disliked', JUDGED_AT);
        expect(await shelfIds(api)).toEqual([]);
      });

      it('mandar o mesmo julgamento duas vezes não muda nada', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 1), 'love', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        expect(await shelfIds(api)).toEqual([bookAt(s, 0), bookAt(s, 1)]);
      });

      it('trocar ♥ por ✕ tira da estante', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 0), 'pass', JUDGED_AT);
        expect(await shelfIds(api)).toEqual([]);
        expect((await sessionBook(api, s.session_id, bookAt(s, 0))).result).toBe('pass');
      });

      it('Desfazer apaga o julgamento e tira da estante o que ele pôs', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        await api.unjudge(s.session_id, bookAt(s, 0));
        expect(await shelfIds(api)).toEqual([]);
        expect((await sessionBook(api, s.session_id, bookAt(s, 0))).result).toBeNull();
        await api.unjudge(s.session_id, bookAt(s, 0)); // de novo: nada muda, sem erro
      });

      it('julgar livro que não está na busca é not_found', async () => {
        const api = await makeApi();
        const s = await start(api);
        await expectError(api.judge(s.session_id, 'nao-existe', 'love', JUDGED_AT), 'not_found');
        await expectError(api.judge('nao-existe', bookAt(s, 0), 'love', JUDGED_AT), 'not_found');
      });
    });

    describe('histórico e resumo', () => {
      it('a busca só entra no histórico com o primeiro julgamento', async () => {
        const api = await makeApi();
        const s = await start(api);
        expect((await api.listSessions()).sessions).toEqual([]);
        await api.judge(s.session_id, bookAt(s, 0), 'pass', JUDGED_AT);
        const page = await api.listSessions();
        expect(page.sessions.map((x) => x.session_id)).toEqual([s.session_id]);
        expect(page.next_cursor).toBeNull();
      });

      it('mais recente primeiro', async () => {
        const api = await makeApi();
        const a = await start(api, 'primeira');
        await api.judge(a.session_id, bookAt(a, 0), 'pass', JUDGED_AT);
        const b = await start(api, 'segunda');
        await api.judge(b.session_id, bookAt(b, 0), 'pass', JUDGED_AT);
        const ids = (await api.listSessions()).sessions.map((x) => x.session_id);
        expect(ids).toEqual([b.session_id, a.session_id]);
      });

      it('conta amados e passados pelo estado atual da estante', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 1), 'read_loved', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 2), 'pass', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 3), 'read_disliked', JUDGED_AT);
        let row = (await api.listSessions()).sessions[0];
        expect([row?.loved, row?.passed]).toEqual([2, 2]);
        expect(row?.loved_preview.map((b) => b.id)).toEqual([bookAt(s, 0), bookAt(s, 1)]);

        await api.removeFromShelf(bookAt(s, 0)); // a lixeira do detalhe
        row = (await api.listSessions()).sessions[0];
        expect([row?.loved, row?.passed]).toEqual([1, 3]);
      });

      it('o resumo vem na ordem do baralho, com o julgamento e o ♥ atual', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 1), 'read_loved', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 2), 'pass', JUDGED_AT);
        const detail = await api.getSession(s.session_id);
        expect(detail.query).toBe(s.query);
        expect(detail.continues).toBeNull();
        expect(detail.books.map((b) => b.id)).toEqual(s.books.map((b) => b.id));
        expect(detail.books.slice(0, 3).map((b) => [b.result, b.on_shelf])).toEqual([
          [null, false],
          ['read_loved', true],
          ['pass', false],
        ]);
      });

      it('lista em páginas', async () => {
        const api = await makeApi();
        for (let i = 0; i < 22; i++) {
          const s = await start(api, `busca ${i}`);
          await api.judge(s.session_id, bookAt(s, 0), 'pass', JUDGED_AT);
        }
        const first = await api.listSessions();
        expect(first.next_cursor).not.toBeNull();
        const second = await api.listSessions(first.next_cursor);
        const all = [...first.sessions, ...second.sessions].map((x) => x.session_id);
        expect(new Set(all).size).toBe(22);
        expect(second.next_cursor).toBeNull();
      });

      it('busca que não existe é not_found', async () => {
        await expectError((await makeApi()).getSession('nao-existe'), 'not_found');
      });
    });

    describe('mudar o ♥ depois', () => {
      it('♥ cheio num passado põe na estante, e o julgamento continua o mesmo', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        await api.judge(s.session_id, bookAt(s, 1), 'pass', JUDGED_AT);
        await api.addToShelf(bookAt(s, 1), s.session_id);
        await api.addToShelf(bookAt(s, 1), s.session_id); // repetido: nada muda
        expect(await shelfIds(api)).toEqual([bookAt(s, 0), bookAt(s, 1)]);
        const book = await sessionBook(api, s.session_id, bookAt(s, 1));
        expect([book.result, book.on_shelf]).toEqual(['pass', true]);
      });

      it('♥ vazio num amado tira da estante, e o julgamento continua o mesmo', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'love', JUDGED_AT);
        await api.removeFromShelf(bookAt(s, 0));
        await api.removeFromShelf(bookAt(s, 0)); // repetido: nada muda
        const book = await sessionBook(api, s.session_id, bookAt(s, 0));
        expect([book.result, book.on_shelf]).toEqual(['love', false]);
      });

      it('um "já li e amei" que volta para a estante volta com 👍', async () => {
        const api = await makeApi();
        const s = await start(api);
        await api.judge(s.session_id, bookAt(s, 0), 'read_loved', JUDGED_AT);
        await api.removeFromShelf(bookAt(s, 0));
        await api.addToShelf(bookAt(s, 0), s.session_id);
        expect((await api.getShelf()).books[0]?.rating).toBe('up');
      });
    });

    describe('estante', () => {
      async function shelfOf(api: Api, n: number) {
        const s = await start(api);
        for (let i = 0; i < n; i++) await api.judge(s.session_id, bookAt(s, i), 'love', JUDGED_AT);
        return s.books.slice(0, n).map((b) => b.id);
      }

      it('muda a posição e os outros andam', async () => {
        const api = await makeApi();
        const [a, b, c, d] = await shelfOf(api, 4);
        await api.updateShelfBook(d as BookId, { position: 1 });
        expect(await shelfIds(api)).toEqual([d, a, b, c]);
        await api.updateShelfBook(d as BookId, { position: 3 });
        expect(await shelfIds(api)).toEqual([a, b, d, c]);
        await api.updateShelfBook(a as BookId, { position: 99 }); // depois do fim vira o último
        expect(await shelfIds(api)).toEqual([b, d, c, a]);
        expect((await api.getShelf()).books.map((x) => x.position)).toEqual([1, 2, 3, 4]);
      });

      it('posição menor que 1 é bad_request', async () => {
        const api = await makeApi();
        const [a] = await shelfOf(api, 2);
        await expectError(api.updateShelfBook(a as BookId, { position: 0 }), 'bad_request');
      });

      it('tirar um livro fecha o buraco', async () => {
        const api = await makeApi();
        const [a, b, c] = await shelfOf(api, 3);
        await api.removeFromShelf(b as BookId);
        const shelf = (await api.getShelf()).books;
        expect(shelf.map((x) => [x.id, x.position])).toEqual([
          [a, 1],
          [c, 2],
        ]);
      });

      it('marca e desmarca 👍 e 👎', async () => {
        const api = await makeApi();
        const [a] = await shelfOf(api, 1);
        const rating = async () => (await api.getShelf()).books[0]?.rating;
        await api.updateShelfBook(a as BookId, { rating: 'up' });
        expect(await rating()).toBe('up');
        await api.updateShelfBook(a as BookId, { rating: 'down' });
        expect(await rating()).toBe('down');
        await api.updateShelfBook(a as BookId, { rating: null });
        expect(await rating()).toBeNull();
      });

      it('mexer em livro fora da estante é not_found', async () => {
        await expectError((await makeApi()).updateShelfBook('nao-existe', { rating: 'up' }), 'not_found');
      });
    });
  });
}
