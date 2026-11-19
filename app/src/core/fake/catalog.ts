import type { Book, BookId } from '../api/types';

/* Livros de exemplo da API falsa: os 40 da estante e os 10 do baralho do protótipo
   (design-explorations/prototipo.html), sem repetir. Sinopses e "por que combina" escritos para o
   exemplo; número de páginas aproximado. Nada aqui vai para produção. */

export interface CatalogBook extends Book {
  /** "Por que combina" de exemplo, independente da busca. */
  why: string;
}

// Cores de pano do protótipo, na mesma ordem.
const CLOTH = [
  '#2F4A3F',
  '#7A2E3A',
  '#2E3550',
  '#7A5428',
  '#3E3A5C',
  '#4F5E33',
  '#6E2F2A',
  '#24414F',
  '#5E4E2A',
  '#4A2E3F',
];

type Row = [
  id: string,
  title: string,
  author: string,
  year: number,
  pages: number,
  synopsis: string,
  why: string,
];

// Ordem e cores iguais ao RAW do protótipo: a cor é CLOTH[índice % 10].
const SHELF_ROWS: Row[] = [
  [
    'torto-arado',
    'Torto Arado',
    'Itamar Vieira Junior',
    2019,
    264,
    'Duas irmãs crescem numa fazenda no sertão da Bahia, marcadas por um acidente na infância com a faca da avó. Terra, trabalho e a herança da escravidão, contados por elas.',
    'Terra, irmãs e uma voz que não larga você.',
  ],
  [
    'a-hora-da-estrela',
    'A hora da estrela',
    'Clarice Lispector',
    1977,
    88,
    'Um narrador conta a vida de Macabéa, datilógrafa alagoana no Rio de Janeiro, pobre e quase invisível, que não sabe que é infeliz.',
    'Cabe numa noite e fica uma semana.',
  ],
  [
    'o-avesso-da-pele',
    'O avesso da pele',
    'Jeferson Tenório',
    2020,
    192,
    'Pedro reconstrói a vida do pai, professor negro morto numa abordagem policial em Porto Alegre, e com ela a história do próprio país.',
    'Pai, filho e o país inteiro num livro curto.',
  ],
  [
    'dom-casmurro',
    'Dom Casmurro',
    'Machado de Assis',
    1899,
    256,
    'Bentinho, já velho, conta o amor por Capitu desde a infância e tenta provar que foi traído. Quem decide se acredita nele é você.',
    'Narrador suspeito, e você vira o juiz.',
  ],
  [
    'grande-sertao-veredas',
    'Grande sertão: veredas',
    'João Guimarães Rosa',
    1956,
    560,
    'Riobaldo, ex-jagunço, conta a um visitante as guerras do sertão, o pacto que talvez tenha feito com o diabo e o amor calado por Diadorim.',
    'Longo, mas é o sertão inteiro falando.',
  ],
  [
    'vidas-secas',
    'Vidas secas',
    'Graciliano Ramos',
    1938,
    180,
    'Uma família de retirantes atravessa o sertão fugindo da seca: Fabiano, Sinhá Vitória, os dois meninos e a cadela Baleia. Capítulos curtos, quase sem diálogo, sobre gente que mal tem palavras para a própria dor.',
    'Sertão, família e terra, como em Torto Arado, em menos de 200 páginas.',
  ],
  [
    'capitaes-da-areia',
    'Capitães da areia',
    'Jorge Amado',
    1937,
    280,
    'Um bando de meninos de rua vive num trapiche abandonado em Salvador, entre furtos, amizade e a liberdade de quem não tem ninguém.',
    'Turma, rua e Salvador. Lê rápido.',
  ],
  [
    'quarto-de-despejo',
    'Quarto de despejo',
    'Carolina Maria de Jesus',
    1960,
    200,
    'O diário de uma catadora de papel na favela do Canindé, em São Paulo, escrito em cadernos que ela achava no lixo.',
    'Uma voz forte contando a própria vida, como Bibiana e Belonísia.',
  ],
  [
    'ensaio-sobre-a-cegueira',
    'Ensaio sobre a cegueira',
    'José Saramago',
    1995,
    312,
    'Uma cegueira branca se espalha por uma cidade sem nome, e os primeiros doentes são trancados num manicômio. Só uma mulher continua enxergando.',
    'Angústia boa, daquelas que prendem.',
  ],
  [
    'cem-anos-de-solidao',
    'Cem anos de solidão',
    'Gabriel García Márquez',
    1967,
    448,
    'Sete gerações da família Buendía fundam, enriquecem e perdem Macondo, entre guerras, amores repetidos e uma chuva que dura anos.',
    'Família enorme e um povoado mágico.',
  ],
  [
    '1984',
    '1984',
    'George Orwell',
    1949,
    416,
    'Winston Smith trabalha reescrevendo o passado para o Partido e começa, em segredo, a duvidar do Grande Irmão.',
    'Distopia que ainda parece notícia.',
  ],
  [
    'o-conto-da-aia',
    'O conto da aia',
    'Margaret Atwood',
    1985,
    368,
    'Numa república religiosa que tomou os Estados Unidos, Offred é obrigada a gerar filhos para um comandante e lembra a vida que tinha antes.',
    'Distopia contada de dentro, baixinho.',
  ],
  [
    'amada',
    'Amada',
    'Toni Morrison',
    1987,
    352,
    'Anos depois de fugir da escravidão, Sethe vive numa casa assombrada pela filha que perdeu, até uma jovem estranha bater à porta.',
    'Fantasma e memória, pesado do jeito certo.',
  ],
  [
    'kindred',
    'Kindred',
    'Octavia E. Butler',
    1979,
    432,
    'Dana, escritora negra na Califórnia de 1976, é puxada várias vezes para uma fazenda escravista de Maryland no século 19.',
    'Viagem no tempo sem nada de aventura fofa.',
  ],
  [
    'a-vegetariana',
    'A vegetariana',
    'Han Kang',
    2007,
    190,
    'Depois de um sonho, Yeong-hye para de comer carne. A recusa parece pequena, mas a família inteira desmorona em volta dela.',
    'Curto, estranho e devastador, como você pediu.',
  ],
  [
    'pachinko',
    'Pachinko',
    'Min Jin Lee',
    2017,
    528,
    'Quatro gerações de uma família coreana tentam sobreviver no Japão, do começo do século 20 aos anos 1980.',
    'Saga de família pra se perder por dias.',
  ],
  [
    'o-sol-e-para-todos',
    'O sol é para todos',
    'Harper Lee',
    1960,
    350,
    'Numa cidadezinha do Alabama, Scout vê o pai defender um homem negro acusado de um crime que não cometeu.',
    'Infância e injustiça pelos olhos de uma menina.',
  ],
  [
    'orgulho-e-preconceito',
    'Orgulho e preconceito',
    'Jane Austen',
    1813,
    424,
    'Elizabeth Bennet e o senhor Darcy se detestam à primeira vista, numa Inglaterra em que casar bem é questão de sobrevivência.',
    'Ironia fina e um romance que funciona até hoje.',
  ],
  [
    'frankenstein',
    'Frankenstein',
    'Mary Shelley',
    1818,
    280,
    'Victor Frankenstein dá vida a uma criatura e foge dela. Abandonada, ela aprende sozinha o que é ser rejeitada.',
    'O monstro é o personagem mais humano.',
  ],
  [
    'o-mestre-e-margarida',
    'O mestre e Margarida',
    'Mikhail Bulgákov',
    1967,
    480,
    'O diabo chega a Moscou com uma comitiva que inclui um gato enorme, enquanto Margarida tenta salvar o escritor que ama.',
    'Absurdo, engraçado e com um gato falante.',
  ],
  [
    'as-cidades-invisiveis',
    'As cidades invisíveis',
    'Italo Calvino',
    1972,
    160,
    'Marco Polo descreve ao imperador Kublai Khan cidades que talvez nunca tenham existido, uma por página.',
    'Dá pra ler uma cidade por noite.',
  ],
  [
    'o-apanhador-no-campo-de-centeio',
    'O apanhador no campo de centeio',
    'J. D. Salinger',
    1951,
    256,
    'Expulso da escola, Holden Caulfield passa três dias vagando por Nova York, irritado com tudo que é falso.',
    'Adolescência irritada, voz inconfundível.',
  ],
  [
    'middlemarch',
    'Middlemarch',
    'George Eliot',
    1871,
    880,
    'A vida de uma cidade inglesa do interior, contada por vários casamentos, ambições e erros, com Dorothea Brooke no centro.',
    'Gente comum escrita com uma paciência rara.',
  ],
  [
    'a-amiga-genial',
    'A amiga genial',
    'Elena Ferrante',
    2011,
    336,
    'Lenù e Lila crescem num bairro pobre de Nápoles nos anos 1950, amigas e rivais desde a primeira página.',
    'Amizade com ciúme, do jeito que é.',
  ],
  [
    'nao-me-abandone-jamais',
    'Não me abandone jamais',
    'Kazuo Ishiguro',
    2005,
    344,
    'Kathy relembra a infância em Hailsham, um internato inglês onde os alunos são criados para um destino que demoram a entender.',
    'Triste e calmo. Vai te pegar devagar.',
  ],
  [
    'a-estrada',
    'A estrada',
    'Cormac McCarthy',
    2006,
    240,
    'Depois de um desastre que ninguém explica, um pai e um filho atravessam a pé um país cinzento, rumo ao sul.',
    'Pouca palavra, muito peso.',
  ],
  [
    'o-processo',
    'O processo',
    'Franz Kafka',
    1925,
    288,
    'Josef K. é preso numa manhã sem saber por quê, e passa o livro tentando entender um tribunal que nunca aparece.',
    'Burocracia virando pesadelo.',
  ],
  [
    'mrs-dalloway',
    'Mrs Dalloway',
    'Virginia Woolf',
    1925,
    208,
    'Um dia de junho em Londres, enquanto Clarissa Dalloway prepara uma festa e um ex-soldado perde o chão do outro lado da cidade.',
    'Um dia só, por dentro da cabeça das pessoas.',
  ],
  [
    'o-som-e-a-furia',
    'O som e a fúria',
    'William Faulkner',
    1929,
    368,
    'A decadência da família Compson, no Mississippi, contada por três irmãos e depois por quem trabalha para eles.',
    'Difícil no começo, inesquecível no fim.',
  ],
  [
    'lavoura-arcaica',
    'Lavoura arcaica',
    'Raduan Nassar',
    1975,
    200,
    'André foge da fazenda da família, e o irmão mais velho vai buscá-lo. Um romance curto, de frases longas, sobre pai, terra e um desejo proibido.',
    'Família rural e segredo, num livro que se lê numa noite comprida.',
  ],
  [
    'memorias-postumas-de-bras-cubas',
    'Memórias póstumas de Brás Cubas',
    'Machado de Assis',
    1881,
    240,
    'Um defunto resolve escrever as próprias memórias e aproveita que já morreu para não poupar ninguém, nem ele mesmo.',
    'Machado rindo de todo mundo.',
  ],
  [
    'macunaima',
    'Macunaíma',
    'Mário de Andrade',
    1928,
    224,
    'O herói sem nenhum caráter sai da floresta para São Paulo atrás de um amuleto roubado, numa aventura feita de lenda e piada.',
    'Brasil em forma de rapsódia doida.',
  ],
  [
    'o-quinze',
    'O quinze',
    'Rachel de Queiroz',
    1930,
    160,
    'A seca de 1915 no Ceará, vista por Conceição, professora na cidade, e pela família de Chico Bento, que parte a pé em busca de trabalho.',
    'Seca e família no Nordeste, em capítulos rápidos.',
  ],
  [
    'lacos-de-familia',
    'Laços de família',
    'Clarice Lispector',
    1960,
    160,
    'Contos em que um momento banal, um ovo ou um cego mascando chiclete, vira uma rachadura na vida de alguém.',
    'Clarice em doses curtas.',
  ],
  [
    'os-maias',
    'Os Maias',
    'Eça de Queirós',
    1888,
    720,
    'Carlos da Maia, jovem médico rico em Lisboa, se apaixona por uma mulher misteriosa, e a história da família cobra o preço.',
    'Lisboa, ironia e um segredo de família.',
  ],
  [
    'duna',
    'Duna',
    'Frank Herbert',
    1965,
    680,
    'Paul Atreides chega com a família a Arrakis, planeta deserto de onde sai a especiaria mais valiosa do universo, e tudo dá errado.',
    'Deserto, política e um mundo inteiro.',
  ],
  [
    'o-hobbit',
    'O Hobbit',
    'J. R. R. Tolkien',
    1937,
    336,
    'Bilbo Bolseiro só queria ficar em casa, mas um mago e treze anões o arrastam atrás de um tesouro guardado por um dragão.',
    'Aventura gostosa, sem 800 páginas.',
  ],
  [
    'a-mao-esquerda-da-escuridao',
    'A mão esquerda da escuridão',
    'Ursula K. Le Guin',
    1969,
    304,
    'Um enviado humano chega a Gethen, planeta gelado onde as pessoas não têm gênero fixo, e precisa ganhar a confiança de um reino.',
    'Ficção científica que faz pensar.',
  ],
  [
    'rebecca',
    'Rebecca',
    'Daphne du Maurier',
    1938,
    448,
    'A nova esposa de Maxim de Winter chega a Manderley e descobre que a casa inteira ainda pertence à primeira mulher dele, que morreu.',
    'Suspense de casa assombrada sem fantasma.',
  ],
  [
    'persepolis',
    'Persépolis',
    'Marjane Satrapi',
    2000,
    352,
    'Em quadrinhos, Marjane conta a infância no Irã durante a revolução islâmica e a guerra, e a adolescência longe de casa.',
    'Quadrinho, rápido e cheio de coragem.',
  ],
];

