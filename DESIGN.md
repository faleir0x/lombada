# DESIGN.md · lombada

Este documento é a fonte da verdade visual da lombada. Quando ele e o código discordarem, ele vence. Quem quiser mudar uma decisão daqui muda este arquivo primeiro.

- **Origem:** direção B · Abajur, escolhida em 2026-11-18 após quatro rodadas de playground (`design-explorations/home-directions-v1.html`, `home-directions.html`, `abajur-r3.html`, `abajur.html`).
- **Referência de paridade:** `design-explorations/prototipo.html` (fase 4), a home em celular e desktop com todos os estados, feita só com os tokens deste documento. A escolha visual veio de `abajur.html`, rodada 4, tela A. Para abrir: `python3 -m http.server 8765` dentro de `design-explorations/`.
- **Decisões e histórico curto:** `design-explorations/_brand.md`. Brief: `design-explorations/brief.md`.

## 1. Tese

Um abajur aceso num quarto escuro, um mascote embaixo da luz e um campo para dizer o que você quer ler. A tela é uma cena de leitura de noite, não um painel de app: tem uma luz, um personagem e um lugar para escrever. De dia o abajur apaga e a cena fica clara, mas a estrutura é a mesma.

- **Público principal:** leitor em ressaca literária. Terminou um livro que amou, ou largou três seguidos. Quer uma sugestão boa rápido, sem catálogo.
- **Ações, por ordem:** escrever o humor ou um livro que amou e buscar; pedir uma ideia ao mascote; ver a estante; trocar entre dia e noite.
- **Sucesso:** da abertura ao primeiro card em menos de 10 segundos, lendo no máximo uma linha.
- **Fora do produto:** cara de assistente de IA, catálogo, listas de mais vendidos, texto que explica o app.

## 2. Cor

Paleta "Grafite e marcador" (rodada 3). Duas rampas em OKLCH, convertidas para hex porque o app vai para mobile depois e hex é o formato comum entre web e nativo. Cada degrau tem nome pela luminosidade × 1000 e só existe porque alguma função usa. Componentes nunca usam as primitivas direto; usam os tokens semânticos.

**Primitivas**

| Token | Hex | OKLCH | Usado por |
| --- | --- | --- | --- |
| `--neutral-975` | `#F8F7F4` | 0.975 0.004 84 | superfície clara, texto sobre o vermelho (claro), página do livro do mascote |
| `--neutral-935` | `#ECE9E4` | 0.935 0.008 84 | fundo claro, texto no escuro, balão no escuro, corpo do mascote à noite |
| `--neutral-865` | `#D6D2CA` | 0.865 0.012 84 | linha no claro, lâmpada apagada |
| `--neutral-670` | `#99958C` | 0.670 0.014 84 | texto secundário no escuro, lateral do mascote à noite |
| `--neutral-500` | `#66635C` | 0.500 0.012 84 | texto secundário no claro |
| `--neutral-300` | `#2F2E2A` | 0.300 0.007 84 | linha no escuro, cúpula do abajur |
| `--neutral-240` | `#201F1D` | 0.240 0.005 84 | superfície no escuro |
| `--neutral-190` | `#141412` | 0.190 0.003 84 | fundo escuro, texto no claro, balão no claro, olhos do mascote |
| `--marker-430` | `#8C2716` | 0.430 0.140 32 | lateral do mascote de dia |
| `--marker-525` | `#B53A25` | 0.525 0.163 32 | destaque no claro, destaque dentro do balão claro |
| `--marker-610` | `#D5523B` | 0.609 0.170 32 | corpo do mascote de dia |
| `--marker-655` | `#E66048` | 0.655 0.172 32 | destaque no escuro |
| `--marker-710` | `#F07A64` | 0.710 0.150 32 | destaque dentro do balão escuro |
| `--lamp-bulb` | `#FFEBC8` | 0.947 0.051 82 | lâmpada acesa; o feixe usa a mesma cor a 17% |

**Semânticos**

