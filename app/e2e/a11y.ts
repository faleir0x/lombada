import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/* Regras WCAG 2.2 A e AA. Toda tela nova chama isto em cada estado.
   Espera as animações com fim (entradas, "Um por um", folhas) terminarem: no meio delas, peças ainda
   se sobrepõem e o axe acusaria alvos de toque pequenos que não existem na tela parada. */
export async function expectNoA11yViolations(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity,
              ).length,
        ),
      { timeout: 5000 },
    )
    .toBe(0);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}
