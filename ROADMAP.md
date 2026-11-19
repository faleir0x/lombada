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

## Contrato da API (rascunho para a sessão visual)

A sessão visual pode trabalhar com dados falsos neste formato desde o primeiro dia.

```http
POST /sessions
{ "vibe": "acabei Torto Arado e nada me prende", "seed_book_id": null }
→ { "session_id": "s_123", "understood": { "chips": ["parecido com Torto Arado", "curto", "realismo"] } }

GET /sessions/{session_id}/next?n=10
→ { "books": [ {
      "id": "OL123W", "title": "...", "authors": ["..."], "year": 1950, "pages": 180,
      "cover": { "url": "...", "source": "openlibrary|google|generated" },
      "synopsis": "...", "why": "linha curta, pode vir null e chegar depois",
      "attribution": { "label": "Open Library", "url": "..." }
  } ] }

POST /sessions/{session_id}/swipes
{ "book_id": "OL123W", "action": "like|dislike|read_loved|read_disliked|skip" }
→ 204

GET /sessions/{session_id}/shelf
→ { "books": [ ...os curtidos... ] }

PATCH /sessions/{session_id}/chips      // remover um chip refaz a busca
{ "remove": ["curto"] }
```

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
- Filtros por metadados: páginas, ano, idioma, "já vi nesta sessão".
- Medir de novo no golden set.
- **Aprende:** quando palavras-chave ganham de embeddings ("livros sobre xadrez") e vice-versa.

### Fase 6: LLM (3 dias)
- **Entender a vibe:** texto livre → JSON validado por schema (assuntos, faixa de páginas, livro-semente, resto da vibe), com nova tentativa em caso de erro. Vira os chips.
- **"Por que combina":** uma linha por livro, gerada só a partir da descrição, sem inventar. Checagem por LLM-como-juiz numa amostra.
- Gerar sob demanda (só o card do topo) e em streaming.
- **Aprende:** saída estruturada, prompts com contexto (RAG em pequena escala), controle de alucinação, custo por requisição.

### Fase 7: Swipe que aprende (2–3 dias)
- Estado da sessão: vistos, curtidos, rejeitados, "já li e amei".
- Ajuste do vetor de busca (Rocchio): aproximar dos curtidos, afastar dos rejeitados; excluir os já vistos.
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
