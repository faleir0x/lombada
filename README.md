# lombada

An app for getting out of a reading slump. Type the mood you're in, or a book you loved, and a ghost deals you a deck of covers: ♥ puts a book on your shelf, ✕ passes, and every choice makes the next batch better.

The app itself is Brazilian Portuguese only, and so are the project docs and code comments.

- **Design:** [`DESIGN.md`](DESIGN.md) and the prototype in [`design-explorations/prototipo.html`](design-explorations/prototipo.html).
- **App roadmap:** [`docs/roadmap-app.md`](docs/roadmap-app.md). Stack decision in [`docs/adr/0001-stack.md`](docs/adr/0001-stack.md): React + TypeScript + Vite as a PWA, with Capacitor for the Android build.
- **AI roadmap (search, embeddings, evaluation) and API contract:** [`ROADMAP.md`](ROADMAP.md).

## Running the app

Requires Node 26 and pnpm 11.

```bash
cd app
pnpm install
pnpm dev
```

| Command | What it does |
| --- | --- |
| `pnpm dev` | development server |
| `pnpm build` | type-checks and builds into `dist/` |
| `pnpm lint` | Biome (lint and formatting) |
| `pnpm test` | unit and API contract tests (Vitest) |
| `pnpm e2e` | browser tests with axe (Playwright); first time, run `pnpm exec playwright install chromium` |
| `pnpm check` | all of the above, in CI order |

Until the real API exists, the app runs on a fake one. URL parameters (names in Portuguese) put it in any state: `?cenario=sem-resultado|erro|lento|offline` (no results, error, slow, offline), `?estado=vazio|exemplo` (empty or sample data) and `?latencia=0` (no simulated delay).

## Viewing the prototype

```bash
python3 -m http.server 8765 --directory design-explorations
```

Then open `http://localhost:8765/prototipo.html`.
