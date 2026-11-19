import { describe, expect, it } from 'vitest';
import { parseFakeParams } from './fakeParams';

describe('parâmetros da URL', () => {
  it('lê cenário, estado e latência', () => {
    expect(parseFakeParams('?cenario=sem-resultado&estado=vazio&latencia=0')).toEqual({
      scenario: 'sem-resultado',
      resetTo: 'vazio',
      instant: true,
    });
  });

  it('ignora valores desconhecidos', () => {
    expect(parseFakeParams('?cenario=caos&estado=cheio')).toEqual({
      scenario: 'normal',
      resetTo: null,
      instant: false,
    });
  });
});
