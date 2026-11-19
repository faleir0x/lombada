# Roadmap técnico: Busca por Vibe de Livros

Um app para sair da ressaca literária. A pessoa descreve o que sente ou o último livro que amou, recebe um baralho de capas, gira o card para ver a sinopse e dá swipe (♥ / ✕). Cada swipe melhora as próximas recomendações.

Este arquivo cobre a parte de **AI Engineering** (dados, embeddings, busca, LLM, avaliação, produção). A parte visual (baralho, giro, swipe) conversa com ela pelo **contrato da API** abaixo.

## Ordem de trabalho

1. **Primeiro, a parte visual**, nesta máquina: front em React + Vite (`docs/adr/0001-stack.md`) com uma API falsa que segue o contrato abaixo e usa dados de exemplo.
2. **Depois, a parte técnica** (fases 0 a 10), num computador mais forte. Ao trocar de máquina, refaça a tabela de restrições abaixo, porque ela decide o modelo de embedding e o tamanho do recorte.
3. Por fim, trocar a API falsa pela real, sem mexer no front.

## Princípios

1. **Medir antes de melhorar.** Toda mudança (modelo, texto do embedding, prompt) é comparada no golden set. Números entram no estudo de caso.
2. **Buscar sem LLM primeiro.** O LLM entra só depois que a busca vetorial funciona sozinha. Assim dá para saber o que cada peça acrescenta.
3. **Grátis por padrão.** Dados abertos, embeddings locais e planos gratuitos. O único gasto previsto são centavos de LLM.
4. **Respeitar termos.** Dumps para dados em massa, APIs só para consultas pontuais, crédito às fontes, nada de scraper.

## Restrições da máquina (medidas em 2026-11-18, na máquina da parte visual; refazer na máquina da parte técnica)

| Recurso | Valor | Consequência |
|---|---|---|
| CPU | 4 núcleos, sem GPU | Modelos de embedding pequenos ou médios; o grande (`bge-m3`) fica lento |
| RAM | 11 GB (pouco livre em uso normal) | Processar dados em lotes, não tudo na memória |
| Disco livre | ~27 GB | Não baixar o dump inteiro de edições: consultar o Parquet remoto com DuckDB e baixar só as colunas necessárias |
| Já instalado | Docker, Python 3.14, uv, Node 26, pnpm, psql, git | Falta só o DuckDB (vem via `uv`) |

## Stack proposta

| Camada | Escolha | Por quê |
|---|---|---|
| Dados e ingestão | Python + DuckDB + Parquet | Padrão da área; DuckDB lê Parquet remoto com SQL |
| Banco | Postgres + pgvector (Docker local; Supabase ou Neon no deploy) | Vetores, full-text e metadados no mesmo lugar |
| Embeddings | Modelo multilíngue local (ex.: `multilingual-e5-small/base`), comparado com uma API | Grátis; pergunta em PT e descrição em EN funcionam sem tradução |
| Serviço de busca (API) | Python + FastAPI | Onde mora a IA; mesmo modelo de embedding da ingestão |
| LLM | Claude ou DeepSeek, com saída estruturada | Vibe → filtros; "por que combina" |
| Avaliação | Scripts Python + golden set em arquivo versionado | Reproduzível a cada mudança |
| Observabilidade | Langfuse | Traces, custo e latência por etapa |
| Front | React + TypeScript + Vite, SPA/PWA; Capacitor para o APK (`docs/adr/0001-stack.md`) | Consome a API abaixo; hospedado no Cloudflare Workers (Static Assets) |

**Decisão em aberto (fase 0):** como o embedding da *pergunta* roda em produção. Opções: (a) o mesmo modelo local dentro do FastAPI, hospedado num serviço barato; (b) uma API de embeddings para ingestão e consulta. A escolha sai da fase 4, com números.

**Preferência de hospedagem (2026-11-19):** ecossistema da Cloudflare. Isso puxa a decisão acima para a opção (b): um Python Worker não roda modelo local (sem PyTorch, 128 MB de memória), então o embedding viria do Workers AI (`bge-m3`, multilíngue), que precisa entrar na comparação da fase 4. A API seria FastAPI num Python Worker, e o Postgres + pgvector ficaria no Neon, ligado pelo Hyperdrive. A conferir na fase 0: o limite de 10 ms de CPU por pedido do plano grátis, e se o driver de Postgres e o pgvector funcionam pelo Hyperdrive. Plano B: Workers Paid (US$ 5/mês), que sobe a CPU para 30 s e libera Containers para rodar o FastAPI em Docker como está.

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
- Experimentos: 2 ou 3 modelos de embedding × 2 ou 3 formas de montar o documento (só descrição; + assuntos; + resumo da Wikipedia).
- **Entrega:** `eval/` + tabela de resultados versionada; decisão do modelo de produção.
- **Aprende:** avaliação offline, que é o que separa um AI Engineer de quem só chama API.