| Token | Dia (claro) | Noite (escuro) | Função |
| --- | --- | --- | --- |
| `--color-bg` | neutral-935 | neutral-190 | fundo da tela |
| `--color-surface` | neutral-975 | neutral-240 | campo de busca, painéis |
| `--color-text` | neutral-190 | neutral-935 | texto principal, ícones |
| `--color-text-muted` | neutral-500 | neutral-670 | placeholder, motivos das sugestões, dicas |
| `--color-line` | neutral-865 | neutral-300 | bordas, botão de enviar desativado |
| `--color-accent` | marker-525 | marker-655 | botão de enviar ativo, contador, ícone de ideia, foco |
| `--color-on-accent` | neutral-975 | neutral-190 | texto e ícone sobre o destaque |
| `--color-bubble` | neutral-190 | neutral-935 | balão de fala (sempre o inverso do fundo) |
| `--color-on-bubble` | neutral-975 | neutral-190 | texto do balão |
| `--color-accent-on-bubble` | marker-710 | marker-525 | ícones de destaque dentro do balão |
| `--color-lamp-shade` | neutral-300 | neutral-300 | cúpula do abajur |
| `--color-lamp-bulb` | neutral-865 | lamp-bulb | lâmpada |
| `--color-lamp-glow` | transparente | lamp-bulb a 17% | feixe de luz e poeira |
| `--color-scrim` | neutral-190 a 36% | preto a 50% | fundo escurecido atrás do detalhe do livro |
| `--color-plank` | neutral-300 | `#3A3631` | tábua das prateleiras |
| `--color-slot` | neutral-865 | neutral-300 | espaço tracejado esperando livro |
| `--mascot-body` | marker-610 | neutral-935 | corpo do mascote |
| `--mascot-eye` | neutral-190 | neutral-190 | olhos, sobrancelhas, boca |
| `--mascot-side` | marker-430 | neutral-670 | volume (camadas de trás) e detalhes |

**Contraste medido (WCAG 2), 2026-11-18**

| Par | Dia | Noite | Mínimo |
| --- | --- | --- | --- |
| texto / fundo | 15.23 | 15.23 | 4.5 |
| texto / superfície | 17.22 | 13.60 | 4.5 |
| secundário / fundo | 4.95 | 6.18 | 4.5 |
| secundário / superfície (placeholder) | 5.59 | 5.51 | 4.5 |
| sobre o destaque / destaque | 5.45 | 5.39 | 4.5 |
| destaque / fundo | 4.82 | 5.39 | 3 |
| texto do balão / balão | 17.22 | 15.23 | 4.5 |
| destaque no balão / balão | 6.74 | 4.82 | 3 |
| corpo do mascote / fundo | 3.40 | 15.23 | 3 (forma) |
| olho / corpo do mascote | 4.48 | 15.23 | 3 |

Regras:
- Um destaque só, o vermelho do marcador. Ele marca a ação principal (enviar), o contador da estante e o ícone de ideia. Nada mais fica vermelho, exceto o mascote de dia.
- O balão é sempre o inverso do fundo: escuro de dia, claro de noite.
- O tema troca por `data-theme` na raiz; o ícone do abajur e o próprio abajur alternam. Sem `data-theme`, segue o sistema.
- O corpo do mascote de dia é `marker-610`, um passo mais escuro que o destaque, para passar de 3:1 contra o fundo. Antes era `marker-655`, com 2.83:1; trocado a pedido do usuário em 2026-11-18.

## 3. Tipografia

Duas famílias, carregadas do Google Fonts com `display=swap`:

- **Newsreader** (variável, pesos 400 a 600, `opsz` automático), para o que tem voz de livro: marca, campo de busca, títulos, sugestões. Escolhida na rodada 2 entre cinco pares.
- **Hanken Grotesk** (400 a 700), para a interface: fala do mascote, botões, legendas, números.

| Papel | Família | Tamanho / entrelinha | Peso | Tracking | Uso |
| --- | --- | --- | --- | --- | --- |
| `brand` | Newsreader | 1.6875rem (27px) / 1 | 400 | -0.01em | "lombada" no topo |
| `title` | Newsreader | 1.75rem (28px) / 1.15 | 450 | -0.015em | onboarding, títulos de tela |
| `heading` | Newsreader | 1.3125rem (21px) / 1.25 | 500 | -0.01em | títulos de painel e seção |
| `input` | Newsreader | 1.0625rem (17px) / 1.3 | 400 | 0 | campo de busca (≥ 16px por causa do zoom do iOS) |
| `suggestion` | Newsreader | 1rem (16px) / 1.2 | 500 | 0 | título de cada ideia no balão |
| `body` | Hanken Grotesk | 1rem (16px) / 1.5 | 400 | 0 | textos corridos (onboarding, sobre) |
| `speech` | Hanken Grotesk | 0.9375rem (15px) / 1.4 | 400 | 0 | fala do mascote |
| `label` | Hanken Grotesk | 0.875rem (14px) / 1.3 | 500 | 0 | botões com texto |
| `caption` | Hanken Grotesk | 0.8125rem (13px) / 1.3 | 400 | 0 | motivo da sugestão, dicas |
| `count` | Hanken Grotesk | 0.6875rem (11px) / 1 | 700 | 0 | contador da estante, `tabular-nums` |

- Fala do mascote e títulos usam `text-wrap: pretty`; títulos curtos podem usar `balance`.
- Pontuação tipográfica no texto renderizado: aspas curvas, reticências (…), travessão nunca.
- Suavização de fonte só na raiz.

## 4. Forma, espaço, movimento

