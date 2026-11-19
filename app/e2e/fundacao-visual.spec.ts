import { expect, type Page, test } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

/* Fase A2: peças da fundação visual, pela vitrine (/vitrine) e pela home provisória. */

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });

test.describe('vitrine', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const motion of ['no-preference', 'reduce'] as const) {
      test(`passa no axe (${scheme}, movimento ${motion})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion });
        await page.goto('/vitrine');
        await expect(page.getByRole('heading', { name: 'Vitrine' })).toBeVisible();
        await expect(page.locator('.mascot svg')).toBeVisible();
        await expectNoA11yViolations(page);
      });
    }
  }

  test('o mascote usa IDs de SVG com prefixo e sem repetir (R8)', async ({ page }) => {
    await page.goto('/vitrine');
    await expect(page.locator('.mascot svg')).toBeVisible();
    const ids = await page.locator('svg [id]').evaluateAll((els) => els.map((e) => e.id));
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^mascote-\d+$/);
  });

  test('a região anunciada recebe o texto (R9)', async ({ page }) => {
    await page.goto('/vitrine');
    await button(page, /Anunciar/).click();
    await expect(page.getByRole('status')).toHaveText('Lendo as orelhas.');
  });

  test('o ♥ marca e desmarca com aria-pressed', async ({ page }) => {
    await page.goto('/vitrine');
    const heart = button(page, 'Amei Torto Arado');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('folha (R7)', () => {
  test('abre como diálogo, prende o fundo e devolve o foco no Esc', async ({ page }) => {
    await page.goto('/vitrine');
    const opener = button(page, 'Abrir a folha');
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Livro' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(page.locator('.app-home')).toHaveJSProperty('inert', true);
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('.app-home')).toHaveJSProperty('inert', false);
    await expect(opener).toBeFocused();
  });

  test('toque fora fecha', async ({ page }) => {
    await page.goto('/vitrine');
    await button(page, 'Abrir a folha').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('.a-scrim').click({ position: { x: 20, y: 20 } });
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

test.describe('páginas e Paralaxe', () => {
  test('a estante abre por cima da home e o Voltar devolve o foco', async ({ page }) => {
    await page.goto('/');
    const shelf = button(page, 'Estante');
    await shelf.click();
    await expect(page).toHaveURL(/\/estante$/);
    const region = page.getByRole('region', { name: 'Sua estante' });
    await expect(region).toBeVisible();
    await expect(region).toBeFocused();
    await expect(page.locator('.app-home')).toHaveJSProperty('inert', true);
    await expectNoA11yViolations(page);
    await button(page, 'Voltar').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(region).toBeHidden();
    await expect(shelf).toBeFocused();
  });

  test('Esc e o voltar do navegador também fecham', async ({ page }) => {
    await page.goto('/');
    await button(page, 'Perfil').click();
    await expect(page.getByRole('region', { name: 'Você' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
    await button(page, 'Estante').click();
    await expect(page.getByRole('region', { name: 'Sua estante' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('region', { name: 'Sua estante' })).toBeHidden();
  });

  test('aberta direto pelo link, o Voltar leva para a home', async ({ page }) => {
    await page.goto('/estante');
    await expect(page.getByRole('region', { name: 'Sua estante' })).toBeVisible();
    await button(page, 'Voltar').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'lombada' })).toBeVisible();
  });

  test('a folha fecha antes da página no Esc', async ({ page }) => {
    await page.goto('/vitrine');
    await button(page, 'Abrir a estante').click();
    await expect(page.getByRole('region', { name: 'Sua estante' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/vitrine$/);
    await expect(page.getByRole('heading', { name: 'Vitrine' })).toBeVisible();
  });

  test('com movimento reduzido, a página só aparece em fade', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await button(page, 'Estante').click();
    const kinds = await page
      .locator('.a-page')
      .evaluate((el) =>
        el.getAnimations().flatMap((a) => Object.keys((a.effect as KeyframeEffect).getKeyframes()[0] ?? {})),
      );
    expect(kinds).not.toContain('transform');
  });
});

test.describe('tema', () => {
  test('o abajur troca dia e noite e a escolha fica salva', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await button(page, 'Acender o abajur (modo noite)').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(button(page, 'Apagar o abajur (modo dia)')).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('botões "Mola + ícone"', () => {
  test('o botão aperta e o ícone faz o gesto', async ({ page }) => {
    await page.goto('/vitrine');
    const heart = button(page, 'Guardar na estante');
    await heart.hover();
    await page.mouse.down();
    expect(await heart.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
    await page.mouse.up();
    expect(
      await heart.evaluate((el) => el.querySelector('.ico')?.getAnimations().length ?? 0),
    ).toBeGreaterThan(0);
  });

  test('com movimento reduzido, nada anima', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/vitrine');
    const heart = button(page, 'Guardar na estante');
    await heart.click();
    // O fundo do hover pode fazer fade (é cor, não movimento); nada pode mexer em transform.
    const moving = await heart.evaluate((el) =>
      el
        .getAnimations({ subtree: true })
        .filter((a) => !(a instanceof CSSTransition))
        .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes())
        .filter((k) => 'transform' in k),
    );
    expect(moving).toEqual([]);
  });

  test('botão desativado não anima', async ({ page }) => {
    await page.goto('/vitrine');
    const disabled = button(page, 'Já li (desativado)');
    await disabled.dispatchEvent('pointerdown');
    expect(await disabled.evaluate((el) => el.getAnimations().length)).toBe(0);
  });
});
