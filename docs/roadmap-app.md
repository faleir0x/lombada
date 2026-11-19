# Roadmap do app

Este roadmap cobre a aplicação: o front (web e APK) e a API sem IA. A parte de IA (dados, embeddings, busca, LLM, avaliação) fica no `ROADMAP.md`, fases 0 a 10. Hospedagem fica para depois.

- **Stack:** React + TypeScript + Vite, SPA/PWA, Capacitor para o APK (`docs/adr/0001-stack.md`).
- **Fonte da verdade visual:** `DESIGN.md`. Referência de paridade: `design-explorations/prototipo.html`. Nenhuma das duas é editada daqui.
- **Contrato:** a seção "Contrato da API" do `ROADMAP.md`. A fase A1 só começa com ele aprovado.

## Princípios

1. **O protótipo é a especificação executável.** Cada tela nova é comparada com o estado correspondente do `prototipo.html`, em 390px e no desktop, de dia e de noite.
2. **Migrar, não reescrever.** O mascote, os gestos e as animações do protótipo entram como estão, em módulos com tipos. Reescrever só o que o React obriga.
3. **O núcleo não conhece a tela.** `src/core/` não importa React nem DOM. É o que sobrevive se um dia vier um app nativo.
4. **Uma API, duas implementações.** A API falsa e a real passam pela mesma bateria de testes de contrato. Trocar uma pela outra é mudar a URL base.
5. **Acessibilidade e movimento reduzido entram na mesma fase da tela, não no fim.** R1 a R13 do `DESIGN.md` são critério de pronto de cada fase.

## Estrutura do repositório

```
lombada/
  app/                    front (pnpm)
    src/core/             tipos do contrato, cliente da API, API falsa, fila offline, regras do baralho
    src/ui/               tokens, fontes, movimento, mascote, ícones, componentes do DESIGN.md §6
    src/pages/            home, baralho, estante, você
    src/dev/              vitrine de estados (como os botões do protótipo), só em desenvolvimento
    e2e/                  testes de ponta a ponta e acessibilidade
    android/              projeto do Capacitor (fase A9)
  api/                    FastAPI (fase B), depois casa das fases de IA
  docs/                   ADRs e roadmaps
  design-explorations/    congelado, da sessão de design
  DESIGN.md  ROADMAP.md
```

## Ferramentas

| Para quê | Escolha | Por quê |
| --- | --- | --- |
| Pacotes | pnpm | já instalado |
| Tipos | TypeScript (modo estrito) | o contrato vira tipo; erro de forma aparece antes de rodar |
| Testes de lógica | Vitest | mesmo motor do Vite, rápido para `src/core/` |
| Testes de tela e a11y | Playwright + axe | navegador de verdade, gesto, teclado, modo offline, `prefers-reduced-motion` e tema emulados |
| Lint e formatação | Biome | uma ferramenta só no lugar de ESLint + Prettier |
| CI | GitHub Actions | grátis em repositório público; roda tipos, testes e a11y a cada push |
| Estado | um store pequeno em `src/core/` + `useSyncExternalStore` | sem biblioteca de estado; a fila offline precisa ser explícita de qualquer jeito |

Versões exatas, de releases com pelo menos duas semanas, conferidas no dia da instalação.

## Fases

Prazos estimados para meio período. Cada fase termina com tudo verde no CI e com a comparação visual contra o protótipo.

### A0 · Fundação (½ dia)

- Vite + React + TypeScript em `app/`, Biome, Vitest, Playwright, CI.
- Página em branco com `lang="pt-BR"`, fontes servidas pelo app, tokens de cor do `DESIGN.md` §2 como variáveis CSS.
- **Pronto quando:** `pnpm dev`, `pnpm test` e `pnpm e2e` rodam; o CI passa num push.

### A1 · Núcleo e API falsa (2 dias)

- Tipos do contrato em `src/core/api/types.ts`.
- Interface `Api` e duas implementações: `fakeApi` (agora) e `httpApi` (fase B).
- `fakeApi`: dados de exemplo com os 40 títulos reais do protótipo, latência simulada de 1 a 6 s na busca, estado salvo no aparelho para a estante sobreviver ao recarregar.
- Cenários por parâmetro na URL (`?cenario=sem-resultado|erro|lento|offline`), para chegar em qualquer estado da §7 sem depender de sorte.
- Testes de contrato em Vitest: a mesma bateria vai rodar contra a API real.
- **Pronto quando:** todas as regras do contrato têm teste (♥ é "está na estante", "já li e amei" entra com 👍, desfazer tira da estante, busca só entra no histórico com julgamento, posição da estante).

### A2 · Fundação visual (3 dias)

- Tipografia, espaço, raios e sombra do `DESIGN.md` §3 e §4.
- Tema dia/noite por `data-theme`, seguindo o sistema quando não há escolha.
- Módulo `motion`: tokens de duração e curva, helpers de WAAPI e a checagem de `prefers-reduced-motion` num lugar só.
- Mascote: `mascote.js` como módulo com tipos e um componente `<Mascote humor=… />`; IDs de SVG únicos por instância (R8).
- Ícones Hugeicons do `hugeicons.js`.
- Peças comuns: botão "Mola + ícone", folha/diálogo com `inert`, foco e Esc (R7), região anunciada (R9), balão de fala.
- Rotas: home, baralho, estante, você; transição Paralaxe entre elas.
- Vitrine `src/dev/` com os mesmos estados dos botões do protótipo.
- **Pronto quando:** a vitrine mostra mascote, botões, balão e folha nos dois temas, com e sem movimento reduzido; axe sem erros.

### A3 · Home (3 dias)