**Espaço:** escala de 4 em 4 com dois passos menores: 4, 6, 8, 12, 16, 20, 24, 32, 40 px. Nada fora dela.

**Raios:**

| Token | Valor | Onde |
| --- | --- | --- |
| `--radius-sm` | 10px | itens dentro do balão, botões de rodapé do balão |
| `--radius-md` | 12px | botões de ícone, ícone de ideia |
| `--radius-lg` | 14px | balão, botão de enviar |
| `--radius-xl` | 18px | barra de busca |

**Sombra:** só a barra de busca tem sombra (`0 0 0 1px` linha + `0 10px 24px -14px` preto a 50%), porque é a única peça que flutua sobre a cena. Painéis futuros que abrem por cima usam a mesma.

**Ícones:** Hugeicons, versão gratuita (MIT), traço fino arredondado, 22px no topo e na barra, 20px dentro do balão, sempre em `currentColor`. Os 14 SVGs usados estão em `design-explorations/hugeicons.js` (lâmpada, estante, perfil, buscar, ideia, outras, fechar, livro, abrir, coração, voltar, avançar, sem conexão, marcador). Escolhido na rodada 4.

**Mascote:** fantasma por padrão (rodada 3). Coruja, bibliotecário, corvo e traça ficam no mesmo motor (`design-explorations/mascote.js`) para a futura troca na área do usuário. 204px na home. Humores: parado, ouvindo, lendo, curtiu, revira os olhos, desconfiado, surpreso, dormindo.

### Movimento

Escolhido na fase 5 (2026-11-18) em `design-explorations/movimento.html`: entrada "Acender", fala "Do bico", envio "Vai para o livro" e troca dia/noite em fade lento com a lâmpada piscando. As curvas vêm da skill `emilkowalski/animate` e substituem as que existiam antes, que eram estimadas. Só `transform` e `opacity` se movem; cores fazem transição apenas na troca dia/noite.

| Token | Valor | Função |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | entradas, fala, onboarding, botão |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | movimento dentro da tela (texto voando até o livro) |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | estante |
| `--dur-speech` | 200ms | balão aparecendo (escala de 96% a 100% a partir do bico) |
| `--dur-theme` | 600ms | troca dia/noite: fundo, textos, mascote (ease) |
| `--dur-lamp` | 700ms | feixe de luz e poeira acendendo e apagando |
| `--dur-flicker` | 220ms | lâmpada piscando duas vezes ao acender (linear) |
| `--dur-fly` | 480ms | texto da busca voando até o livro do mascote |
| `--dur-sheet-open` | 420ms | página (estante, baralho) entrando; home recuando (paralaxe) |
| `--dur-sheet-close` | 280ms | página saindo e home voltando, pelo mesmo caminho |
| `--dur-step` | 280ms | troca de tela do onboarding (24px + fade) |
| `--dur-press` | 200ms | botão de enviar mudando de cor |
| `--dur-tap` | 120ms | botão de enviar encolhendo para 96% ao apertar |
| `--dur-hover` | 150ms | fundo dos ícones no hover (só com mouse) |
| `--dur-flip` | 420ms | card girando para mostrar a sinopse (`--ease-in-out`) |
| `--dur-card` | 280ms | card saindo (lado ou para cima) e a pilha subindo (`--ease-out`) |

**Entrada da tela ("Acender"):** só na primeira abertura da sessão (revisão D5); nas outras, e ao voltar de outra tela, a home já aparece pronta. A coreografia só começa quando o navegador desenha um quadro (ver R6).

| Elemento | Papel | Começa | Duração | Movimento | Relação |
| --- | --- | --- | --- | --- | --- |
| Topo | decoração | 0ms | 300ms | só fade | — |
| Lâmpada (noite) | apoio | 0ms | 300ms | pisca: 0 → 1 → 0,25 → 1 | causa da luz |
| Feixe e poeira (noite) | apoio | 250ms | 450–500ms | fade | sobrepõe a lâmpada |
| Fantasma | principal | 300ms | 520ms | fade + sobe 18px | aparece dentro da luz |
| Barra de busca | apoio | 520ms | 420ms | fade + sobe 14px | sobrepõe o fantasma |
| Balão | apoio | 760ms | 220ms | fade + 96% → 100% | chega quando o fantasma "fala" |

De dia, sem lâmpada nem feixe: o fantasma, a busca e o balão mantêm os mesmos tempos.

**Envio ("Vai para o livro"):** o texto sai do campo (que esvazia), faz um arco e entra no livro do mascote em 480ms, encolhendo para 30% e sumindo nos últimos 40%. O mascote começa a ler aos 300ms, quando o livro aparece. A busca usa o texto guardado, então "Tentar de novo" funciona com o campo vazio.

