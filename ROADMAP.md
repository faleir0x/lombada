# Roadmap técnico: Busca por Vibe de Livros

Um app para sair da ressaca literária. A pessoa descreve o que sente ou o último livro que amou, recebe um baralho de capas, gira o card para ver a sinopse e dá swipe (♥ / ✕). Cada swipe melhora as próximas recomendações.

Este arquivo cobre a parte de **AI Engineering** (dados, embeddings, busca, LLM, avaliação, demo pública). A parte visual (baralho, giro, swipe) conversa com ela pelo **contrato da API** abaixo.

**Objetivo do projeto (2026-11-19):** aprender AI Engineering e mostrar o resultado (amigos, LinkedIn). Não haverá produção de verdade. Por isso, quando houver escolha, vale o caminho que ensina mais e gera números para o estudo de caso: por exemplo, hospedar um modelo pequeno (SLM) além de chamar uma API.

## Ordem de trabalho

1. **Primeiro, a parte visual**, nesta máquina: front em React + Vite (`docs/adr/0001-stack.md`) com uma API falsa que segue o contrato abaixo e usa dados de exemplo.
2. **Depois, a parte técnica** (fases 0 a 10), no PC com GPU (tabela abaixo). Na fase 0, meça de novo a tabela de restrições nesse PC, porque ela decide os modelos e o tamanho do recorte.
3. Por fim, trocar a API falsa pela real, sem mexer no front.

## Princípios

1. **Medir antes de melhorar.** Toda mudança (modelo, texto do embedding, prompt) é comparada no golden set. Números entram no estudo de caso.
2. **Buscar sem LLM primeiro.** O LLM entra só depois que a busca vetorial funciona sozinha. Assim dá para saber o que cada peça acrescenta.
3. **Grátis por padrão.** Dados abertos, modelos locais e planos gratuitos. O único gasto previsto são centavos de LLM por API (linha de base e professor do SLM).
4. **Respeitar termos.** Dumps para dados em massa, APIs só para consultas pontuais, crédito às fontes, nada de scraper.

## Máquinas

**PC da parte técnica** (informado em 2026-11-19; medir na fase 0 com `nvidia-smi`, `free -h` e `df -h`):

| Recurso | Valor | Consequência |
|---|---|---|
| CPU | Intel Core i5 de 13ª geração | Ingestão e DuckDB folgados |
| RAM | 32 GB | Dá para carregar o recorte inteiro na memória |
| GPU | NVIDIA RTX 3060, 12 GB de VRAM | Embeddings grandes (`bge-m3`) rápidos; SLM de 7 a 9B quantizado (Q4) inteiro na GPU; fine-tuning QLoRA de modelos de 3 a 8B |
| Disco | SSD (espaço livre a medir) | Decide se baixa o dump ou consulta o Parquet remoto |

**Máquina da parte visual** (medida em 2026-11-18): 4 núcleos sem GPU, 11 GB de RAM, ~27 GB livres. Só para o front; nada de modelo pesado aqui.

## Stack proposta

| Camada | Escolha | Por quê |
|---|---|---|
| Dados e ingestão | Python + DuckDB + Parquet | Padrão da área; DuckDB lê Parquet remoto com SQL |
| Banco | Postgres + pgvector (Docker no PC; Neon se a demo for toda na Cloudflare) | Vetores, full-text e metadados no mesmo lugar |
| Embeddings | Modelo multilíngue local, escolhido na fase 4 entre `multilingual-e5` (small/base), `bge-m3` e BitNet-embedding (0.6B/270M) | Grátis; pergunta em PT e descrição em EN funcionam sem tradução |
| Serviço de busca (API) | Python + FastAPI | Onde mora a IA; mesmo modelo de embedding da ingestão |
| LLM | API (Claude ou DeepSeek) como linha de base e professor; SLM de 7 a 9B auto-hospedado na RTX 3060, comparado no golden set e ajustado por fine-tuning | Vibe → filtros; "por que combina"; aprender a servir e treinar um modelo, não só chamá-lo |
| Servir o SLM | Ollama ou llama.cpp para começar; vLLM depois (no Windows, via WSL2) | API no formato da OpenAI: o FastAPI troca de provedor sem mudar o resto |
| Avaliação | Scripts Python + golden set em arquivo versionado | Reproduzível a cada mudança |
| Observabilidade | Langfuse | Traces, custo e latência por etapa |
| Front | React + TypeScript + Vite, SPA/PWA; Capacitor para o APK (`docs/adr/0001-stack.md`) | Consome a API abaixo; hospedado no Cloudflare Workers (Static Assets) |

