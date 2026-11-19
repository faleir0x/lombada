import type { Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';
import { expect, test } from './fixtures';

/* Fase A6: a página Você. Pronto quando mudar um ♥ numa busca antiga muda a estante, a contagem da busca
   e o contador da home. */

const rows = (page: Page) => page.locator('.s-row');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function openYou(page: Page, state = 'exemplo') {
  await page.goto(`/voce?latencia=0&estado=${state}`);
  await expect(page.getByRole('region', { name: 'Você' })).toBeVisible();
}

test.describe('página Você', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`passa no axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openYou(page);
      await expect(rows(page)).toHaveCount(3);
      await expectNoA11yViolations(page);
    });
  }

  test('números, mascote e histórico do mais recente para o mais antigo', async ({ page }) => {
    await openYou(page);
    await expect(page.locator('.y-stats')).toContainText('30vistos');
    await expect(page.locator('.y-stats')).toContainText('3na estante');
    await expect(page.locator('.y-masc')).toContainText('Fantasma');
    await expect(rows(page).locator('.s-tx b')).toHaveText([
      'Igual Torto Arado',
      'Curto e devastador',
      'Livro brasileiro que dói',
    ]);
    await expect(rows(page).first()).toContainText('16 nov · 1 amado · 9 passados');
    await expect(rows(page).first().locator('.cover')).toHaveCount(1);
  });

  test('histórico vazio', async ({ page }) => {
    await openYou(page, 'vazio');
    await expect(page.locator('.y-empty')).toHaveText('Suas buscas aparecem aqui.');
    await expect(page.locator('.y-stats')).toContainText('0vistos');
  });

  test('uma busca nova entra no histórico depois do primeiro card julgado', async ({ page }) => {
    await page.goto('/?latencia=0&estado=vazio');
    const field = page.getByRole('textbox', { name: 'Conta seu humor, ou um livro que amou' });
    await field.fill('Curto e devastador');
    await field.press('Enter');
    await expect(page.locator('.k-count')).toHaveText('1 de 10');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.k-count')).toHaveText('2 de 10');
    await page.keyboard.press('Escape');
    await button(page, 'Perfil').click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('1 amado · 0 passados');
  });
});

test.describe('folha da busca', () => {
  test('mudar o ♥ muda a estante, a contagem da busca e o contador da home', async ({ page }) => {
    await openYou(page);
    const row = rows(page).first();
    await row.click();
    const dialog = page.getByRole('dialog', { name: 'Igual Torto Arado' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.gl li')).toHaveCount(10);
    await expectNoA11yViolations(page);
    const heart = dialog.getByRole('button', { name: 'Amei 1984' });
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog).toContainText('2 amados · 8 passados');
    await expect(row).toContainText('2 amados · 8 passados');
    await expect(row.locator('.cover')).toHaveCount(2);
    await expect(page.locator('.y-stats')).toContainText('4na estante');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(row).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button(page, 'Estante, 4 livros')).toBeVisible();
    await button(page, 'Estante, 4 livros').click();
    await expect(page.locator('.spine[data-id]').last()).toHaveAttribute('aria-label', /^1984/);
  });

  test('tirar o ♥ de um amado tira da estante', async ({ page }) => {
    await openYou(page);
    await rows(page).nth(1).click();
    const dialog = page.getByRole('dialog', { name: 'Curto e devastador' });
    await dialog.getByRole('button', { name: 'Amei A hora da estrela' }).click();
    await expect(dialog).toContainText('0 amados · 10 passados');
    await expect(page.locator('.y-stats')).toContainText('2na estante');
    await page.waitForTimeout(300);
    await page.reload();
    await expect(page.locator('.y-stats')).toContainText('2na estante');
  });

  test('"Buscar de novo" volta para a home e refaz a busca', async ({ page }) => {
    await openYou(page);
    await rows(page).nth(1).click();
    await button(page, 'Buscar de novo').click();
    await expect(page).toHaveURL(/\/baralho\//);
    await expect(page.locator('.k-q')).toHaveText('Curto e devastador');
  });
});