**Botões ("Mola + ícone"):** escolhido em 2026-11-18 em `design-explorations/botoes.html` (família E). Vale para todo botão do app. Ao apertar, o botão encolhe para 90% em 100ms (`--ease-out`); ao soltar, passa para 106%, volta a 98% e assenta em 100%, em 380ms. No clique, o ícone faz o gesto do que significa:

| Ícone | Gesto | Duração |
| --- | --- | --- |
| coração | bate (135% → 90% → 110% → 100%) | 480ms |
| ✕ | gira 90° | 260ms |
| desfazer / outras | dá uma volta para trás | 420ms |
| voltar / avançar | anda 5px na direção da seta e volta | 300ms |
| livro | fecha e abre (largura 15%) | 340ms |
| abajur | balança preso no topo | 650ms |
| estante | os livros sacodem | 450ms |
| perfil | acena com a cabeça | 360ms |
| ideia | pisca e acende | 420ms |
| enviar | dispara para cima e volta por baixo | 420ms |
| busca | cresce e inclina | 360ms |
| gostei / não gostei | o polegar sobe / desce | 380ms |
| lixeira | sacode | 420ms |

Botão desativado não anima. Pelo teclado, o aperto acontece rápido (90ms) e o ícone reage igual. Hover continua só no fundo, com mouse.

**Livros chegando na estante ("Um por um"):** escolhido em 2026-11-18 em `botoes.html`. Enquanto a página entra, os livros das três primeiras prateleiras deslizam da borda direita até o lugar, um atrás do outro (45ms entre eles, no máximo 10 por prateleira; 60ms entre prateleiras; começa aos 300ms), e se amassam um pouco ao encostar (86% de largura, volta em seguida). 520ms por livro. Só ao abrir a página; dar nota ou tirar um livro não repete. Com movimento reduzido, os livros já estão no lugar.

**Transição entre páginas ("Paralaxe"):** escolhida em 2026-11-18 entre Deslizar, Paralaxe, Crescer do ícone e Virar página. A página nova entra pela direita em 420ms (`--ease-drawer`); ao mesmo tempo, o topo, a cena e a busca da home recuam 28% para a esquerda e caem para 55% de opacidade. Ao voltar, tudo faz o caminho inverso em 280ms. Vale para a estante e o baralho. Com movimento reduzido, a página só aparece em fade de 150ms e a home fica parada.

**Baralho aparecendo ("Do livro"):** escolhido em 2026-11-18 entre Do livro, Dar as cartas e Leque. Ao fim da busca, o baralho abre sozinho: a página surge em fade de 260ms (sem paralaxe, para o mascote da home continuar visível) e as três cartas saem do livro que o mascote segura, de 8% do tamanho e 14° de giro até o lugar delas, em 600ms (`--ease-out`), 80ms uma atrás da outra. O balão da home some antes, para não aparecer por baixo do fade. Aberto por outro caminho, as cartas descem do topo. Com movimento reduzido, as cartas já estão no lugar.

**Troca dia/noite:** cores em 600ms (ease), feixe em 700ms; ao acender, a lâmpada pisca duas vezes em 220ms. O mascote se assusta e comenta.

**Toque no abajur ("Puxou a cordinha"):** escolhido em 2026-11-18 em `design-explorations/lampada.html`. Ao trocar dia/noite, pelo ícone do topo ou tocando na cúpula, o abajur dá um tranco para baixo e volta quicando, como quando se puxa a cordinha. Mola em `translateY` (rigidez 320, amortecimento 15, impulso 440px/s): desce ~11px e assenta em ~0,7s. Toques seguidos somam ao movimento em vez de reiniciar. Com movimento reduzido, não há tranco.

- O mascote se move por molas (sem duração fixa), definidas em `mascote.js`. Olhos reagem antes da cabeça.
- A poeira no feixe flutua devagar (9 a 15s, ida e volta).
- Estante: a página entra com a Paralaxe (acima), com o conteúdo já dentro, sem cascata além do "Um por um". O detalhe do livro sobe de baixo com os mesmos tempos. Lombadas sobem 6px no hover, só com mouse. Ideias no balão chegam junto com o balão, sem cascata.
- Baralho: depois da busca, entra com o "Do livro"; sai com a Paralaxe. Arrastar segue o dedo (rotação de 0,05° por px); solto, o card volta em 300ms se não passou do limite (110px, ou 60px num gesto rápido). Passou: sai para o lado com 22° de giro em 280ms; "já li" sai para cima. A pilha de trás sobe junto. Desfazer traz o card de volta pelo mesmo caminho em 300ms. No modo "já li", os selos de livro aparecem no ✕ e no ♥ (150–200ms).
- Com `prefers-reduced-motion: reduce`: a entrada vira um fade de 200ms da tela inteira; o texto não voa; sem poeira, sem pulos, sem respiração e sem manias do mascote; o balão só faz fade; cores trocam direto. O olhar ainda segue o dedo.