**Demo pública (decidir na fase 9, com números):** o front fica no Cloudflare Workers (grátis). Para a IA, dois caminhos:
- **(a) O próprio PC como servidor**, exposto pelo Cloudflare Tunnel (sem abrir porta no roteador): FastAPI, Postgres, embedding e SLM rodando na 3060. Quando o PC estiver desligado, a API cai para um plano B (LLM por API e embedding pelo Workers AI, que só funciona se o mesmo modelo, ex. `bge-m3`, foi usado na ingestão).
- **(b) Tudo na Cloudflare:** FastAPI num Python Worker, embedding pelo Workers AI (`bge-m3`), Postgres + pgvector no Neon via Hyperdrive, LLM por API. A conferir: o limite de 10 ms de CPU por pedido do plano grátis e se o pgvector funciona pelo Hyperdrive.

Preferência do usuário: ecossistema da Cloudflare.

## Contrato da API (versão 0, alinhada ao `DESIGN.md` em 2026-11-19)

A sessão visual trabalha com uma API falsa neste formato desde o primeiro dia. Uma **busca** (`session`) é um lote de dez livros. "Mais dez" abre uma busca nova que continua a anterior; "Buscar de novo" e "Buscar parecidos" abrem uma busca nova do zero.

**Regras gerais**

- **Quem é a pessoa:** na primeira abertura o app chama `POST /users` e guarda o token; toda chamada leva `Authorization: Bearer <token>`. Sem login por enquanto. A estante e o histórico são dessa pessoa.
- **Escritas repetíveis:** `PUT`, `PATCH` e `DELETE` dão o mesmo resultado se chegarem duas vezes. `POST /sessions` aceita `Idempotency-Key` para um reenvio não criar duas buscas. É isso que deixa a fila offline reenviar sem medo.
- **Erro:** `{ "error": { "code": "...", "message": "..." } }`. O front não mostra `message`; quem fala é o mascote.

**Tipos**

```ts
Book = {
  id: "OL123W", title: "...", authors: ["..."], year: 1950 | null, pages: 180 | null,
  synopsis: "...",
  cover: { url: "https://..." | null, source: "openlibrary" | "google" | null, color: "#7A4B3A" },
  attribution: { label: "Open Library", url: "..." }
}
Idea   = { query: "vampiro no Nordeste", reason: "linha curta dizendo por que está aqui" }
Result = "love" | "pass" | "read_loved" | "read_disliked"
```

- `cover.color` sempre vem: é a cor da capa gerada e da lombada na estante.
- **Capa que chega depois:** `cover.url` pode vir `null` e aparecer numa leitura seguinte (`GET /sessions/{id}`, `GET /shelf`). O front desenha a capa gerada na hora (cor, título, autor) e põe a foto por cima em 200ms quando a imagem carrega; se a foto falhar, fica a gerada. A API nunca segura uma resposta esperando capa.

**Preferências**

```http
GET /me
→ { "user_id": "u_1", "mascot": "fantasma" }   // coruja | barba | corvo | fantasma | traca

PATCH /me
{ "mascot": "corvo" }
→ 204
```

- O mascote escolhido na página Mascote vale para o app inteiro e em qualquer aparelho. O front guarda uma cópia no aparelho para desenhar o mascote certo já no primeiro quadro, e manda a troca pela fila de escritas.

**Ideias e busca**

```http
GET /ideas                          // balão "Pedir ideia"; "Outras" chama de novo e vêm outras três
→ { "title": "Pra hoje à noite, eu iria de:", "ideas": [Idea, Idea, Idea] }

POST /sessions
{ "query": "acabei Torto Arado e nada me prende", "seed_book_id": null, "continues": null }
→ 201 { "session_id": "s_123", "query": "...", "created_at": "2026-11-19T21:04:00Z",
        "books": [ Book + { "why": "linha curta" | null } ×10 ], "nearby": [] }

// Sem resultado: o baralho não abre e o balão mostra as buscas vizinhas.
→ 201 { "session_id": "s_124", "query": "vampiro no sertão", "books": [], "nearby": [Idea ×0..3] }

GET /sessions/{session_id}/why?book_ids=OL1,OL2   // "why" que veio null; o front pede o do card do topo
→ { "why": { "OL1": "linha curta", "OL2": null } }
```

