import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/* Fase A7: sem conexão e PWA. Pronto quando: cortar a rede no meio do baralho, julgar os dez, mudar um ♥ no
   resumo, religar e ver tudo chegar na API falsa na ordem certa. */

const count = (page: Page) => page.locator('.k-count');
const status = (page: Page) => page.locator('[data-announcer]');
const field = (page: Page) => page.getByRole('textbox', { name: 'Conta seu humor, ou um livro que amou' });

interface FakeState {
  sessions: { id: string; books: string[]; judgments: Record<string, { result: string }> }[];
  shelf: { book_id: string }[];
}
const fakeState = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('lombada-fake-api') ?? '{}')) as Promise<FakeState>;

async function openDeck(page: Page) {
  await page.goto('/?latencia=0&estado=vazio');
  await field(page).fill('Curto e devastador');
  await field(page).press('Enter');
  await expect(count(page)).toContainText('1 de 10');
  await expect
    .poll(() =>
      page.evaluate(() => [...document.querySelectorAll('.k-cw')].some((c) => c.getAnimations().length)),
    )
    .toBe(false);
}

async function judge(page: Page, key: 'ArrowRight' | 'ArrowLeft', next: number) {
  await page.keyboard.press(key);
  if (next <= 10) await expect(count(page)).toContainText(`${next} de 10`);
}

test('sem conexão no meio do baralho: tudo sobe na ordem certa quando a conexão volta', async ({
  page,
  context,
}) => {
  await openDeck(page);
  await judge(page, 'ArrowRight', 2);
  await judge(page, 'ArrowLeft', 3);

  await context.setOffline(true);
  await expect(page.getByRole('img', { name: 'Sem conexão' })).toBeVisible();
  await expect(status(page)).toHaveText('Caiu a conexão. Pode seguir, eu guardo tudo aqui.');
  await judge(page, 'ArrowRight', 4);
  for (let n = 5; n <= 11; n++) await judge(page, 'ArrowLeft', n);
  await expect(page.locator('.k-bub')).toContainText('Os próximos dez chegam quando a conexão voltar.');
  await expect(page.getByRole('button', { name: 'Mais dez' })).toBeDisabled();
  const hearts = page.locator('.gl .hb');
  await hearts.nth(5).click();
  await expect(hearts.nth(5)).toHaveAttribute('aria-pressed', 'true');

  // Nada chegou ainda: a API falsa só tem os dois julgamentos de antes.
  const before = await fakeState(page);
  expect(Object.keys(before.sessions[0]?.judgments ?? {})).toHaveLength(2);

  await context.setOffline(false);
  await expect(status(page)).toHaveText('Voltou a conexão. Já subi tudo.');
  await expect(page.getByRole('img', { name: 'Sem conexão' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mais dez' })).toBeEnabled();

  const after = await fakeState(page);
  const session = after.sessions[0];
  if (!session) throw new Error('sem busca');
  const b = session.books;
  expect(b.map((id) => session.judgments[id]?.result)).toEqual([
    'love',
    'pass',
    'love',
    'pass',
    'pass',
    'pass',
    'pass',
    'pass',
    'pass',
    'pass',
  ]);
  // A estante na ordem em que tudo aconteceu: o ♥ online, o ♥ offline e o resgatado no resumo.
  expect(after.shelf.map((e) => e.book_id)).toEqual([b[0], b[2], b[5]]);
  await expect(page.locator('.k-sumh')).toHaveText('3 amados · 7 passados');
});

test('a fila fica salva: recarregar sem conexão abre o app e nada se perde', async ({ page, context }) => {
  await page.goto('/?latencia=0&estado=vazio');
  // O service worker precisa estar pronto para o app abrir sem internet.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await field(page).fill('Curto e devastador');
  await field(page).press('Enter');
  await expect(count(page)).toContainText('1 de 10');
  await judge(page, 'ArrowRight', 2);

  await context.setOffline(true);
  await judge(page, 'ArrowLeft', 3);
  await judge(page, 'ArrowLeft', 4);
  await page.reload();
  // Abre do service worker; a busca não carrega sem a API, mas a fila está no IndexedDB.
  await expect(page.getByRole('region', { name: 'Baralho' })).toBeVisible();
  await expect(page.locator('.k-bub')).toContainText('Perdi a conexão');

  await context.setOffline(false);
  await expect
    .poll(async () => Object.keys((await fakeState(page)).sessions[0]?.judgments ?? {}).length)
    .toBe(3);
  await page.goto('/voce');
  await expect(page.locator('.s-row').first()).toContainText('1 amado · 2 passados');
});

test('é instalável: manifesto em pt-BR com os ícones', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await page.evaluate(async (url) => (await fetch(url)).json(), href ?? '');
  expect(manifest).toMatchObject({ name: 'lombada', lang: 'pt-BR', display: 'standalone', start_url: '/' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512', '512x512']);
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
});
