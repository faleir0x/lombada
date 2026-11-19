import type { Api } from '../core/api/api';
import { createFakeApi, type FakeApi } from '../core/fake/fakeApi';
import { parseFakeParams } from './fakeParams';
import { localStore } from './localStore';

/* A Api que o app usa. Até a fase B é a falsa, salva no localStorage e controlada pela URL
   (ver fakeParams.ts). Trocar pela real é trocar esta função. */
export function createAppApi(search: string = location.search): FakeApi {
  const params = parseFakeParams(search);
  const api = createFakeApi({
    storage: localStore(),
    scenario: params.scenario,
    ...(params.instant ? { latency: () => 0 } : {}),
  });
  if (params.resetTo) api.reset(params.resetTo);
  return api;
}

export type { Api };
