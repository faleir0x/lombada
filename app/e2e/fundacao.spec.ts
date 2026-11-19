import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

const BG = { light: 'rgb(236, 233, 228)', dark: 'rgb(20, 20, 18)' } as const;

for (const scheme of ['light', 'dark'] as const) {
  test(`segue o tema do sistema (${scheme}) e passa no axe`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('body')).toHaveCSS('background-color', BG[scheme]);
    await expectNoA11yViolations(page);
  });
}

test('o tema escolhido vence o do sistema', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('lombada-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', BG.dark);
});

test('as fontes vêm do próprio app, não do Google Fonts', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://127.0.0.1:4173')) external.push(r.url());
  });
  await page.goto('/');
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('400 1rem "Newsreader Variable"'),
      document.fonts.load('400 1rem "Hanken Grotesk Variable"'),
    ]);
    return [
      document.fonts.check('400 1rem "Newsreader Variable"'),
      document.fonts.check('400 1rem "Hanken Grotesk Variable"'),
    ];
  });
  expect(loaded).toEqual([true, true]);
  await expect(page.getByRole('heading', { name: 'lombada' })).toHaveCSS(
    'font-family',
    /Newsreader Variable/,
  );
  expect(external).toEqual([]);
});
