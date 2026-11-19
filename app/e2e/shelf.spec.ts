import type { Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';
import { expect, test } from './fixtures';

/* Fase A5: a estante e o detalhe. A mesma reordenação dá certo por arrasto, por ‹ › e por teclado (R11),
   e a ordem sobrevive ao recarregar. */

const spines = (page: Page) => page.locator('.p-shelves .spine[data-id]');
const order = async (page: Page) =>
  (await spines(page).evaluateAll((els) =>
    els.map((e) => e.querySelector('span')?.textContent ?? ''),
  )) as string[];
const status = (page: Page) => page.locator('[data-announcer]');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const ABC = ['Torto Arado', 'A hora da estrela', 'O avesso da pele'];

async function openShelf(page: Page, state = 'exemplo') {
  await page.goto(`/estante?latencia=0&estado=${state}`);
  await expect(page.getByRole('region', { name: 'Sua estante' })).toBeVisible();
  if (state !== 'vazio') await expect(spines(page).first()).toBeVisible();
}

test.describe('estante', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`passa no axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openShelf(page);
      await expectNoA11yViolations(page);
    });
  }

  test('mostra a quantidade e a fala do mascote', async ({ page }) => {
    await openShelf(page);
    await expect(page.locator('.p-top span')).toHaveText('3 livros');
    await expect(page.locator('.p-bub')).toHaveText('3 livros. Bom começo.');
    expect(await order(page)).toEqual(ABC);
    await expect(page.locator('.slot')).toHaveCount(2);
  });

  test('vazia: espaços tracejados e "Buscar um livro" volta com o foco na busca', async ({ page }) => {
    await openShelf(page, 'vazio');
    await expect(page.getByRole('heading', { name: 'Estante vazia, por enquanto.' })).toBeVisible();
    await expect(page.locator('.p-bub')).toHaveText('Tô esperando o primeiro.');
    await expect(page.locator('.slot')).toHaveCount(4);
    await expectNoA11yViolations(page);
    await button(page, 'Buscar um livro').click();
    await expect(page.getByRole('textbox', { name: 'Conta seu humor, ou um livro que amou' })).toBeFocused();
  });

  test('cheia: 40 livros e nenhum título cortado (R1)', async ({ page }) => {
    await openShelf(page, 'cheia');
    await expect(spines(page)).toHaveCount(40);
    const cut = await spines(page).evaluateAll((els) =>
      els
        .filter((el) => {
          const s = el.getBoundingClientRect();
          const t = el.querySelector('span')?.getBoundingClientRect();
          return (
            !t || t.top < s.top - 1 || t.bottom > s.bottom + 1 || t.left < s.left - 1 || t.right > s.right + 1
          );
        })
        .map((el) => el.getAttribute('aria-label')),
    );
    expect(cut).toEqual([]);
    await expectNoA11yViolations(page);
  });

  test('"Um por um": os livros chegam ao abrir; com movimento reduzido, já estão no lugar', async ({
    page,
  }) => {
    await openShelf(page);
    await expect
      .poll(() =>
        spines(page)
          .first()
          .evaluate((el) => el.getAnimations().length),
      )
      .toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(spines(page).first()).toBeVisible();
    await page.waitForTimeout(400);
    expect(
      await spines(page)
        .first()
        .evaluate((el) => el.getAnimations().length),
    ).toBe(0);
  });
});

test.describe('detalhe do livro', () => {
  test('é um diálogo com dados, origem e posição; Esc fecha antes da página', async ({ page }) => {
    await openShelf(page);
    await spines(page).first().click();
    const dialog = page.getByRole('dialog', { name: 'Livro' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Torto Arado');
    await expect(dialog).toContainText('Da busca “Livro brasileiro que dói”');
    await expect(dialog).toContainText('1º de 3 na estante');
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(spines(page).first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/\/estante/);
  });

  test('"Depois de ler": 👍 marca e desmarca, e fica salvo', async ({ page }) => {
    await openShelf(page);
    await spines(page).first().click();
    const up = button(page, 'Gostei');
    await up.click();
    await expect(up).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.p-bub')).toHaveText(/Anotado|Boa/);
    await page.waitForTimeout(300);
    await page.reload();
    await spines(page).first().click();
    await expect(button(page, 'Gostei')).toHaveAttribute('aria-pressed', 'true');
    await button(page, 'Gostei').click();
    await expect(button(page, 'Gostei')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a lixeira tira da estante e o foco vai para o vizinho (R12)', async ({ page }) => {
    await openShelf(page);
    await spines(page).first().click();
    await button(page, 'Tirar da estante').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await order(page)).toEqual(ABC.slice(1));
    await expect(page.locator('.p-top span')).toHaveText('2 livros');
    await expect(spines(page).first()).toBeFocused();
    await page.waitForTimeout(300);
    await page.reload();
    expect(await order(page)).toEqual(ABC.slice(1));
  });

  test('"Buscar parecidos" volta para a home e busca "Igual …"', async ({ page }) => {
    await openShelf(page);
    await spines(page).first().click();
    await button(page, 'Buscar parecidos').click();
    await expect(page).toHaveURL(/\/baralho\//);
    await expect(page.locator('.k-q')).toHaveText('Igual Torto Arado');
  });
});

test.describe('mudar a ordem (R11)', () => {
  test('pelo detalhe, com ‹ ›, e na ponta o foco vai para o outro botão', async ({ page }) => {
    await openShelf(page);
    await spines(page).first().click();
    const forward = button(page, 'Uma posição para a frente');
    await forward.click();
    await expect(page.getByRole('dialog')).toContainText('2º de 3 na estante');
    await expect(status(page)).toHaveText('Torto Arado: 2º lugar.');
    await forward.click();
    await expect(page.getByRole('dialog')).toContainText('3º de 3 na estante');
    await expect(forward).toBeDisabled();
    await expect(button(page, 'Uma posição para trás')).toBeFocused();
    await page.keyboard.press('Escape');
    expect(await order(page)).toEqual(['A hora da estrela', 'O avesso da pele', 'Torto Arado']);
    await page.waitForTimeout(300);
    await page.reload();
    expect(await order(page)).toEqual(['A hora da estrela', 'O avesso da pele', 'Torto Arado']);
  });

  test('pelo teclado, com Alt e as setas, o foco fica no livro', async ({ page }) => {
    await openShelf(page);
    const first = spines(page).first();
    await first.focus();
    await page.keyboard.press('Alt+ArrowRight');
    await expect(status(page)).toHaveText('Torto Arado: 2º lugar.');
    expect(await order(page)).toEqual(['A hora da estrela', 'Torto Arado', 'O avesso da pele']);
    await expect(page.getByRole('button', { name: /^Torto Arado/ })).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');
    expect(await order(page)).toEqual(['A hora da estrela', 'O avesso da pele', 'Torto Arado']);
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Alt+ArrowLeft');
    expect(await order(page)).toEqual(ABC);
    await page.waitForTimeout(300);
    await page.reload();
    expect(await order(page)).toEqual(ABC);
  });

  test('segurando e arrastando; mexer antes de 0,4s é rolagem', async ({ page }) => {
    await openShelf(page);
    await page.waitForTimeout(1500);
    const box = async (i: number) => {
      const b = await spines(page).nth(i).boundingBox();
      if (!b) throw new Error('sem lombada');
      return b;
    };
    const a = await box(0);
    // Rolagem: mexe mais de 8px antes de 0,4s.
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 40, a.y + a.height / 2, { steps: 3 });
    await page.mouse.up();
    expect(await order(page)).toEqual(ABC);
    await expect(page.getByRole('dialog')).toBeHidden();
    // Arrasto: segura, levanta e solta depois do terceiro.
    const c = await box(2);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(550);
    await expect(page.locator('.spine.ghost')).toHaveCount(1);
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(a.x + a.width / 2 + ((c.x + c.width + 10 - a.x) * i) / 6, a.y + a.height / 2);
      await page.waitForTimeout(110);
    }
    await page.mouse.up();
    await expect(page.locator('.spine.ghost')).toHaveCount(0);
    await expect(status(page)).toHaveText('Torto Arado: 3º lugar.');
    expect(await order(page)).toEqual(['A hora da estrela', 'O avesso da pele', 'Torto Arado']);
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.waitForTimeout(300);
    await page.reload();
    expect(await order(page)).toEqual(['A hora da estrela', 'O avesso da pele', 'Torto Arado']);
  });
});
