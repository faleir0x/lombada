import { FAKE_SCENARIOS, type FakeScenario, type FakeSeed } from '../core/fake/fakeApi';

/* Parâmetros da URL que controlam a API falsa, para chegar em qualquer estado do DESIGN.md §7:
   ?cenario=sem-resultado|erro|lento|offline   como a API responde
   ?estado=vazio|exemplo                        recomeça desse estado (apaga o salvo)
   ?latencia=0                                  sem espera simulada (testes de ponta a ponta) */

export interface FakeParams {
  scenario: FakeScenario;
  resetTo: FakeSeed | null;
  instant: boolean;
}

export function parseFakeParams(search: string): FakeParams {
  const p = new URLSearchParams(search);
  const scenario = p.get('cenario');
  const seed = p.get('estado');
  return {
    scenario: FAKE_SCENARIOS.includes(scenario as FakeScenario) ? (scenario as FakeScenario) : 'normal',
    resetTo: seed === 'vazio' || seed === 'exemplo' ? seed : null,
    instant: p.get('latencia') === '0',
  };
}
