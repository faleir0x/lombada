import { describe, expect, it } from 'vitest';
import { ask, cancelAsk, isFinished, judge, startDeck, undo } from './deck';

const fresh = (n = 10) => startDeck(Array(n).fill(null));

describe('baralho', () => {
  it('♥ guarda, ✕ passa, e o topo anda', () => {
    const a = judge(fresh(), 'love');
    expect(a?.judged).toEqual({ index: 0, result: 'love' });
    expect(a?.reaction).toEqual({ line: 'like', mood: 'happy' });
    const b = a && judge(a.state, 'pass');
    expect(b?.judged).toEqual({ index: 1, result: 'pass' });
    expect(b?.state.index).toBe(2);
  });

  it('no modo "já li", ♥ é "já li e amei" e ✕ é "já li e não curti"', () => {
    const loved = judge(ask(fresh()), 'love');
    expect(loved?.judged.result).toBe('read_loved');
    expect(loved?.reaction.line).toBe('loved');
    expect(loved?.state.asking).toBe(false);
    const disliked = judge(ask(fresh()), 'pass');
    expect(disliked?.judged.result).toBe('read_disliked');
    expect(disliked?.reaction.line).toBe('readNo');
  });

  it('sair do "já li" não desfaz nada', () => {
    const s = judge(fresh(), 'love')?.state;
    if (!s) throw new Error();
    const back = cancelAsk(ask(s));
    expect(back.history).toEqual(s.history);
    expect(back.asking).toBe(false);
  });

  it('três ✕ seguidos: o mascote pede outra busca, e a conta recomeça', () => {
    let s = fresh();
    const lines: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = judge(s, 'pass');
      if (!r) throw new Error();
      lines.push(r.reaction.line);
      s = r.state;
    }
    expect(lines).toEqual(['dislike', 'dislike', 'dislike3', 'dislike']);
  });

  it('um ♥ no meio zera a sequência de ✕', () => {
    let s = fresh();
    for (const g of ['pass', 'pass', 'love', 'pass', 'pass'] as const) s = judge(s, g)?.state ?? s;
    expect(s.passStreak).toBe(2);
  });

  it('desfazer volta o último card e tira do histórico', () => {
    const s = judge(judge(fresh(), 'love')?.state ?? fresh(), 'pass')?.state;
    if (!s) throw new Error();
    const u = undo(s);
    expect(u?.undone).toEqual({ index: 1, result: 'pass' });
    expect(u?.state.index).toBe(1);
    expect(u?.state.history).toEqual([{ index: 0, result: 'love' }]);
    expect(undo(fresh())).toBeNull();
  });

  it('o lote acaba no décimo, e não julga mais', () => {
    let s = fresh(2);
    s = judge(s, 'love')?.state ?? s;
    s = judge(s, 'pass')?.state ?? s;
    expect(isFinished(s)).toBe(true);
    expect(judge(s, 'love')).toBeNull();
    expect(ask(s).asking).toBe(false);
  });

  it('retoma uma busca começada no primeiro card sem julgamento', () => {
    const s = startDeck(['love', 'pass', null, null]);
    expect(s.index).toBe(2);
    expect(s.history.map((h) => h.result)).toEqual(['love', 'pass']);
    expect(isFinished(startDeck(['love', 'pass']))).toBe(true);
  });
});
