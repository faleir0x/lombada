# ADR 0001 · Stack do front

- **Status:** aceita em 2026-11-19 (opção C)
- **Data:** 2026-11-19
- **Decide:** como o front da lombada é construído agora (web primeiro, layout mobile) e como a versão mobile acontece depois.
- **Não decide:** backend (já definido no `ROADMAP.md`: Python + FastAPI + Postgres/pgvector), hospedagem da API (fase 9).

## Contexto

O design está fechado (`DESIGN.md`) e existe um protótipo funcional em HTML/JS puro (`design-explorations/prototipo.html`, ~870 linhas, mais `mascote.js`). O que esse design exige do front, medido no código do protótipo:

| Exigência | Como o protótipo resolve | Peso na escolha |
| --- | --- | --- |
| Mascote procedural | `mascote.js` remonta 31 nós SVG a cada quadro (`setAttribute('d', …)` em caminhos gerados por molas), num `requestAnimationFrame` próprio. Cerca de 3 ms por quadro por mascote nesta máquina, sem limitar a CPU | alto: é a identidade do app |
| Card que gira e é arrastado | `rotateY` + `backface-visibility`, Pointer Events com `setPointerCapture`, saída por WAAPI | alto |
| Estante com reordenação | segurar 0,4 s, fantasma solto, vizinhos abrindo espaço com FLIP (`getBoundingClientRect` antes/depois + `animate`), em prateleiras que quebram linha | alto |
| Transições | Paralaxe entre páginas, "Do livro" (cartas saindo do livro do mascote, posição medida na tela), "Um por um" na estante, todas com WAAPI e os tokens de §4 | médio |
| Movimento reduzido | `matchMedia('(prefers-reduced-motion: reduce)')` checado em cada animação | médio |
| Acessibilidade R1–R13 | `role="dialog"` + `inert` no fundo, foco devolvido a quem abriu, `aria-live` só no que muda a ação, Alt+setas na estante, ‹ › no detalhe, `lang="pt-BR"` | alto |
| Layout | container query em 900 px, `text-wrap: pretty`, Newsreader variável com `opsz` | médio |
| Offline no baralho | eventos `online`/`offline`; os dez livros já estão no aparelho; ♥ e ✕ ficam numa fila | médio |
| Equipe | uma pessoa, experiente, primeiro projeto de IA: o tempo deve ir para a IA, não para o front | alto |
| Hospedagem | plano gratuito | baixo (todas as opções cabem) |
| Backend | FastAPI separado; o front só consome JSON | baixo, mas tira o valor do servidor do Next.js |

Tudo isso é DOM, CSS e WAAPI. Nenhuma parte do design precisa de renderização no servidor: não há página pública para SEO (catálogo está fora do produto, §1), e a IA mora no FastAPI.

## Opções

### A · Next.js agora, Expo (React Native) depois, compartilhando só lógica e tipos

- **Web:** ótimo. O código do protótipo vira componentes React quase direto; o mascote entra como está, dentro de um `useEffect`.
- **O que sobra sem uso:** Server Components, rotas de API, server actions, middleware. Com o FastAPI como backend, o Next vira um gerador de SPA com mais regras (fronteira cliente/servidor, `'use client'` em quase tudo, hidratação que pode brigar com a entrada "Acender" e com R6).
- **Mobile depois:** reescrever a interface inteira em React Native. Mascote para `react-native-svg` + Reanimated (caminhos montados num *worklet*), baralho com Gesture Handler, estante com reordenação e FLIP feitos à mão em Reanimated, diálogos e foco no modelo de acessibilidade nativo. Na prática, um segundo front. Compartilha tipos, cliente da API e fila offline.
- **Hospedagem:** Vercel Hobby (gratuito, mas proíbe uso comercial) ou export estático em qualquer lugar.

### B · Expo com React Native Web, um código para web e mobile