- `continues`: o `session_id` da busca anterior quando é "Mais dez". O servidor exclui o que a pessoa já viu e usa os julgamentos de toda a cadeia.
- `seed_book_id`: o livro de "Buscar parecidos" (a busca chega como "Igual …").

**Julgar um card**

```http
PUT /sessions/{session_id}/judgments/{book_id}
{ "result": "love|pass|read_loved|read_disliked", "judged_at": "2026-11-19T21:05:12Z" }
→ 204

DELETE /sessions/{session_id}/judgments/{book_id}   // Desfazer
→ 204
```

- `love` põe o livro no fim da estante, sem nota. `read_loved` põe no fim da estante já com 👍. `pass` e `read_disliked` não põem.
- Desfazer apaga o julgamento e tira da estante o livro que esse julgamento colocou.
- A busca entra no histórico quando recebe o primeiro julgamento. Busca sem nenhum (inclusive a sem resultado) nunca aparece.
- `judged_at` é a hora no aparelho, para a fila offline preservar a ordem real.

**Histórico (página Você) e resumo**

```http
GET /sessions?cursor=...            // só buscas com julgamento, mais recente primeiro
→ { "sessions": [ { "session_id": "s_123", "query": "...", "created_at": "...",
                    "loved": 4, "passed": 6, "loved_preview": [Book ×0..3] } ],
    "next_cursor": null }

GET /sessions/{session_id}          // resumo do fim do baralho e da folha de uma busca antiga
→ { "session_id": "s_123", "query": "...", "created_at": "...", "continues": null,
    "books": [ Book + { "result": Result | null, "on_shelf": true } ×10 ] }   // na ordem do baralho
```

```http
DELETE /sessions                    // "Apagar buscas" na página Você
→ 204
```

- Apaga o histórico e os vistos (todos os julgamentos). A estante fica como está, inclusive "Da busca …" de cada livro; só deixa de haver julgamento para desfazer.

- **♥ sempre quer dizer "está na estante".** `on_shelf` é o estado atual da estante, não o julgamento: um livro tirado pela lixeira do detalhe aparece com ♥ vazio no resumo da busca de onde veio.
- `loved` conta os julgados que estão na estante agora; `passed`, os julgados que não estão. O resumo lista só os livros com `result` diferente de `null`, e marca "já lido" quando `result` começa com `read_`.

**Mudar o ♥ depois (resumo do fim do baralho ou de uma busca antiga)**

```http
PUT /shelf/{book_id}                // ♥ cheio: guarda um passado
{ "from_session": "s_123" }
→ 204

DELETE /shelf/{book_id}             // ♥ vazio: tira um amado (também a lixeira do detalhe)
→ 204
```

- O `result` da busca não muda; o servidor registra a mudança como sinal para os próximos lotes.
- Um livro `read_loved` que volta para a estante volta com 👍.

**Estante**

```http
GET /shelf
→ { "books": [ Book + { "position": 1, "rating": "up" | "down" | null, "added_at": "...",
                        "from": { "session_id": "s_123", "query": "..." } | null } ] }   // por position

PATCH /shelf/{book_id}
{ "position": 4 }                   // 1 é a primeira; os outros andam (arrasto, Alt+setas, ‹ ›)
→ 204

PATCH /shelf/{book_id}
{ "rating": "up" | "down" | null }  // "Depois de ler"; null desmarca
→ 204
```

- A estante é uma só por pessoa. Livro novo entra no fim.

**Sem conexão**

- O front guarda as escritas numa fila no aparelho (IndexedDB): método, caminho, corpo e chave. Ela sobe na ordem, uma por vez, quando a conexão volta e quando o app abre.
- Resposta 2xx, 404 ou 409 tira da fila; erro de rede ou 5xx para a fila e tenta de novo depois.
- No baralho, os dez livros já estão no aparelho, então julgar, desfazer e mudar o ♥ no resumo funcionam sem conexão. "Mais dez" e buscas novas esperam a conexão.

