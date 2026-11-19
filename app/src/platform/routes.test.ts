import { describe, expect, it } from 'vitest';
import { parseRoute, type Route, routePath } from './routes';

describe('rotas', () => {
  const cases: [string, Route][] = [
    ['/', { name: 'home' }],
    ['/estante', { name: 'estante' }],
    ['/estante/', { name: 'estante' }],
    ['/voce', { name: 'voce' }],
    ['/voce/mascote', { name: 'mascote' }],
    ['/vitrine', { name: 'vitrine' }],
    ['/baralho/s_12', { name: 'baralho', sessionId: 's_12' }],
  ];
  for (const [path, route] of cases) {
    it(`${path} ↔ ${route.name}`, () => {
      expect(parseRoute(path)).toEqual(route);
      expect(parseRoute(routePath(route))).toEqual(route);
    });
  }

  it('caminho desconhecido é null', () => {
    expect(parseRoute('/nada')).toBeNull();
    expect(parseRoute('/baralho')).toBeNull();
    expect(parseRoute('/baralho/%E0%A4%A')).toBeNull();
  });
});
