import { describe, expect, it } from 'vitest';
import { layoutShelf, moveItem, placeLine, shelfLine, spineHeight, spineWidth } from './shelf';

describe('estante', () => {
  it('lombada de 30, 36 ou 46px pelo título', () => {
    expect(spineWidth('Duna')).toBe(30);
    expect(spineWidth('Torto Arado')).toBe(30);
    expect(spineWidth('Vidas secas!')).toBe(36);
    expect(spineWidth('O apanhador no campo de centeio')).toBe(46);
  });

  it('altura estável entre 118 e 176px', () => {
    for (const [id, t] of [
      ['a', 'Curto'],
      ['b', 'Um título bem comprido para ganhar mais'],
    ]) {
      const h = spineHeight(id as string, t as string);
      expect(h).toBe(spineHeight(id as string, t as string));
      expect(h).toBeGreaterThanOrEqual(118);
      expect(h).toBeLessThanOrEqual(176);
    }
  });

  it('quebra as prateleiras pela largura e guarda até 2 espaços na última', () => {
    const l = layoutShelf([30, 30, 30, 30], 70);
    expect(l.rows.flat()).toEqual([0, 1, 2, 3]);
    const wide = layoutShelf([30, 36, 46], 354);
    expect(wide.rows).toEqual([[0, 1, 2]]);
    expect(wide.slots).toBe(2);
    const narrow = layoutShelf(Array(12).fill(30), 200);
    expect(narrow.rows.map((r) => r.length)).toEqual([6, 6]);
    for (const row of narrow.rows) expect(row.length * 33).toBeLessThanOrEqual(200);
  });

  it('estante vazia: uma prateleira só com até 4 espaços', () => {
    expect(layoutShelf([], 354)).toEqual({ rows: [[]], slots: 4 });
  });

  it('mudar de lugar e os outros andam', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['b', 'a']);
  });

  it('falas da quantidade e do lugar', () => {
    expect(shelfLine(0)).toBe('Tô esperando o primeiro.');
    expect(shelfLine(1)).toBe('1 livro. Bom começo.');
    expect(shelfLine(3)).toBe('3 livros. Bom começo.');
    expect(shelfLine(12)).toBe('12 livros. Tá ficando bonita.');
    expect(shelfLine(40)).toBe('40 livros. Isso já é um sebo.');
    expect(placeLine('Torto Arado', 3)).toBe('Torto Arado: 3º lugar.');
  });
});
