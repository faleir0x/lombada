import { describe, expect, it } from 'vitest';
import { ApiError } from './api/errors';
import { createFakeApi } from './fake/fakeApi';
import { createOutbox, memoryOutboxStore, type WriteOp } from './outbox';

/* A fila sobe na ordem, para no erro de rede, retoma depois e sobrevive a fechar o app. */

async function deck() {
  let online = true;
  const api = createFakeApi({ seed: 'vazio', latency: () => 0, online: () => online });
  const s = await api.createSession({ query: 'x', seed_book_id: null, continues: null });
  const ids = s.books.map((b) => b.id);
  return { api, session: s.session_id, ids, setOnline: (v: boolean) => (online = v) };
}
const judge = (sessionId: string, bookId: string, result: 'love' | 'pass'): WriteOp => ({
  kind: 'judge',
  sessionId,
  bookId,
  result,
  judgedAt: '2026-11-19T21:00:00.000Z',
});

describe('fila de escritas', () => {
  it('sobe na ordem: ♥ e depois Desfazer não chegam invertidos', async () => {
    const { api, session, ids } = await deck();
    const box = createOutbox({ api, store: memoryOutboxStore() });
    const [a, b] = ids as [string, string];
    await box.enqueue(judge(session, a, 'love'));
    await box.enqueue({ kind: 'unjudge', sessionId: session, bookId: a });
    await box.enqueue(judge(session, b, 'love'));
    expect(await box.settled()).toBe('drained');
    expect((await api.getShelf()).books.map((x) => x.id)).toEqual([b]);
    expect(box.size()).toBe(0);
  });

  it('sem conexão, para e guarda; com conexão de novo, sobe tudo na ordem', async () => {
    const { api, session, ids, setOnline } = await deck();
    const box = createOutbox({ api, store: memoryOutboxStore() });
    setOnline(false);
    for (const id of ids.slice(0, 4)) await box.enqueue(judge(session, id, 'love'));
    expect(await box.settled()).toBe('blocked');
    expect(box.size()).toBe(4);
    setOnline(true);
    expect(await box.flush()).toBe('drained');
    expect((await api.getShelf()).books.map((x) => x.id)).toEqual(ids.slice(0, 4));
  });

  it('o que ficou na fila sobrevive a fechar e abrir o app', async () => {
    const { api, session, ids, setOnline } = await deck();
    const store = memoryOutboxStore();
    setOnline(false);
    const first = createOutbox({ api, store });
    await first.enqueue(judge(session, ids[0] as string, 'love'));
    await first.enqueue(judge(session, ids[1] as string, 'pass'));
    await first.settled();
    setOnline(true);
    const reopened = createOutbox({ api, store });
    await reopened.load();
    expect(reopened.size()).toBe(2);
    expect(await reopened.flush()).toBe('drained');
    expect((await api.getShelf()).books.map((x) => x.id)).toEqual([ids[0]]);
    expect(await store.all()).toEqual([]);
  });

  it('404 tira da fila sem travar o resto', async () => {
    const { api, session, ids } = await deck();
    const dropped: string[] = [];
    const box = createOutbox({ api, store: memoryOutboxStore(), onDropped: (w) => dropped.push(w.op.kind) });
    await box.enqueue(judge('nao-existe', ids[0] as string, 'love'));
    await box.enqueue(judge(session, ids[1] as string, 'love'));
    expect(await box.settled()).toBe('drained');
    expect(dropped).toEqual(['judge']);
    expect((await api.getShelf()).books.map((x) => x.id)).toEqual([ids[1]]);
  });

  it('erro do servidor (5xx) para a fila como falta de conexão', async () => {
    const { api, session, ids } = await deck();
    let fail = true;
    const flaky = {
      ...api,
      judge: (...args: Parameters<typeof api.judge>) =>
        fail ? Promise.reject(new ApiError('server', 'caiu', 503)) : api.judge(...args),
    };
    const box = createOutbox({ api: flaky, store: memoryOutboxStore() });
    await box.enqueue(judge(session, ids[0] as string, 'love'));
    expect(await box.settled()).toBe('blocked');
    fail = false;
    expect(await box.flush()).toBe('drained');
  });
});