## 5. Layout

**Mobile (referência 390 × 844):** uma coluna, três faixas fixas.

1. **Topo (62px):** "lombada" à esquerda; à direita três botões de ícone de 44px: abajur (dia/noite), estante (com contador), perfil.
2. **Cena (o resto):** o mascote fica no fim da cena, logo acima da busca. O abajur é preso a ele, não ao topo: a cúpula fica sempre 150px acima do mascote (170px no desktop) e o fio estica até o teto, passando por trás do topo. Assim a luz cai no mascote em qualquer altura de tela e não sobra vazio de dia (revisão D1). O balão fica entre a cúpula e o mascote (até 270px de largura; 300px quando mostra ideias, quando pode cobrir a cúpula).
3. **Barra de busca (embaixo, na zona do polegar):** margem de 8/14/24px mais a área segura do aparelho; dentro, ícone de ideia, campo e botão de enviar.

Sugestões não ocupam espaço fixo: só aparecem no balão quando a pessoa toca no ícone de ideia (rodada 3 e 4).

**Desktop (a partir de 900px de largura do app, por container query):** a mesma cena, sem colunas novas. O topo ganha mais respiro (24/36px), o abajur cresce 20%, o mascote para 244px e a barra de busca fica centrada com no máximo 620px. A estante é a mesma página, com o conteúdo numa coluna de até 880px; o detalhe do livro fica centralizado com 480px. O onboarding fica numa coluna central de até 520px. Fase 4, `prototipo.html`.

## 6. Componentes

