# Brand (estado em 2026-11-18)

> Desde a fase 3, os tokens, a tipografia e as regras vivem em `../DESIGN.md`, que vence qualquer outro arquivo. Este aqui guarda o histórico das escolhas por rodada. O `_template.html` já usa os tokens do DESIGN.md.

Ainda não existe marca: o produto é novo e a fase 2 está escolhendo a identidade.
Por isso os playgrounds usam um chrome neutro (papel frio, tinta quase preta, Hanken Grotesk + Archivo largo) que não compete com as opções.

Depois da escolha da direção e do mascote, este arquivo recebe:
- os tokens medidos da direção escolhida (cores claro/escuro, fontes, escala);
- o porquê de cada escolha;
- e o `_template.html` passa a usar esses tokens.

## Decisões (rodada 2, 2026-11-18)
Playground: `home-directions.html` (v2). Rodada 1 em `home-directions-v1.html`.

| Tema | Decisão | Pendente |
|---|---|---|
| Nome | **lombada** | checar marca e domínio |
| Mascote | **fantasma** como padrão (rodada 3; antes coruja); coruja, bibliotecário, corvo e traça ficam salvos em `mascote.js` | futuro: área do usuário para trocar o mascote |
| Paleta | **Grafite e marcador** (rodada 3) | cor do mascote no tema claro |
| Sugestões | só quando a pessoa pede, por um botão próprio; o mascote responde no balão; nada de sorteio | posição do botão |
| Ícones | **Hugeicons** (gratuito, MIT), rodada 4; o conjunto desenhado na rodada 3 e o Lucide foram descartados | — |
| Pedir ideia | **A · ícone dentro do campo**, à esquerda (rodada 4); o fantasma responde com 3 ideias e o motivo de cada | — |
| Mascote de dia | **Marcador**, rodada 4; escurecido para `#D5523B` (3.40:1 contra o fundo) na fase 3 | — |
| Fonte | **Newsreader** (títulos, nome, sugestões) + Hanken Grotesk (interface) | escala tipográfica |
| Direção | **B · Abajur** | cores (as atuais foram rejeitadas), ícones, estrutura |

Mascotes salvos em `mascote.js` (motor sem dependências; `new Mascote.Mascot(el, 'coruja')`).
Rodada 3 em `abajur.html` (servir a pasta localmente: `python3 -m http.server 8765` dentro de design-explorations, porque a página carrega `mascote.js`).
O usuário não gostou da cor dos mascotes no tema claro: na rodada 3, a cor da coruja no claro é uma escolha separada.

Pedidos sobre o Abajur:
- trocar as cores;
- ter ícones;
- busca fixa embaixo, na zona do polegar;
- sugestões mais para cima, ocupando menos espaço.

## Chrome provisório
| Token | Claro | Escuro |
|---|---|---|
| bg | #F3F3F0 | #121211 |
| fg | #1B1B19 | #EDEDE8 |
| muted | #6A6A64 | #9A9A93 |
| line | #DCDCD6 | #2C2C29 |
| card | #FBFBF9 | #1A1A18 |

Fontes: Hanken Grotesk (texto), Archivo com largura 112% (títulos).

## Proibido pelo brief
Orbe com gradiente roxo/verde, ✨, "Como posso te ajudar hoje?", vidro fosco, azul SaaS, roxo de IA, verde menta, Inter cinza em tudo.
