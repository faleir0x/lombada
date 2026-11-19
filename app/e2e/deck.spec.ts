import type { Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';
import { expect, test } from './fixtures';

/* Fase A4: o baralho. Pronto quando dá para julgar os dez só com o dedo, só com o teclado e só com
   leitor de tela, e o contador da home acompanha. */

const count = (page: Page) => page.locator('.k-count');
const status = (page: Page) => page.locator('[data-announcer]');
const topCard = (page: Page) => page.locator('.k-cw[data-depth="0"]');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function openDeck(page: Page, params = '') {
  await page.goto(`/?latencia=0&estado=vazio${params}`);
  const field = page.getByRole('textbox', { name: 'Conta seu humor, ou um livro que amou' });
  await field.fill('Curto e devastador');
  await field.press('Enter');
  await expect(count(page)).toHaveText('1 de 10');
  // A entrada "Do livro" ainda está trazendo as cartas; arrastar antes disso pega o lugar errado.
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('.k-cw').length)).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(() => [...document.querySelectorAll('.k-cw')].some((c) => c.getAnimations().length > 0)),
    )
    .toBe(false);
}

async function drag(page: Page, dx: number, dy: number) {
  const box = await topCard(page).boundingBox();
  if (!box) throw new Error('sem card');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
}

test.describe('baralho', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`passa no axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openDeck(page);
      await expectNoA11yViolations(page);
    });
  }

  test('só com o teclado: ← → julgam os dez e o resumo aparece', async ({ page }) => {
    await openDeck(page);
    for (let i = 1; i <= 10; i++) {
      await page.keyboard.press(i % 3 === 0 ? 'ArrowRight' : 'ArrowLeft');
      if (i < 10) await expect(count(page)).toHaveText(`${i + 1} de 10`);
    }
    await expect(page.getByRole('list', { name: 'Resumo do baralho' }).getByRole('listitem')).toHaveCount(10);
    await expect(page.locator('.k-sumh')).toHaveText('3 amados · 7 passados');
    await expectNoA11yViolations(page);
  });

  test('só com leitor de tela: botões, anúncios e o foco no resumo no fim (R12)', async ({ page }) => {
    await openDeck(page);
    await expect(status(page)).toContainText('1 de 10');
    for (let i = 1; i <= 10; i++) {
      await button(page, i % 2 ? 'Guardar na estante' : 'Passar').click();
      if (i < 10) await expect(status(page)).toContainText(`${i + 1} de 10:`);
    }
    await expect(status(page)).toContainText('5 amados · 5 passados');
    await expect(page.locator('.gl .hb').first()).toBeFocused();
  });

  test('só com o dedo: arrastar julga, toque gira, para cima é "já li"', async ({ page }) => {
    await openDeck(page);
    await drag(page, 220, 0);
    await expect(count(page)).toHaveText('2 de 10');
    await drag(page, -220, 0);
    await expect(count(page)).toHaveText('3 de 10');
    await drag(page, 40, 0);
    await expect(count(page)).toHaveText('3 de 10');
    await topCard(page).click();
    await expect(topCard(page)).toHaveAttribute('data-flipped', 'true');
    await drag(page, 0, -180);
    await expect(button(page, 'Sair do já li')).toBeVisible();
    for (let i = 3; i <= 10; i++) {
      await drag(page, 220, 0);
      if (i < 10) await expect(count(page)).toHaveText(`${i + 1} de 10`);
    }
    await expect(page.getByRole('list', { name: 'Resumo do baralho' })).toBeVisible();
  });

  test('"já li": ♥ vira "já li e amei", vai para a estante com 👍 e o resumo diz "já lido"', async ({
    page,
  }) => {
    await openDeck(page);
    const read = button(page, 'Já li esse');
    await read.click();
    await expect(button(page, 'Sair do já li')).toBeFocused();
    await expect(read).toBeDisabled();
    await expectNoA11yViolations(page);
    await button(page, 'Já li e amei').click();
    await expect(count(page)).toHaveText('2 de 10');
    await expect(button(page, 'Guardar na estante')).toBeVisible();
    for (let i = 2; i <= 10; i++) await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.gl li').first()).toContainText('já lido');
    await expect(page.locator('.gl .hb').first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('Esc no "já li" só sai do modo; outro Esc fecha o baralho', async ({ page }) => {
    await openDeck(page);
    await page.keyboard.press('ArrowUp');
    await expect(button(page, 'Sair do já li')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(button(page, 'Desfazer')).toBeVisible();
    await expect(page).toHaveURL(/\/baralho\//);
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/\/baralho\//);
    await expect(page.getByRole('textbox', { name: 'Conta seu humor, ou um livro que amou' })).toBeFocused();
  });

  test('desfazer traz o card de volta; sem histórico, o foco vai para o card (R12)', async ({ page }) => {
    await openDeck(page);
    await expect(button(page, 'Desfazer')).toBeDisabled();
    await button(page, 'Guardar na estante').click();
    await expect(count(page)).toHaveText('2 de 10');
    const undo = button(page, 'Desfazer');
    await undo.click();
    await expect(count(page)).toHaveText('1 de 10');
    await expect(undo).toBeDisabled();
    await expect(topCard(page)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(count(page)).toHaveText('2 de 10');
    await page.keyboard.press('z');
    await expect(count(page)).toHaveText('1 de 10');
  });

  test('o contador da home acompanha, e mudar o ♥ no resumo também', async ({ page }) => {
    await openDeck(page);
    for (let i = 1; i <= 10; i++) await page.keyboard.press(i <= 2 ? 'ArrowRight' : 'ArrowLeft');
    const hearts = page.locator('.gl .hb');
    await expect(hearts).toHaveCount(10);
    await expect(page.locator('.k-sumh')).toHaveText('2 amados · 8 passados');
    await hearts.nth(5).click();
    await expect(hearts.nth(5)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.k-sumh')).toHaveText('3 amados · 7 passados');
    await expect(status(page)).toHaveText('Sabia que esse ia voltar.');
    await hearts.nth(0).click();
    await expect(page.locator('.k-sumh')).toHaveText('2 amados · 8 passados');
    await button(page, 'Nova busca').click();
    await expect(page.getByRole('textbox', { name: 'Conta seu humor, ou um livro que amou' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Estante, 2 livros' })).toBeVisible();
  });

  test('"Mais dez" abre outro lote na mesma página, sem repetir livros', async ({ page }) => {
    await openDeck(page);
    const first = await topCard(page).locator('h3').first().textContent();
    for (let i = 1; i <= 10; i++) await page.keyboard.press('ArrowLeft');
    await button(page, 'Mais dez').click();
    await expect(count(page)).toHaveText('1 de 10');
    await expect(topCard(page).locator('h3').first()).not.toHaveText(first ?? '');
    await page.getByRole('button', { name: 'Voltar' }).first().click();
    await expect(page).not.toHaveURL(/\/baralho\//);
  });

  test('recarregar no meio do baralho continua de onde parou', async ({ page }) => {
    await openDeck(page);
    for (let i = 1; i <= 3; i++) {
      await page.keyboard.press('ArrowLeft');
      await expect(count(page)).toHaveText(`${i + 1} de 10`);
    }
    await page.waitForTimeout(400);
    await page.reload();
    await expect(count(page)).toHaveText('4 de 10');
  });

  test('capa: a gerada aparece na hora e a foto entra por cima quando carrega (R13)', async ({ page }) => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    await page.route('**/capa-exemplo.svg', async (route) => {
      await gate;
      await route.continue();
    });
    await openDeck(page, '&capas=foto');
    const photo = topCard(page).locator('.cover-photo');
    await expect(topCard(page).locator('.k-cover')).toBeVisible();
    await expect(photo).toHaveAttribute('data-state', 'loading');
    release();
    await expect(photo).toHaveAttribute('data-state', 'in');
  });

  test('com movimento reduzido, o card sai na hora', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDeck(page);
    await page.keyboard.press('ArrowRight');
    await expect(count(page)).toHaveText('2 de 10', { timeout: 300 });
  });
});
