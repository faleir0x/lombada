import type { Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';
import { expect, test } from './fixtures';

/* Fase A3: a home, com os estados do DESIGN.md §7. A API falsa responde na hora (?latencia=0) e os
   cenários vêm pela URL. */

const field = (page: Page) => page.getByRole('textbox', { name: 'Conta seu humor, ou um livro que amou' });
const bubble = (page: Page) => page.locator('.a-say .bubble');
const status = (page: Page) => page.locator('[data-announcer]');

async function searchFor(page: Page, text: string) {
  await field(page).fill(text);
  await field(page).press('Enter');
}

test.describe('home', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`passa no axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await expect(bubble(page)).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }

  test('o contador da estante mostra o número e some em zero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Estante, 3 livros' })).toBeVisible();
    await expect(page.locator('.a-badge')).toHaveText('3');
    await page.goto('/?estado=vazio');
    await expect(page.getByRole('button', { name: 'Estante vazia' })).toBeVisible();
    await expect(page.locator('.a-badge')).toHaveCount(0);
  });

  test('envio vazio: o mascote pede alguma coisa e o leitor de tela ouve', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(bubble(page)).toHaveText('Escreve qualquer coisa, ou me pede uma ideia.');
    await expect(status(page)).toHaveText('Escreve qualquer coisa, ou me pede uma ideia.');
  });

  test('Enter busca e o baralho abre; o campo esvazia', async ({ page }) => {
    await page.goto('/?latencia=0');
    await searchFor(page, 'algo curto e triste');
    await expect(page).toHaveURL(/\/baralho\/s_\d+/);
    await expect(page.getByRole('region', { name: 'Baralho' })).toBeVisible();
    await expect(status(page)).toHaveText(/dez/i);
    await page.keyboard.press('Escape');
    await expect(field(page)).toHaveValue('');
  });

  test('Shift+Enter quebra linha e o campo cresce até 4 linhas', async ({ page }) => {
    await page.goto('/');
    const f = field(page);
    await f.click();
    for (const line of ['um', 'dois', 'três', 'quatro', 'cinco', 'seis']) {
      await page.keyboard.type(line);
      await page.keyboard.press('Shift+Enter');
    }
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/(\?.*)?$/);
    const { height, scrollHeight } = await f.evaluate((el) => ({
      height: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));
    expect(height).toBeGreaterThan(46);
    expect(height).toBeLessThanOrEqual(Math.ceil(17 * 1.3 * 4 + 24) + 1);
    expect(scrollHeight).toBeGreaterThan(height);
  });

  test('ideias: três com motivo, "Outras" traz outras, "Fechar" volta', async ({ page }) => {
    await page.goto('/?latencia=0');
    await page.getByRole('button', { name: 'Pedir uma ideia' }).click();
    const rows = bubble(page).locator('.b-row');
    await expect(rows).toHaveCount(3);
    const first = await rows.allInnerTexts();
    await expect(status(page)).toContainText('Igual Torto Arado');
    await page.getByRole('button', { name: 'Outras' }).click();
    await expect(rows.first()).not.toHaveText(first[0] ?? '');
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(rows).toHaveCount(0);
  });

  test('tocar numa ideia faz a busca', async ({ page }) => {
    await page.goto('/?latencia=0');
    await page.getByRole('button', { name: 'Pedir uma ideia' }).click();
    await bubble(page)
      .getByRole('button', { name: /Igual Torto Arado/ })
      .click();
    await expect(page).toHaveURL(/\/baralho\//);
  });

  test('busca demorando: lendo, depois o comentário de demora', async ({ page }) => {
    await page.goto('/?cenario=lento');
    await searchFor(page, 'Curto e devastador');
    await expect(page.locator('.mascot')).toBeVisible();
    await expect(status(page)).not.toHaveText('');
    const reading = (await status(page).textContent()) ?? '';
    await expect(status(page)).not.toHaveText(reading, { timeout: 4000 });
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/(\?.*)?$/);
  });

  test('erro de rede: frase com ícone e "Tentar de novo" com o campo vazio', async ({ page }) => {
    await page.goto('/?cenario=erro&latencia=0');
    await searchFor(page, 'Curto e devastador');
    await expect(bubble(page)).toContainText('Perdi a conexão no meio da busca. Tenta de novo?');
    await expect(status(page)).toHaveText('Perdi a conexão no meio da busca. Tenta de novo?');
    await expect(field(page)).toHaveValue('');
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(bubble(page)).toContainText('Perdi a conexão');
    await expectNoA11yViolations(page);
  });

  test('sem resultado: cita a busca e traz três buscas vizinhas, sem "Outras"', async ({ page }) => {
    await page.goto('/?cenario=sem-resultado&latencia=0');
    await searchFor(page, 'vampiro no sertão');
    await expect(bubble(page)).toContainText('“vampiro no sertão” eu não tenho. Chega perto?');
    await expect(bubble(page).locator('.b-row')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Outras' })).toHaveCount(0);
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/(\?.*)?$/);
    await expectNoA11yViolations(page);
  });

  test('o abajur troca o tema e o mascote comenta', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Acender o abajur (modo noite)' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(bubble(page)).toHaveText(/Clima de leitura|Luz baixa/);
  });

  test('parado: puxa conversa aos 10 s, dorme aos 20 s e acorda com um toque', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await expect(bubble(page)).toBeVisible();
    await page.clock.runFor(11_000);
    await expect(bubble(page)).toHaveText(/ideia|humor|título|amou/);
    await page.clock.runFor(10_000);
    await expect(bubble(page)).toHaveAttribute('data-hidden', 'true');
    await page.mouse.click(30, 300);
    await expect(bubble(page)).toHaveAttribute('data-hidden', 'false');
    await expect(bubble(page)).toHaveText(/Opa|dormindo|Voltei/);
  });
});

test.describe('primeira visita', () => {
  test.use({ visit: { onboardingSeen: false, openedThisSession: false } });

  test('três telas, "Começar" leva à home e não volta mais', async ({ page }) => {
    await page.goto('/');
    const onboarding = page.getByRole('region', { name: 'Boas-vindas' });
    await expect(onboarding).toContainText('Tela 1 de 3.');
    await expectNoA11yViolations(page);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(onboarding).toContainText('Tela 2 de 3.');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(onboarding).toContainText('Direita pra guardar, esquerda pra passar.');
    await page.getByRole('button', { name: 'Começar' }).click();
    await expect(onboarding).toBeHidden();
    await expect(bubble(page)).toHaveText('Largou mais um no capítulo 3?');
    await page.reload();
    await expect(page.getByRole('region', { name: 'Boas-vindas' })).toBeHidden();
  });

  test('"Pular" vai direto para a home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Pular' }).click();
    await expect(page.getByRole('region', { name: 'Boas-vindas' })).toBeHidden();
    await expect(field(page)).toBeVisible();
  });

  test('deslizar troca de tela', async ({ page }) => {
    await page.goto('/');
    const onboarding = page.getByRole('region', { name: 'Boas-vindas' });
    const box = await onboarding.boundingBox();
    if (!box) throw new Error('sem caixa');
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 5 });
    await page.mouse.up();
    await expect(onboarding).toContainText('Tela 2 de 3.');
  });
});

test.describe('entrada "Acender"', () => {
  test.use({ visit: { onboardingSeen: true, openedThisSession: false } });

  test('só na primeira abertura da sessão, e a tela fica completa sem ela', async ({ page }) => {
    await page.goto('/');
    await expect
      .poll(() => page.locator('.a-dock').evaluate((el) => el.getAnimations().length))
      .toBeGreaterThan(0);
    await page.reload();
    await page.waitForTimeout(300);
    expect(await page.locator('.a-dock').evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(field(page)).toBeVisible();
  });
});