- **Web:** a pior das três para este design. Tudo vira primitivas RN (`View`, `Pressable`, `Animated`): sem `inert`, sem `<dialog>`, `aria-live` só parcial, sem container query, sem `text-wrap`, fonte variável limitada. R7, R9 e R11 viram trabalho manual em cada tela, e a web sai com cara de app RN.
- **Mascote:** precisa do porte para `react-native-svg` + Reanimated logo no começo, antes de existir app nativo.
- **Mobile depois:** já está pronto, nativo de verdade, com gestos na thread de UI. É a única opção em que o celular barato roda tudo a 60 fps sem esforço extra.
- **Custo:** paga o preço do nativo agora, num produto que a pessoa quer na web primeiro, e atrasa as fases de IA, que são o objetivo do projeto.

### C · React + Vite (SPA) como PWA instalável agora; Capacitor quando quiser as lojas

- **Web:** igual à A no que importa. Sem servidor no front: build estático, roteamento no próprio cliente, o FastAPI como única API.
- **Mascote, gestos, FLIP, WAAPI, `inert`, `aria-live`:** rodam como estão no protótipo, dentro de componentes. Sem porte.
- **Offline:** Service Worker (Workbox via `vite-plugin-pwa`) guarda o app e as fontes; IndexedDB guarda o lote atual e a fila de escritas. O mesmo código roda dentro do Capacitor.
- **Mobile depois:** em dois degraus. (1) PWA instalável na tela inicial, já com offline. (2) Capacitor empacota o mesmo build num app Android/iOS, com plugins para vibração, compartilhar e rede. O código do app não muda.
- **Riscos:** (a) WebView em Android barato: o mascote custa ~3 ms por quadro aqui; num aparelho fraco pode chegar perto do limite de 16 ms. Mitigação: só anima mascote visível (o motor já faz isso), cair para 30 fps parado, medir com CPU 4× mais lenta antes de cada entrega. (b) Gestos em WebView soam um pouco menos nativos que Gesture Handler. (c) A Apple pode recusar app que pareça só site (diretriz 4.2); offline, vibração e compartilhar costumam bastar. (d) Se um dia o WebView não der conta, o caminho é a opção A tardia, e a lógica separada (abaixo) já estará pronta para isso.
- **Hospedagem:** estático no Cloudflare Workers com Static Assets (gratuito, pedidos de arquivo estático não são cobrados, permite uso comercial). É o caminho que a Cloudflare recomenda hoje para SPA nova no lugar do Pages.

### Variante de C: SvelteKit em vez de React

Svelte casa bem com código imperativo de DOM e tem transições prontas, e o `adapter-static` funciona com Capacitor. Fica atrás do React por três motivos: ecossistema e exemplos menores, menos material para quem está aprendendo outra coisa (IA) ao mesmo tempo, e fecha a porta da saída para React Native, que a lógica em React deixa aberta.

## Comparação

Notas de 1 (ruim) a 5 (ótimo) para este design, não em geral.

| Critério | A · Next + Expo depois | B · Expo + RN Web | C · React/Vite PWA + Capacitor |
| --- | --- | --- | --- |
| Mascote como está | 5 | 2 (porte no começo) | 5 |
| Card, estante, FLIP, Paralaxe | 5 | 3 | 5 |
| A11y R7, R9, R11 na web | 5 | 2 | 5 |
| Movimento reduzido | 5 | 4 | 5 |
| Offline na web | 4 | 3 | 5 |
| Custo do mobile depois | 1 (segundo front) | 5 (já existe) | 4 (empacotar) |
| Qualidade nativa no celular | 5 | 5 | 3 |
| Tempo até o primeiro deploy | 4 | 2 | 5 |
| Peças a aprender fora da IA | 3 (RSC, cache do Next) | 2 (RN, Reanimated, Expo) | 4 |
| Encaixe com FastAPI | 3 (servidor do Next sobra) | 4 | 5 |
| Hospedagem grátis | 4 | 4 | 5 |

## Decisão

**Opção C: React + TypeScript + Vite, como SPA estática, PWA instalável; Capacitor quando o app for para as lojas.**

