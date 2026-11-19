import type { Idea, Result } from '../api/types';

/* Estado inicial "exemplo": o mesmo do protótipo (três livros na estante, três buscas no histórico).
   Datas fixas de novembro de 2026, como no protótipo. */

export interface SeedSession {
  query: string;
  created_at: string;
  books: string[];
  results: Result[];
}

const pass = (n: number): Result[] => Array.from({ length: n }, () => 'pass');

// O mais antigo primeiro; o histórico mostra o mais recente em cima.
export const SEED_SESSIONS: SeedSession[] = [
  {
    query: 'Livro brasileiro que dói',
    created_at: '2026-11-12T22:10:00.000Z',
    books: [
      'torto-arado',
      'lavoura-arcaica',
      'memorias-postumas-de-bras-cubas',
      'macunaima',
      'o-quinze',
      'lacos-de-familia',
      'os-maias',
      'duna',
      'o-hobbit',
      'a-mao-esquerda-da-escuridao',
    ],
    results: ['love', 'pass', 'read_disliked', ...pass(7)],
  },
  {
    query: 'Curto e devastador',
    created_at: '2026-11-14T23:02:00.000Z',
    books: [
      'a-hora-da-estrela',
      'as-cidades-invisiveis',
      'o-apanhador-no-campo-de-centeio',
      'middlemarch',
      'a-amiga-genial',
      'nao-me-abandone-jamais',
      'a-estrada',
      'o-processo',
      'mrs-dalloway',
      'o-som-e-a-furia',
    ],
    results: ['love', 'pass', 'pass', 'pass', 'read_disliked', ...pass(5)],
  },
  {
    query: 'Igual Torto Arado',
    created_at: '2026-11-16T21:40:00.000Z',
    books: [
      'o-avesso-da-pele',
      '1984',
      'o-conto-da-aia',
      'amada',
      'kindred',
      'a-vegetariana',
      'pachinko',
      'o-sol-e-para-todos',
      'orgulho-e-preconceito',
      'frankenstein',
    ],
    results: ['love', 'pass', 'pass', 'read_disliked', ...pass(6)],
  },
];

/** Ideias do balão, como no protótipo. O primeiro título muda à noite. */
export const IDEA_SETS: { title: (night: boolean) => string; ideas: Idea[] }[] = [
  {
    title: (night) => (night ? 'Pra hoje à noite, eu iria de:' : 'Pra hoje, eu iria de:'),
    ideas: [
      { query: 'Igual Torto Arado', reason: 'Você curtiu esse' },
      { query: 'Curto e devastador', reason: 'Cabe numa noite' },
      { query: 'Me faz rir', reason: 'Pra equilibrar o resto' },
    ],
  },
  {
    title: () => 'Se quiser fugir do óbvio:',
    ideas: [
      { query: 'Fantasia sem 800 páginas', reason: 'Mundo novo sem maratona' },
      { query: 'Clássico que não dá sono', reason: 'Prometo' },
      { query: 'Pra ler numa sentada', reason: 'Até 150 páginas' },
    ],
  },
];

/** Buscas vizinhas quando não há resultado (opção C de fechamento.html). */
export const NEARBY: Idea[] = [
  { query: 'Terror brasileiro curto', reason: 'assombração no interior' },
  { query: 'Sertão com fantasma', reason: 'Pedro Páramo, Comala' },
  { query: 'Vampiro clássico', reason: 'Drácula, Carmilla' },
];