## Fases

Os prazos são estimativas para meio período. Se apertar, corte escopo, nunca a avaliação.

### Fase 0: Fundação (½ dia)
- Repositório git, projeto Python com `uv`, Postgres + pgvector via Docker Compose, arquivo `.env.example`.
- Contrato da API acima congelado na versão 0.
- **Aprende:** nada de IA ainda; só deixar o terreno pronto.

### Fase 1: Explorar os dados (1–2 dias)
- Abrir o Parquet da Open Library com DuckDB e responder com números: quantas obras têm descrição? Em que idioma? Quantas têm assuntos, número de páginas, capa (na obra e em alguma edição), ISBN? Quantos livros em português?
- Usar os dumps de avaliações e de "quero ler" para medir popularidade.
- **Entrega:** `notebooks/01-explorar.ipynb` + um resumo com os números e a escolha do recorte (~20 mil livros).
- **Aprende:** que dado real é bagunçado, e como isso decide o resto do projeto.

### Fase 2: Ingestão (2–3 dias)
- Pipeline reexecutável: selecionar o recorte → juntar obras + edições (capa, páginas, ISBN) → limpar descrições → montar o "documento" de cada livro (o texto que vira embedding) → gravar no Postgres.
- Cadeia de capas: obra (OL) → alguma edição (OL) → Google Books por ISBN (com crédito) → capa gerada.
- **Entrega:** `ingest/` com testes simples; tabela `books` populada.
- **Aprende:** ETL para IA, e por que o texto escolhido para o embedding importa tanto quanto o modelo.

### Fase 3: Embeddings e busca vetorial (2–3 dias)
- Gerar os embeddings em lote, criar índice HNSW no pgvector, endpoint de busca **sem LLM**.
- Uma página mínima (ou um script) para digitar uma vibe e ver os 10 primeiros.
- **Aprende:** o que é um embedding, similaridade de cosseno, índice aproximado (HNSW) e seus parâmetros.

### Fase 4: Golden set e avaliação (2 dias), o coração do projeto
- 25 a 40 vibes de teste escritas por você, cada uma com livros que *deveriam* aparecer e livros que *não* deveriam.
- Métricas: precisão@10 (quantos dos 10 fazem sentido, julgados por você), recall dos esperados, latência.
- Experimentos: modelos de embedding (`multilingual-e5` small/base, `bge-m3`, BitNet-embedding 0.6B/270M) × 2 ou 3 formas de montar o documento (só descrição; + assuntos; + resumo da Wikipedia). Anotar também tempo de ingestão e memória na 3060.
- **Entrega:** `eval/` + tabela de resultados versionada; decisão do modelo de produção.
- **Aprende:** avaliação offline, que é o que separa um AI Engineer de quem só chama API.

### Fase 5: Busca híbrida e filtros (2 dias)
- Full-text do Postgres + vetores, combinados por Reciprocal Rank Fusion.
- Filtros por metadados: páginas, ano, idioma, "já vistos por esta pessoa".
- Medir de novo no golden set.
- **Aprende:** quando palavras-chave ganham de embeddings ("livros sobre xadrez") e vice-versa.

### Fase 6: LLM (5 a 7 dias)

Três passos, com as mesmas tarefas (abaixo) e o mesmo golden set:

1. **Linha de base pela API** (Claude ou DeepSeek), com saída estruturada. Deixa traces e avaliação funcionando de ponta a ponta e serve de professor para o passo 3.
2. **SLM auto-hospedado na RTX 3060:** modelo de 7 a 9B com bom português (família e versão escolhidas na hora, porque esse cenário muda rápido), quantizado em GGUF. JSON garantido por gramática (decodificação restrita). Comparar com a API em qualidade, latência (tokens por segundo, tempo até o primeiro token) e custo.
3. **Fine-tuning por destilação (QLoRA, na própria 3060):** o modelo da API gera exemplos de "vibe → filtros", você revisa, o SLM aprende. Medir de novo. Se o modelo pequeno treinado empatar com a API, essa é a melhor história do estudo de caso.