// Os cinco do baralho do protótipo que não estão na lista acima, com as cores do protótipo.
const DECK_ONLY_ROWS: [...Row, color: string][] = [
  [
    'pedro-paramo',
    'Pedro Páramo',
    'Juan Rulfo',
    1955,
    130,
    'Juan Preciado vai a Comala atrás do pai que nunca conheceu e encontra um povoado de mortos que ainda conversam entre si.',
    'Terra seca e fantasmas. Esse eu tinha que indicar.',
    '#3E3A5C',
  ],
  [
    'menino-de-engenho',
    'Menino de engenho',
    'José Lins do Rego',
    1932,
    150,
    'Carlinhos perde a mãe e vai morar no engenho do avô, na Paraíba. Infância, cana e um mundo que está acabando sem ninguém perceber.',
    'Engenho e família no Nordeste, contados por uma criança.',
    '#5E4E2A',
  ],
  [
    'o-sol-na-cabeca',
    'O sol na cabeça',
    'Geovani Martins',
    2018,
    120,
    'Contos de meninos e rapazes das favelas do Rio, com a gíria e o ritmo de quem vive ali.',
    'Curto, contos, e uma voz que não pede licença.',
    '#2F4A3F',
  ],
  [
    'eles-eram-muitos-cavalos',
    'Eles eram muitos cavalos',
    'Luiz Ruffato',
    2001,
    150,
    'Um único dia em São Paulo, contado em dezenas de fragmentos de vidas que se cruzam sem se ver.',
    'Pedaços curtos que pesam. Dá para ler aos poucos.',
    '#2E3550',
  ],
  [
    'a-paixao-segundo-gh',
    'A paixão segundo G.H.',
    'Clarice Lispector',
    1964,
    180,
    'Uma mulher entra no quarto da empregada, que já foi embora, e encontra uma barata. O resto do livro acontece dentro dela.',
    'Clarice de novo, mais funda que A hora da estrela.',
    '#7A2E3A',
  ],
];

