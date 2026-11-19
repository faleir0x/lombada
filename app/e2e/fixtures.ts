import { test as base, expect } from '@playwright/test';

/* Base dos testes: por padrão, a pessoa já viu o onboarding e o app já abriu nesta sessão (sem a entrada
   "Acender"), para cada teste começar na home pronta. Quem testa a primeira visita muda com test.use. */

export interface Visit {
  onboardingSeen: boolean;
  openedThisSession: boolean;
}

export const test = base.extend<{ visit: Visit }>({
  visit: [{ onboardingSeen: true, openedThisSession: true }, { option: true }],
  page: async ({ page, visit }, use) => {
    await page.addInitScript((v: Visit) => {
      // Só na primeira carga da aba: um reload deve ver o que o app gravou.
      if (sessionStorage.getItem('e2e-init')) return;
      sessionStorage.setItem('e2e-init', '1');
      if (v.onboardingSeen) localStorage.setItem('lombada-boas-vindas', '1');
      if (v.openedThisSession) sessionStorage.setItem('lombada-aberto', '1');
    }, visit);
    await use(page);
  },
});

export { expect };