- **Topo.** Marca + três botões de ícone de 44px. O contador da estante some em 0 e vira "99+" acima de 99. O perfil abre a página Você (abaixo). Rodada 4.
- **Abajur.** Elemento de cena, não decoração: acende à noite, apaga de dia. Tocar na cúpula troca o tema, igual ao ícone do topo. Rodada 3.
- **Balão.** Dois modos. *Fala*: uma frase curta. *Ideias*: título contextual ("Pra hoje à noite, eu iria de:"), três itens com ícone, título e motivo, e rodapé com "Outras" e "Fechar". Tocar numa ideia preenche o campo e busca. As ideias nunca são sorteadas; cada uma diz por que está ali. Rodada 4.
- **Barra de busca.** Ícone de ideia à esquerda (pede as sugestões), campo em Newsreader, botão de enviar que fica cinza vazio e vermelho com texto. O campo cresce até 4 linhas e depois rola; Enter busca, Shift+Enter quebra linha. Rodada 4, variante A; crescimento definido na fase 4.
- **Voz do mascote.** Amigo que provoca: frases curtas, informais ("pra", "tô"), uma piada por fala no máximo, sem travessão, sem frase de efeito no fim, sem explicar o app. Cada situação tem um banco de falas e o mascote sorteia sem repetir a anterior; na primeira visita a primeira fala é sempre "Largou mais um no capítulo 3?". Situações: abrindo, ouvindo, parado (10s, uma vez por pausa), prestes a dormir (17s; dorme aos 20s), acordando, procurando, busca demorando (2s), resultado; e, no baralho, abrindo, curtiu, rejeitou, três rejeições seguidas, perguntando se já leu, desistindo da pergunta, já li e amei, já li e não gostei, fim do lote ("Quatro de dez. Os próximos vêm com esses na cabeça."; nenhum: "Nenhum te pegou. Me conta de outro jeito?"), resgatar um passado no resumo ("Sabia que esse ia voltar."), tirar um amado no resumo ("Esfriou rápido, hein."), conexão caiu no baralho ("Caiu a conexão. Pode seguir, eu guardo tudo aqui."), voltou ("Voltou a conexão. Já subi tudo.") e fim do lote sem conexão ("Os próximos dez chegam quando a conexão voltar."); as das telas novas foram escolhidas em 2026-11-19 em `design-explorations/fechamento.html`. O banco completo, numerado, está em `design-explorations/texto.html` (fase 7, 2026-11-18); o protótipo usa todas, inclusive as do baralho. Mensagens que pedem ação (erro, envio vazio) têm uma fala só e dizem o que fazer: "Perdi a conexão no meio da busca. Tenta de novo?", "Escreve qualquer coisa, ou me pede uma ideia.".
- **Termos fixos.** "Buscar" é o verbo da busca em todo lugar ("Buscar", "Buscar um livro", "Buscar parecidos"); nunca "procurar". "Estante" é só o lugar dos livros curtidos; não usar a palavra em metáfora de erro.
- **Balão com ação.** Para erro e resultado, a fala ganha um botão dentro do balão ("Tentar de novo"). O erro mostra o ícone de sem conexão antes da frase. Fase 4.
- **Estante.** Página própria (revisão D2, opção A · Prateleiras, escolhida em 2026-11-18 em `design-explorations/estante.html`). Topo com "Voltar", "Sua estante" e a contagem. Embaixo do topo, o mascote (112px) debaixo de um abajur pequeno, com um balão que comenta a quantidade ("3 livros. Bom começo.", "12 livros. Tá ficando bonita.", "40 livros. Isso já é um sebo."). Depois, prateleiras com lombadas em pé: título em Newsreader 12,5px na vertical, largura de 30, 36 ou 46px conforme o tamanho do título, altura variada, cor de pano por livro; a última prateleira mostra até dois espaços tracejados esperando os próximos. As prateleiras quebram pela largura disponível (no desktop, coluna de até 880px). Tocar numa lombada abre o detalhe numa folha de baixo (diálogo): capa, título, autor, ano e páginas, sinopse, quando foi guardado e de qual busca veio. Embaixo, "Depois de ler" com 👍 e 👎 só em ícone (marcam e desmarcam; estar na estante não quer dizer que a pessoa gostou depois de ler, e a nota vira sinal para as próximas buscas; o mascote comenta), a lixeira só em ícone ("Tirar da estante") e a lupa ("Buscar parecidos"), quadrada e na cor de destaque por ser a ação principal; volta para a home e busca "Igual …". Tudo numa linha só, só com ícones (ajuste do usuário em 2026-11-18). **Mudar a ordem ("Tirar da prateleira", escolhida em 2026-11-18 em `design-explorations/resumo.html`):** segurar uma lombada por 0,4s (ela encolhe para 95% enquanto carrega) tira o livro da prateleira: ele sobe 10px, inclina −4° e cresce 6% (180ms), e o lugar dele fica tracejado. Arrastando, os vizinhos abrem espaço na hora (300ms, `--ease-out`), inclusive em outra prateleira; perto da borda da página, ela rola. Soltar devolve o livro ao lugar novo em 240ms e o mascote comemora. Mexer mais de 8px antes dos 0,4s é rolagem, não arrasto; toque rápido abre o detalhe. Livro novo entra no fim da última prateleira. Teclado: foco na lombada e Alt com as setas move uma posição; o leitor de tela ouve "Torto Arado: 3º lugar.". Pedido do usuário em 2026-11-18: mais informação, menos texto nos botões. Vazia: uma prateleira só com espaços tracejados, o mascote desconfiado dizendo "Tô esperando o primeiro.", o título "Estante vazia, por enquanto.", uma linha de explicação e "Buscar um livro", só com texto (revisão D3: a lâmpada saiu porque no app ela significa "pedir ideia"), que volta para a home e foca a busca. Esc fecha o detalhe; outro Esc volta para a home.
- **Capa gerada.** Quando o livro não tem capa: retângulo 2:3 na cor do livro, título em Newsreader e autor, tudo proporcional à largura. As cores de capa são conteúdo, não tokens de interface. Fase 4. **Capa carregando ("Capa gerada, depois a foto", escolhida em 2026-11-19 em `fechamento.html`):** a capa gerada aparece na hora, com o título legível; quando a foto chega, ela entra por cima em 200ms (opacidade, `ease-out`). Se a foto não vier, a capa gerada fica. Sem esqueleto e sem brilho em loop.
- **Onboarding.** Três telas na primeira visita, por cima da cena do abajur: mascote, um objeto (nenhum, a barra de busca, duas capas com ✕ e ♥), título em `title`, uma linha em `body`, pontos e o botão principal "Continuar" (por fim, "Começar"). "Pular" no topo; deslizar troca de tela. Pontos inativos em `--color-text-muted` (mínimo 3:1, revisão D4); o leitor de tela ouve "Tela 1 de 3". O abajur também fica preso ao mascote aqui. Fase 4.
- **Baralho.** Página própria, que abre sozinha quando a busca termina, sem botão no meio (pedido do usuário em 2026-11-18) (opção C · Capa cheia, escolhida em 2026-11-18 em `design-explorations/baralho.html`, com os ajustes de `jali.html`). Topo com 28px de respiro: voltar, o texto da busca (até 2 linhas) e a contagem ("1 de 10"). Sem chips do que foi entendido e sem abajur, para não pesar. Card de 306 × 459px com a capa ocupando tudo; embaixo, sobre um degradê escuro, título em Newsreader, autor, ano e páginas, e o motivo com o ícone de ideia. Toque gira o card: sinopse, dados e o crédito da fonte. Duas cartas aparecem atrás. O mascote senta no canto superior direito do card e fala à esquerda dele. Fileira de baixo, sempre a mesma: desfazer (44px), passar (60px), guardar (60px, destaque) e "já li" (44px, ícone de livro). Sem selos de "Guardar"/"Passar" no card durante o arrasto (tirados em 2026-11-18: repetiam demais). Gestos: direita guarda, esquerda passa, para cima "já li"; teclado ← → ↑, Enter gira, Z desfaz, Esc sai. Guardar põe o livro na estante (o contador da home sobe) e desfazer tira. Sem aviso de "Desfazer" na tela, porque o botão já está na fileira. **Fim do lote ("Lista na ordem", escolhida em 2026-11-18 em `design-explorations/resumo.html`):** a fileira de botões sai, o mascote vai para o canto de cima e fala quantos ficaram ("Quatro de dez. Os próximos vêm com esses na cabeça."; nenhum: "Nenhum de dez. Bora tentar outra busca?"). Embaixo, a contagem ("4 amados · 6 passados") e os dez na ordem em que vieram: capa pequena, título, autor e "já lido" quando for o caso, e um ♥ redondo de 44px. ♥ cheio quer dizer que o livro está na estante: tocar num passado guarda, tocar num amado tira, e a contagem, a fala e o contador da home acompanham. Os passados ficam apagados (capa sem cor, título em `--color-text-muted`). Embaixo, "Nova busca" (volta para a home com o campo em foco) e "Mais dez".
- **"Já li" no baralho.** Sem texto novo e sem mudar o layout (pedido do usuário): o botão de livro fica cinza e desativado (35% de opacidade), o desfazer à esquerda vira uma seta de voltar ("Sair do já li"), o ✕ e o ♥ ganham um selo de livro no canto e passam a significar "Já li e não curti" e "Já li e amei" (nomes para leitor de tela trocam junto), e o mascote pergunta com uma fala do banco "ask" (ex.: "Já leu? Coração se gostou, xis se não."). A seta de voltar, ↑ ou Esc cancela, com uma fala do banco "askCancel"; sair do modo não desfaz o último gesto. Ajuste do usuário em 2026-11-18. "Já li e amei" vai para a estante já com 👍 em "Depois de ler" (mudado em 2026-11-18, para o ♥ do resumo querer dizer sempre "está na estante"); "já li e não curti" não vai. Os dois viram sinal para o próximo lote.
- **Você.** Página própria, aberta pelo ícone de perfil, com a mesma Paralaxe da estante (opção C · Área do usuário, escolhida em 2026-11-18 em `design-explorations/resumo.html`). Topo com voltar e "Você". Dois números em Newsreader: livros vistos e livros na estante. "Mascote": o fantasma pequeno e o nome (a troca de mascote entra aqui depois). "Buscas": o histórico, mais recente em cima; cada linha tem o texto da busca, a data, "N amados · N passados" e até três capas dos amados. Toda busca entra sozinha quando o primeiro card é julgado, sem botão de salvar; "Mais dez" abre uma linha nova. Tocar numa busca abre o resumo dela numa folha de baixo, igual ao fim do baralho, com o ♥ funcionando do mesmo jeito, e "Buscar de novo" fixo no pé da folha, que volta para a home e refaz a busca. No desktop, coluna de até 640px.
- **Mover no detalhe.** Na lista de informações do detalhe do livro, a linha "3º de 40 na estante" com dois botões redondos de 44px, ‹ e ›, que movem o livro uma posição (desativados nas pontas). O foco fica no botão e o leitor de tela ouve "Torto Arado: 4º lugar.". É o caminho de um toque só para quem não arrasta (revisão de 2026-11-19, WCAG 2.5.7).
- **Botão principal.** Fundo `--color-accent`, texto `--color-on-accent`, 48 a 52px de altura, `--radius-lg`. Um por tela. Fase 4.