// Cores do baralho do protótipo para os que também estão na estante.
const DECK_COLORS: Record<BookId, string> = {
  'vidas-secas': '#7A5428',
  'quarto-de-despejo': '#24414F',
  'o-quinze': '#6E2F2A',
  'a-vegetariana': '#4F5E33',
  'lavoura-arcaica': '#4A2E3F',
};

function toBook([id, title, author, year, pages, synopsis, why]: Row, color: string): CatalogBook {
  return {
    id,
    title,
    authors: [author],
    year,
    pages,
    synopsis,
    why,
    cover: { url: null, source: null, color },
    attribution: {
      label: 'Open Library',
      url: `https://openlibrary.org/search?q=${encodeURIComponent(title)}`,
    },
  };
}

export const CATALOG: CatalogBook[] = [
  ...SHELF_ROWS.map((row, i) => toBook(row, DECK_COLORS[row[0]] ?? CLOTH[i % CLOTH.length] ?? '#2F4A3F')),
  ...DECK_ONLY_ROWS.map(([id, title, author, year, pages, synopsis, why, color]) =>
    toBook([id, title, author, year, pages, synopsis, why], color),
  ),
];

/** O baralho do protótipo, na ordem em que aparece. A API falsa oferece estes primeiro. */
export const PROTOTYPE_DECK: BookId[] = [
  'vidas-secas',
  'pedro-paramo',
  'quarto-de-despejo',
  'o-quinze',
  'a-vegetariana',
  'lavoura-arcaica',
  'menino-de-engenho',
  'o-sol-na-cabeca',
  'eles-eram-muitos-cavalos',
  'a-paixao-segundo-gh',
];

const BY_ID = new Map(CATALOG.map((b) => [b.id, b]));

export function catalogBook(id: BookId): CatalogBook | undefined {
  return BY_ID.get(id);
}

/** O livro como sai na API, sem o "why" de exemplo. */
export function publicBook(id: BookId): Book {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`Livro fora do catálogo de exemplo: ${id}`);
  const { why: _why, ...book } = b;
  return {
    ...book,
    authors: [...book.authors],
    cover: { ...book.cover },
    attribution: { ...book.attribution },
  };
}