Motivo em uma frase: o design inteiro já existe e funciona em DOM, então o front que menos reescreve é o que deixa mais tempo para a IA, que é o objetivo do projeto; e o mesmo build vira app móvel sem um segundo front.

**Hospedagem do front:** Cloudflare Workers com Static Assets e `not_found_handling: "single-page-application"`, preferência do usuário pelo ecossistema da Cloudflare (2026-11-19). O APK do Capacitor leva o mesmo build dentro dele e não depende dessa hospedagem.

Regras que acompanham a escolha:

1. **Núcleo sem framework.** Tipos do contrato, cliente da API, fila offline e regras do baralho ficam em `src/core/`, em TypeScript puro, sem importar React nem DOM. É o que seria compartilhado se um dia vier um app React Native.
2. **Animação sem biblioteca.** WAAPI e os tokens de `DESIGN.md` §4 num módulo `motion`, com a checagem de movimento reduzido num lugar só. `mascote.js` entra como módulo, com tipos por cima, sem reescrever o motor.
3. **Componentes do design.** Um componente por item de §6; diálogo único que aplica R7 (`inert`, foco, Esc); hook para a região anunciada de R9.
4. **Roteador próprio, sem biblioteca** (mudança de 2026-11-19, fase A2). São quatro rotas, e as páginas abrem por cima da home com a Paralaxe; um roteador de ~80 linhas sobre o History API (`src/platform/router.ts`) deixa a transição inteira com o app e tira o `react-router` da lista de dependências. O voltar do navegador e do Android continua fechando a página.
5. **API falsa no próprio front.** Um `fakeApi` em `src/core/` implementa o contrato do `ROADMAP.md` com dados de exemplo e latência simulada; trocar pela real é mudar a URL base.
6. **Fontes servidas pelo próprio app** (os mesmos arquivos do Google Fonts), para funcionar offline e no Capacitor. O `DESIGN.md` diz "carregadas do Google Fonts": a família e os pesos não mudam, só a origem. Avisar a sessão de design.

Versões (as mais altas publicadas até 2026-11-05, pelo menos duas semanas antes desta data; conferir de novo no dia do `pnpm add`):

| Pacote | Versão |
| --- | --- |
| `react`, `react-dom` | 19.3.1 |
| `vite` | 8.3.5 |
| `@vitejs/plugin-react` | 6.2.1 |
| `typescript` | 7.0.2 |
| `vite-plugin-pwa` | 2.0.0 |
| `idb` | 8.0.4 |
| `@capacitor/core`, `@capacitor/cli` (depois) | 8.6.0 |

Para comparação, as versões que as outras opções usariam: `next` 16.4.5; `expo` 58.0.23, `react-native` 0.88.1, `react-native-web` 0.21.4, `react-native-reanimated` 4.7.1, `react-native-svg` 15.16.0, `react-native-gesture-handler` 3.4.0; `@sveltejs/kit` 3.1.1, `svelte` 5.57.3.

## Consequências

- **Melhora:** o protótipo vira o app por migração, não por reescrita; R1–R13 continuam testáveis com as mesmas ferramentas do navegador; um deploy estático grátis; o front não tem servidor para manter.
- **Piora:** sem renderização no servidor (aceitável: nada no app precisa de SEO); no celular, a sensação é de WebView, não de app nativo; iOS limita PWA (sem instalação automática, armazenamento que o sistema pode limpar em app pouco usado), o que reforça mandar a fila offline assim que a conexão volta.
- **Muda no `ROADMAP.md`:** "front em Next.js" vira "front em React + Vite (ADR 0001)" na ordem de trabalho e na tabela da stack.
- **Revisitar se:** o mascote ou o arrasto não segurarem 60 fps num Android de entrada com o Capacitor; ou o produto precisar de páginas públicas indexáveis (estante compartilhada, por exemplo). No primeiro caso, o caminho é a opção A só para o app móvel, reaproveitando `src/core/`. No segundo, uma página pública pequena à parte, sem migrar o app.