## 7. Estados e volumes

| Elemento | Volume esperado | Comportamento |
| --- | --- | --- |
| Texto da busca | 2 a ~300 caracteres | cresce até 4 linhas, depois rola dentro do campo |
| Envio vazio | — | mascote desconfiado: "Escreve qualquer coisa, ou me pede uma ideia." |
| Carregando | 1 a 6 s | mascote "lendo" com livro; "Lendo as orelhas." |
| Resultado | 10 livros | o baralho abre sozinho, com as cartas saindo do livro do mascote ("Do livro"); o mascote do baralho fala do banco "deckStart" |
| Baralho | 10 por lote | contagem "N de 10"; ao fim, o resumo em lista com "Nova busca" e "Mais dez"; três passes seguidos fazem o mascote pedir uma nova busca |
| Histórico | 0 a muitas buscas | vazio: "Nenhuma busca ainda."; a lista rola dentro da página Você |
| Parado | 10 / 17 / 20 s sem toque | aos 10s puxa conversa (uma vez), aos 17s avisa que vai dormir, aos 20s dorme e o balão some; o próximo toque acorda com susto e uma fala de "acordando" |
| Estante | 0, 3, 40 livros | contador some em 0; "99+" acima de 99 |
| Sem resultado | 0 livros | o baralho não abre; o mascote, desconfiado, diz "“vampiro no sertão” eu não tenho. Chega perto?" (busca com mais de 32 caracteres: "Isso eu não tenho. Chega perto?") e o balão largo traz três buscas vizinhas no formato de "Pedir ideia", sem "Outras"; tocar numa busca faz a busca (opção C de `fechamento.html`) |
| Sem conexão no baralho | — | os dez já estão no aparelho, então tudo continua; ♥ e ✕ ficam guardados e sobem quando a conexão volta. O ícone de sem conexão aparece ao lado da contagem ("Sem conexão" para o leitor de tela) e o mascote avisa uma vez; no fim do lote, "Mais dez" fica desativado até voltar. Ao voltar, o ícone some e o mascote avisa (opção C de `fechamento.html`) |
| Erro de rede | — | mascote surpreso, depois desconfiado; "Perdi a conexão no meio da busca. Tenta de novo?" com o botão "Tentar de novo" |
| Estante vazia | 0 livros | estado vazio descrito em §6; o contador some |
| Estante cheia | 40+ livros | prateleiras rolam dentro da página; o topo fica fixo; nenhum título corta (medido com 40 títulos reais) |
| Primeira visita | uma vez | onboarding de 3 telas; depois, a home |

