import type { Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';
import { expect, test } from './fixtures';

/* Página Mascote ("Palco", DESIGN.md §6): por cima da Você; trocar o mostrado não muda o escolhido; "Usar …"
   escolhe para o app inteiro, e a escolha fica salva. */

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const name = (page: Page) => page.locator('.mp-nm');

async function openMascot(page: Page) {
  await page.goto('/voce?latencia=0&estado=exemplo');
  await button(page, 'Mascote: Fantasma. Trocar').click();
  await expect(page).toHaveURL(/\/voce\/mascote/);
  await expect(page.getByRole('region', { name: 'Mascote' })).toBeFocused();
}

test.describe('página Mascote', () => {
  test('abre por cima da Você, mostra o atual "Em uso" e passa no axe', async ({ page }) => {
    await openMascot(page);
    await expect(name(page)).toHaveText('Fantasma');
    await expect(page.locator('.mp-cur')).toHaveText('Em uso');
    await expect(page.locator('.mp-bub')).toHaveText('Sou o livro que você não esquece.');
    await expect(button(page, 'Em uso')).toBeDisabled();
    await expect(page.locator('.you-main')).toHaveJSProperty('inert', true);
    await expectNoA11yViolations(page);
  });

  test('‹ › trocam o mostrado; nas pontas o foco passa para a outra seta (R12)', async ({ page }) => {
    await openMascot(page);
    const prev = button(page, 'Anterior');
    await prev.click();
    await expect(name(page)).toHaveText('Corvo');
    await expect(page.locator('.mp-cur')).toHaveText('Debochado. Coleciona o que brilha.');
    await prev.click();
    await prev.click();
    await expect(name(page)).toHaveText('Coruja');
    await expect(prev).toBeDisabled();
    await expect(button(page, 'Próximo')).toBeFocused();
    await expect(button(page, 'Usar a Coruja')).toBeEnabled();
  });

  test('← → e deslizar também trocam', async ({ page }) => {
    await openMascot(page);
    await page.keyboard.press('ArrowRight');
    await expect(name(page)).toHaveText('Traça');
    await page.keyboard.press('ArrowLeft');
    await expect(name(page)).toHaveText('Fantasma');
    const box = await page.locator('.mp-stage').boundingBox();
    if (!box) throw new Error('sem palco');
    await page.mouse.move(box.x + box.width * 0.7, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + 40, { steps: 4 });
    await page.mouse.up();
    await expect(name(page)).toHaveText('Traça');
  });

  test('"Usar o Corvo" escolhe para o app inteiro e a escolha fica salva', async ({ page }) => {
    await openMascot(page);
    await button(page, 'Anterior').click();
    await button(page, 'Usar o Corvo').click();
    await expect(page.locator('[data-announcer]')).toHaveText('Corvo escolhido.');
    await expect(button(page, 'Em uso')).toBeDisabled();
    await expect(button(page, 'Próximo')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/voce(\?|$)/);
    await expect(button(page, 'Mascote: Corvo. Trocar')).toBeFocused();
    await expect(page.locator('.y-chg')).toContainText('Corvo');
    await page.waitForTimeout(300);
    await page.goto('/');
    expect(await page.evaluate(() => localStorage.getItem('lombada-mascote'))).toBe('corvo');
    await page.evaluate(() => localStorage.removeItem('lombada-mascote'));
    await page.goto('/voce');
    // Sem a cópia do aparelho, a escolha volta da API.
    await expect(button(page, 'Mascote: Corvo. Trocar')).toBeVisible();
  });

  test('feminino: "Usar a Traça" e "Traça escolhida."', async ({ page }) => {
    await openMascot(page);
    await button(page, 'Próximo').click();
    await button(page, 'Usar a Traça').click();
    await expect(page.locator('[data-announcer]')).toHaveText('Traça escolhida.');
  });

  test('aberta direto pelo link, o Voltar leva para a Você', async ({ page }) => {
    await page.goto('/voce/mascote?latencia=0');
    await expect(page.getByRole('region', { name: 'Mascote' })).toBeVisible();
    await button(page, 'Voltar').last().click();
    await expect(page).toHaveURL(/\/voce(\?|$)/);
    await expect(page.getByRole('region', { name: 'Você' })).toBeVisible();
  });
});