### Fase 5: Busca híbrida e filtros (2 dias)
- Full-text do Postgres + vetores, combinados por Reciprocal Rank Fusion.
- Filtros por metadados: páginas, ano, idioma, "já vistos por esta pessoa".
- Medir de novo no golden set.
- **Aprende:** quando palavras-chave ganham de embeddings ("livros sobre xadrez") e vice-versa.

### Fase 6: LLM (3 dias)
- **Entender a vibe:** texto livre → JSON validado por schema (assuntos, faixa de páginas, livro-semente, resto da vibe), com nova tentativa em caso de erro. Os filtros não aparecem na tela (o baralho não mostra o que foi entendido); vão para o trace e para o golden set.
- **Buscas vizinhas:** quando a busca não acha nada, três buscas próximas com o motivo de cada uma (`nearby`). O mesmo formato serve às ideias do balão (`GET /ideas`).
- **"Por que combina":** uma linha por livro, gerada só a partir da descrição, sem inventar. Checagem por LLM-como-juiz numa amostra.
- Gerar sob demanda (só o card do topo) e em streaming.
- **Aprende:** saída estruturada, prompts com contexto (RAG em pequena escala), controle de alucinação, custo por requisição.

### Fase 7: Swipe que aprende (2–3 dias)
- Sinais: julgamentos da busca e das anteriores ligadas por "Mais dez", ♥ mudado depois no resumo, estante e notas de "Depois de ler".
- Ajuste do vetor de busca (Rocchio): aproximar de ♥, "já li e amei" e 👍; afastar de ✕, "já li e não curti" e 👎; excluir os já vistos e os que estão na estante.
- Avaliação por simulação: um "usuário simulado" que dá swipe usando os rótulos do golden set; medir a taxa de like ao longo de 20 swipes, com e sem o ajuste.
- **Aprende:** feedback implícito, relevance feedback e como avaliar um sistema interativo sem usuários reais.

### Fase 8: Enriquecimento (opcional, 2 dias)
- Resumos de enredo da Wikipedia (CC BY-SA) usados **só no embedding**, nunca exibidos (spoilers).
- Ganho medido no golden set; mantém só se melhorar.

### Fase 9: Produção (2–3 dias)
- Langfuse: um trace por requisição, com etapas de embedding, busca, LLM, tokens, custo e latência; swipes enviados como feedback.
- Cache, limite de requisições por IP, teto de gasto na conta do LLM, chaves só no servidor.
- Proteção básica contra prompt injection: texto do usuário separado das instruções, saída validada, nenhuma ferramenta perigosa.
- Deploy da API e do banco.

### Fase 10: História (1–2 dias)
- Estudo de caso: o problema (ressaca literária), as decisões e por quê, a tabela de avaliação antes e depois, o que deu errado (com traces), próximos passos.

## Quem faz o quê

| Você | Claude |
|---|---|
| Decisões de produto e de stack quando houver escolha real | Propor opções com recomendação e trade-offs |
| Criar contas (Supabase/Neon, Langfuse, provedor de LLM, hospedagem) e aceitar os termos | Dizer exatamente quais contas, planos e variáveis são necessários |
| Colocar as chaves de API no `.env` (nunca colar no chat) | Escrever `.env.example`, o código que lê as chaves, os scripts |
| **Escrever e julgar o golden set**: só você sabe o que tira *você* da ressaca | Rascunhar vibes candidatas, montar a ferramenta de rotular, calcular as métricas |
| Rodar comandos de login (`vercel login`, etc.) e aprovar o deploy | Escrever a configuração de deploy e o checklist |
| Dizer o quanto quer escrever você mesmo | Escrever, explicar e revisar código; rodar ingestão, embeddings e avaliações nesta máquina; pesquisar documentação e termos |

## Fontes de dados

- [Open Library: dumps](https://openlibrary.org/developers/dumps) e [Covers API](https://openlibrary.org/dev/docs/api/covers) (dados aparentemente CC0; confirmar antes de publicar)
- [Espelho Parquet da Open Library no Hugging Face](https://huggingface.co/datasets/open-index/open-library)
- [Wikipedia: database download](https://en.wikipedia.org/wiki/Wikipedia:Database_download) (CC BY-SA)
- [Google Books: branding](https://developers.google.com/books/branding) (atribuição obrigatória)