- Cena do abajur preso ao mascote, topo com contador da estante, barra de busca que cresce até 4 linhas (Enter busca, Shift+Enter quebra).
- Entrada "Acender" só na primeira abertura da sessão, depois do primeiro quadro (R6). Envio "Vai para o livro". Toque no abajur "Puxou a cordinha".
- Balão de ideias (`GET /ideas`), envio vazio, carregando, erro com "Tentar de novo".
- Voz do mascote: banco de falas do `texto.html` e do `fechamento.html` num módulo de textos, com sorteio sem repetir a anterior. Parado, prestes a dormir, dormindo, acordando.
- Onboarding de 3 telas na primeira visita.
- **Pronto quando:** todos os estados da home do protótipo aparecem iguais, em 390px e no desktop.

### A4 · Baralho e fim do lote (4 a 5 dias), a fase mais difícil

- Entrada "Do livro" a partir do livro do mascote; cartas descendo do topo quando aberto por outro caminho.
- Card com capa cheia, giro para a sinopse, arrasto com rotação, limites de 110px e 60px no gesto rápido, saída para os lados e para cima.
- Teclado: ← → ↑, Enter gira, Z desfaz, Esc sai. Foco nunca se perde quando o card sai (R12).
- Desfazer, modo "já li" (selos, botão desativado, seta de sair), três passes seguidos.
- "Por que combina" que chega depois (`GET /sessions/{id}/why`).
- Capa gerada na hora e foto por cima em 200ms (R13).
- Fim do lote: lista na ordem, ♥ de 44px que guarda e tira, contagem e fala acompanhando, "Nova busca" e "Mais dez".
- Sem resultado: balão largo com as buscas vizinhas.
- **Pronto quando:** dá para julgar os dez só com o dedo, só com o teclado e só com leitor de tela, e o contador da home acompanha.

### A5 · Estante e detalhe (3 a 4 dias)

- Prateleiras que quebram pela largura, lombadas com largura pelo título, cor de pano, espaços tracejados, nenhum título cortado com 40 livros (R1).
- "Um por um" ao abrir; balão com a quantidade; estante vazia.
- Detalhe em folha: dados, "Depois de ler" 👍/👎, lixeira, "Buscar parecidos", "3º de 40" com ‹ ›.
- Reordenar: segurar 0,4s, livro solto, vizinhos abrindo espaço (FLIP), rolagem perto da borda, Alt+setas, anúncio "Torto Arado: 3º lugar." (R11).
- **Pronto quando:** a mesma reordenação dá certo por arrasto, por ‹ › e por teclado, e a ordem sobrevive ao recarregar.

### A6 · Você (1 a 2 dias)

- Números, mascote, histórico com capas dos amados, histórico vazio.
- Folha da busca com o resumo e o ♥ funcionando igual ao fim do lote; "Buscar de novo" fixo no pé.
- **Pronto quando:** mudar um ♥ numa busca antiga muda a estante, a contagem da busca e o contador da home.

### A7 · Offline e PWA (2 dias)

- Service Worker com o app e as fontes em cache; manifesto e ícones para instalar.
- Fila de escritas no IndexedDB: sobe na ordem, uma por vez, ao voltar a conexão e ao abrir o app.
- Baralho sem conexão: ícone ao lado da contagem, falas de cair e voltar, "Mais dez" desativado.
- **Pronto quando:** no Playwright, cortar a rede no meio do baralho, julgar os dez, mudar um ♥ no resumo, religar e ver tudo chegar na API falsa na ordem certa.

### A8 · Revisão de qualidade (2 dias)

- Passada completa de R1 a R13: axe em todas as telas e estados, teclado do começo ao fim, leitor de tela (Orca no Linux, TalkBack no Android).
- Desempenho: mascote, arrasto e estante com a CPU 4× mais lenta no DevTools, mirando 60 quadros por segundo.
- Comparação final com o protótipo, tela a tela, nos dois temas e nas duas larguras.
- **Pronto quando:** nenhuma pendência de R1 a R13 e nenhum quadro acima de 16 ms no caminho principal.

### A9 · APK Android (2 a 3 dias)

- Android SDK e JDK nesta máquina (alguns GB de disco; conferir espaço antes).
- `@capacitor/core` + `@capacitor/android`, projeto em `app/android/`.
- Botão voltar do Android fazendo o mesmo que Esc: fecha a folha, depois a página, depois sai.
- Áreas seguras, cor da barra de status por tema, ícone e tela de abertura.
- APK de debug instalado num celular de verdade, de preferência um Android barato.
- **Pronto quando:** o app abre sem internet, faz o caminho principal inteiro e passa no teste de desempenho no aparelho.

### B · API real sem IA (4 a 5 dias)

Pode começar depois da A1, em paralelo com as telas, porque o contrato já está fechado. Coincide com a fase 0 do `ROADMAP.md`.

- FastAPI em `api/` com `uv`; Postgres via Docker Compose; migrações versionadas.
- Tabelas: pessoas, buscas, livros da busca, julgamentos, estante (com posição e nota), escritas já aplicadas (para a fila offline).
- Todos os endpoints do contrato, menos a escolha dos livros: a busca devolve um recorte fixo de exemplo até a fase 3 da IA plugar a busca vetorial no mesmo lugar.
- A bateria de testes de contrato da A1 rodando contra esta API.
- **Pronto quando:** o front troca `fakeApi` por `httpApi` e todos os testes de ponta a ponta continuam passando.

## Depois

- Fases 0 a 10 do `ROADMAP.md` trocam a busca de exemplo pela real, sem mexer no front.
- Hospedagem (Cloudflare, ver `ROADMAP.md`).
- iOS pelo mesmo Capacitor, se e quando fizer sentido.
- Troca de mascote na página Você (o motor já tem cinco).
