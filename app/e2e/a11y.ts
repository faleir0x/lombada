import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/* Regras WCAG 2.2 A e AA. Toda tela nova chama isto em cada estado. */
export async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}