Tarefas:
- **Entender a vibe:** texto livre → JSON validado por schema (assuntos, faixa de páginas, livro-semente, resto da vibe), com nova tentativa em caso de erro. Os filtros não aparecem na tela (o baralho não mostra o que foi entendido); vão para o trace e para o golden set.
- **Buscas vizinhas:** quando a busca não acha nada, três buscas próximas com o motivo de cada uma (`nearby`). O mesmo formato serve às ideias do balão (`GET /ideas`).
- **"Por que combina":** uma linha por livro, gerada só a partir da descrição, sem inventar. Checagem por LLM-como-juiz numa amostra.
- Gerar sob demanda (só o card do topo) e em streaming.
- **Aprende:** saída estruturada, prompts com contexto (RAG em pequena escala), controle de alucinação, custo por requisição; e, no SLM, quantização, KV cache, decodificação restrita, servir modelo (Ollama, llama.cpp, vLLM) e fine-tuning com LoRA.

### Fase 7: Swipe que aprende (2–3 dias)
- Sinais: julgamentos da busca e das anteriores ligadas por "Mais dez", ♥ mudado depois no resumo, estante e notas de "Depois de ler".
- Ajuste do vetor de busca (Rocchio): aproximar de ♥, "já li e amei" e 👍; afastar de ✕, "já li e não curti" e 👎; excluir os já vistos e os que estão na estante.
- Avaliação por simulação: um "usuário simulado" que dá swipe usando os rótulos do golden set; medir a taxa de like ao longo de 20 swipes, com e sem o ajuste.
- **Aprende:** feedback implícito, relevance feedback e como avaliar um sistema interativo sem usuários reais.

### Fase 8: Enriquecimento (opcional, 2 dias)
- Resumos de enredo da Wikipedia (CC BY-SA) usados **só no embedding**, nunca exibidos (spoilers).
- Ganho medido no golden set; mantém só se melhorar.

### Fase 9: Demo pública (2–3 dias)
- Langfuse: um trace por requisição, com etapas de embedding, busca, LLM, tokens, custo e latência; swipes enviados como feedback.
- Cache, limite de requisições por IP, teto de gasto na conta do LLM, chaves só no servidor.
- Proteção básica contra prompt injection: texto do usuário separado das instruções, saída validada, nenhuma ferramenta perigosa.
- Escolher entre o PC como servidor (Cloudflare Tunnel, com plano B) e tudo na Cloudflare (ver "Demo pública" acima), com os números das fases 4 e 6, e registrar numa ADR.
- Deploy do front, da API e do banco.

### Fase 10: História (1–2 dias)
- Estudo de caso: o problema (ressaca literária), as decisões e por quê, a tabela de avaliação antes e depois, API × SLM × SLM com fine-tuning, o que deu errado (com traces), próximos passos.
- Material para mostrar: um vídeo curto do app, o link da demo e um post para o LinkedIn.

## Quem faz o quê

| Você | Claude |
|---|---|
| Decisões de produto e de stack quando houver escolha real | Propor opções com recomendação e trade-offs |
| Criar contas (Supabase/Neon, Langfuse, provedor de LLM, hospedagem) e aceitar os termos | Dizer exatamente quais contas, planos e variáveis são necessários |
| Colocar as chaves de API no `.env` (nunca colar no chat) | Escrever `.env.example`, o código que lê as chaves, os scripts |
| **Escrever e julgar o golden set**: só você sabe o que tira *você* da ressaca | Rascunhar vibes candidatas, montar a ferramenta de rotular, calcular as métricas |
| Rodar comandos de login (`vercel login`, etc.) e aprovar o deploy | Escrever a configuração de deploy e o checklist |
| Dizer o quanto quer escrever você mesmo | Escrever, explicar e revisar código; rodar ingestão, embeddings, avaliações e treinos no PC da parte técnica; pesquisar documentação e termos |

## Fontes de dados

- [Open Library: dumps](https://openlibrary.org/developers/dumps) e [Covers API](https://openlibrary.org/dev/docs/api/covers) (dados aparentemente CC0; confirmar antes de publicar)
- [Espelho Parquet da Open Library no Hugging Face](https://huggingface.co/datasets/open-index/open-library)
- [Wikipedia: database download](https://en.wikipedia.org/wiki/Wikipedia:Database_download) (CC BY-SA)
- [Google Books: branding](https://developers.google.com/books/branding) (atribuição obrigatória)
