import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  // As duas larguras de referência do DESIGN.md §5.
  projects: [
    {
      name: 'celular',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // A vitrine (/vitrine) entra no build dos testes.
    command: 'VITE_VITRINE=1 pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