## 8. Regras de revisão

| # | Regra | Por quê | Vale para |
| --- | --- | --- | --- |
| R1 | Nenhum texto corta: placeholder, lombada e rótulo cabem na largura de 390px, medidos | o mesmo corte apareceu três vezes nos playgrounds (lombadas, placeholder duas vezes) | todo texto de interface |
| R2 | Alvo de toque com no mínimo 44px | brief | botões, ícones, itens do balão |
| R3 | Foco visível igual ao hover | quem usa teclado | tudo que é clicável |
| R4 | Movimento respeita `prefers-reduced-motion` (ver §4) | brief | mascote, abajur, balão |
| R5 | Cor nunca é o único sinal: o botão de enviar muda de cor e de estado; o contador tem número | acessibilidade | estados |
| R6 | Nada essencial depende de animação para aparecer: entradas só começam depois que o navegador desenha um quadro, e sem animação a tela já está completa | revisão da fase 6: a entrada deixava a cena sem a busca quando o navegador não animava (miniatura, aba em segundo plano) | entradas e coreografias |
| R7 | Painel por cima é diálogo: `role="dialog"`, fundo `inert`, foco no painel ao abrir, Esc e toque fora fecham, foco volta para quem abriu | revisão da fase 6: o foco escapava da estante; repetido no detalhe do livro | estante, detalhe, qualquer folha futura |
| R8 | IDs dentro de SVG são únicos por instância (prefixo + número) | um gradiente com o mesmo ID do corpo do mascote apagou o fantasma | abajur, mascote, ícones |
| R9 | O leitor de tela ouve só o que muda o que a pessoa pode fazer: carregando, resultado, erro, ideias; falas de enfeite ficam fora da região anunciada | revisão da fase 6 | balão do mascote |
| R10 | Página declara o idioma (`lang="pt-BR"`) | WCAG 3.1.1 | todas as páginas |
| R11 | Todo arrasto tem um caminho de um toque só e um de teclado para o mesmo resultado | revisão de 2026-11-19: a estante só reordenava arrastando (WCAG 2.5.7) | estante, baralho, qualquer lista que se reordena |
| R12 | Quando um controle some ou é desativado com o foco nele, o foco vai para o próximo lugar que faz sentido | revisão de 2026-11-19: o foco se perdia quando o décimo card saía pelo botão ♥ (WCAG 2.4.3) | baralho, folhas, listas que mudam |
| R13 | Nada em loop infinito que a pessoa precise esperar: carregamento usa a capa gerada, não esqueleto com brilho | escolha da capa carregando em 2026-11-19 | capas, listas, qualquer espera |

## 9. Proibido

- Cara de assistente de IA: orbe com gradiente roxo ou verde, ícone de brilho ✨, "Como posso te ajudar hoje?", vidro fosco (brief).
- Azul SaaS, roxo de IA, verde menta, cinza neutro sem tom (brief).
- Marca-texto amarelo e frase gigante como título (reprovados na rodada 2).
- Vinho e rosado (reprovados na rodada 2).
- Ícones desenhados à mão para o app e pacotes genéricos tipo Lucide (reprovados nas rodadas 3 e 4).
- Sugestões por sorteio, ou sempre à vista ocupando espaço (rodada 3).
- Travessão no texto da interface; texto que explica o app em parágrafo.
