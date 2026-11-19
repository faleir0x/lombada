# lombada

Um app para sair da ressaca literária. Você escreve o que está com vontade de ler, ou um livro que amou, e um fantasma te dá um baralho de capas: ♥ guarda na estante, ✕ passa, e cada escolha melhora o próximo lote.

- **Design:** [`DESIGN.md`](DESIGN.md) e o protótipo em [`design-explorations/prototipo.html`](design-explorations/prototipo.html).
- **Aplicação:** [`docs/roadmap-app.md`](docs/roadmap-app.md). Stack em [`docs/adr/0001-stack.md`](docs/adr/0001-stack.md).
- **IA (busca, embeddings, avaliação):** [`ROADMAP.md`](ROADMAP.md).

## Rodar o app

Precisa de Node 26 e pnpm 11.

```bash
cd app
pnpm install
pnpm dev
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` | confere os tipos e gera `dist/` |
| `pnpm lint` | Biome (lint e formatação) |
| `pnpm test` | testes de lógica (Vitest) |
| `pnpm e2e` | testes no navegador com axe (Playwright); na primeira vez, `pnpm exec playwright install chromium` |
| `pnpm check` | tudo acima, na ordem do CI |

## Ver o protótipo

```bash
python3 -m http.server 8765 --directory design-explorations
```

Depois abra `http://localhost:8765/prototipo.html`.
