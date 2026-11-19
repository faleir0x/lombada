# Brief · Home

Fase 1 da design-pipeline. Rascunho para confirmação (2026-11-18).

## Quem chega e por quê
Leitor em ressaca literária: terminou um livro que amou, ou largou três seguidos, e nada prende. Chega meio frustrado e sem paciência para catálogo, lista de "mais vendidos" ou formulário. Quer uma sugestão boa rápido, não um sistema de recomendação.

## O que precisa acontecer
1. Dizer como está ou qual livro amou, em uma frase, ou tocar numa sugestão pronta.
2. Ver o mascote reagir (entendeu, está pensando) e cair no baralho de capas.

Sucesso: da abertura ao primeiro card em menos de 10 segundos, sem ler nada além de uma linha.

O que só este app tem: o mascote que reage ao que você escreve e que tem opinião (tom "amigo que provoca", à la Skunk), e o baralho que aprende a cada swipe.

## Escopo desta rodada (mobile first, web)
- **Home**: mascote, campo da vibe, sugestões prontas (chips), atalho para a estante.
- **Onboarding**: 2 ou 3 telas na primeira visita.
- **Estante**: só o atalho e o estado vazio.
- **Transição**: do envio da vibe até o baralho (carregando, mascote "pensando").
- Fora: o baralho em si, o giro do card, o swipe, a estante cheia. Ficam para a próxima rodada, mas a home já aponta para eles.

## Mascote
- Personagem com opinião, não um orbe de assistente. Olhar que segue o dedo, humores: parado, ouvindo (enquanto digita), pensando, feliz, desconfiado.
- Fase 2 mostra uma galeria ampla (10+ conceitos): bichos leitores variados, figuras como um bibliotecário de barba enorme, objetos de leitura com olhos, formas que mudam. Escolha vendo animado.
- Base técnica: open-bot-avatar (silhueta + dois olhos com volume, sem dependências, gera SVG/frame sem DOM, bom para levar ao mobile) e Fluid (contornos com mola para morph entre humores).

## Tom
Amigo que provoca. Frases curtas, uma piada por tela no máximo, nunca explicar o que o app faz em parágrafo.
Nome do app: 5 propostas na fase 2.

## Estados e limites reais
- Vibe digitada: de 2 palavras ("algo triste") a ~300 caracteres.
- Primeira visita vs. volta (estante com 0, 3 ou 40 livros).
- Carregando: 1 a 6 s (LLM + busca). Erro de rede. Vibe que não deu em nada.
- Capas da Open Library variam muito de qualidade e proporção; algumas faltam e viram capa gerada.

## Restrições
- Web mobile first agora; app nativo depois: tokens e mascote precisam ser portáveis (nada preso ao DOM).
- PT-BR. Movimento respeita `prefers-reduced-motion`. Alvos de toque ≥ 44px.
- Só artefatos nesta sessão; nada de código pesado.

## O que não pode aparecer (anti-metas)
- Cara de IA: orbe com gradiente roxo/verde, ícone de brilho ✨, "Como posso te ajudar hoje?", vidro fosco genérico, Inter cinza em tudo.
- Cores genéricas (azul SaaS, roxo de IA, verde menta).
- Layout de landing page, texto que se explica demais, copy mal escrita.
- As referências de apps de IA servem só para estrutura (mascote no centro, campo embaixo, chips).

## Decisões abertas (não inventar)
- Forma do mascote (fase 2).
- Nome do app (fase 2).
- Claro, escuro ou os dois como padrão (fase 2 mostra os dois).
