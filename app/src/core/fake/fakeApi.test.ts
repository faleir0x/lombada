import { describe, expect, it } from 'vitest';
import { isApiError } from '../api/errors';
import { memoryStore } from '../storage';
import { CATALOG, PROTOTYPE_DECK } from './catalog';
import { createFakeApi, defaultLatency, type FakeApiOptions } from './fakeApi';

/* O que é da API falsa e não do contrato: dados de exemplo, cenários, estado salvo. */

const make = (options: FakeApiOptions = {}) => createFakeApi({ latency: () => 0, ...options });
const NEW_SEARCH = { query: 'algo curto', seed_book_id: null, continues: null };
const JUDGED_AT = '2026-11-19T21:05:12.000Z';

describe('catálogo de exemplo', () => {
  it('tem os 45 livros do protótipo, sem repetir, todos completos', () => {
    expect(CATALOG).toHaveLength(45);
    expect(new Set(CATALOG.map((b) => b.id)).size).toBe(45);
    for (const b of CATALOG) {
      expect(b.synopsis.length, b.id).toBeGreaterThan(40);
      expect(b.why.length, b.id).toBeGreaterThan(10);
      expect(b.cover.color, b.id).toMatch(/^#[0-9A-F]{6}$/);
      // DESIGN.md §3: travessão nunca no texto que aparece na tela.
      expect(`${b.synopsis} ${b.why}`, b.id).not.toMatch(/[—–]/);
    }
  });

  it('o baralho do protótipo está todo no catálogo', () => {
    const ids = new Set(CATALOG.map((b) => b.id));
    for (const id of PROTOTYPE_DECK) expect(ids.has(id), id).toBe(true);
  });
});

describe('estado inicial', () => {
  it('"exemplo" é igual ao protótipo: três na estante, três buscas no histórico', async () => {
    const api = make({ seed: 'exemplo' });
    const shelf = (await api.getShelf()).books;
    expect(shelf.map((b) => [b.title, b.from?.query])).toEqual([
      ['Torto Arado', 'Livro brasileiro que dói'],
      ['A hora da estrela', 'Curto e devastador'],
      ['O avesso da pele', 'Igual Torto Arado'],
    ]);
    const history = (await api.listSessions()).sessions;
    expect(history.map((s) => [s.query, s.loved, s.passed])).toEqual([
      ['Igual Torto Arado', 1, 9],
      ['Curto e devastador', 1, 9],
      ['Livro brasileiro que dói', 1, 9],
    ]);
  });

  it('"vazio" começa sem estante e sem histórico', async () => {
    const api = make({ seed: 'vazio' });
    expect((await api.getShelf()).books).toEqual([]);
    expect((await api.listSessions()).sessions).toEqual([]);
  });

  it('a primeira busca abre com os cards do protótipo que a pessoa ainda não julgou', async () => {
    const s = await make({ seed: 'vazio' }).createSession(NEW_SEARCH);
    expect(s.books.map((b) => b.id)).toEqual(PROTOTYPE_DECK);
  });
});

describe('estado salvo no aparelho', () => {
  it('a estante sobrevive a recriar a API com o mesmo armazenamento', async () => {
    const storage = memoryStore();
    const first = make({ seed: 'vazio', storage });
    const s = await first.createSession(NEW_SEARCH);
    await first.judge(s.session_id, s.books[0]?.id ?? '', 'love', JUDGED_AT);
    const again = make({ seed: 'vazio', storage });
    expect((await again.getShelf()).books.map((b) => b.id)).toEqual([s.books[0]?.id]);
  });

  it('estado corrompido recomeça do inicial', async () => {
    const storage = memoryStore({ 'lombada-fake-api': '{quebrado' });
    expect((await make({ seed: 'exemplo', storage }).getShelf()).books).toHaveLength(3);
  });

  it('reset volta ao inicial', async () => {
    const api = make({ seed: 'exemplo' });
    api.reset('vazio');
    expect((await api.getShelf()).books).toEqual([]);
  });
});

describe('cenários', () => {
  it('sem resultado: nenhum livro, três buscas vizinhas, e não entra no histórico', async () => {
    const api = make({ seed: 'vazio', scenario: 'sem-resultado' });
    const s = await api.createSession({ ...NEW_SEARCH, query: 'vampiro no sertão' });
    expect(s.books).toEqual([]);
    expect(s.nearby).toHaveLength(3);
    expect((await api.listSessions()).sessions).toEqual([]);
  });

  it('erro: a busca falha como falta de conexão, o resto funciona', async () => {
    const api = make({ scenario: 'erro' });
    await expect(api.createSession(NEW_SEARCH)).rejects.toSatisfy((e) => isApiError(e, 'network'));
    await expect(api.getShelf()).resolves.toBeTruthy();
  });

  it('offline: tudo falha como falta de conexão até voltar', async () => {
    const api = make({ scenario: 'offline' });
    await expect(api.getShelf()).rejects.toSatisfy((e) => isApiError(e, 'network'));
    api.setScenario('normal');
    await expect(api.getShelf()).resolves.toBeTruthy();
  });
});

describe('detalhes da API falsa', () => {
  it('os três primeiros cards chegam com "por que combina"; o resto vem por getWhy', async () => {
    const api = make({ seed: 'vazio' });
    const s = await api.createSession(NEW_SEARCH);
    expect(s.books.map((b) => b.why !== null)).toEqual([true, true, true, ...Array(7).fill(false)]);
    const ids = s.books.map((b) => b.id);
    const why = await api.getWhy(s.session_id, ids);
    for (const id of ids) expect(typeof why[id]).toBe('string');
  });

  it('o título das ideias muda à noite', async () => {
    const at = (h: number) => make({ now: () => new Date(2026, 10, 19, h) }).getIdeas();
    expect((await at(21)).title).toBe('Pra hoje à noite, eu iria de:');
    expect((await at(10)).title).toBe('Pra hoje, eu iria de:');
  });

  it('com o catálogo quase todo julgado, ainda devolve livros já vistos que não estão na estante', async () => {
    const api = make({ seed: 'vazio' });
    for (let i = 0; i < 6; i++) {
      const s = await api.createSession({ ...NEW_SEARCH, query: `rodada ${i}` });
      for (const b of s.books) await api.judge(s.session_id, b.id, 'pass', JUDGED_AT);
    }
    expect((await api.createSession(NEW_SEARCH)).books).toHaveLength(10);
  });

  it('a espera padrão da busca fica entre 1 e 6 s, e 9 s no cenário lento', () => {
    const at = (r: number) => defaultLatency(() => r);
    expect(at(0)('createSession', 'normal')).toBe(1000);
    expect(at(0.999)('createSession', 'normal')).toBeLessThan(6000);
    expect(at(0.5)('createSession', 'lento')).toBe(9000);
    expect(at(0.5)('getShelf', 'normal')).toBeLessThan(200);
  });
});
