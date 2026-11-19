/* Regras da estante (DESIGN.md §6, "Estante"): tamanho das lombadas, quebra das prateleiras pela largura,
   espaços tracejados, mudar de lugar e a fala do mascote. Puro, para a página e os testes. */

/** Largura da lombada pelo tamanho do título: 30, 36 ou 46px. */
export function spineWidth(title: string): number {
  if (title.length > 20) return 46;
  if (title.length > 11) return 36;
  return 30;
}

/** FNV-1a: altura estável por livro, sem sorteio. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Altura variada (118 a 158px), mais 18px para título longo, como no protótipo. */
export function spineHeight(id: string, title: string): number {
  return 118 + (hash(id) % 11) * 4 + (title.length > 20 ? 18 : 0);
}

/** Espaço entre lombadas. */
export const SPINE_GAP = 3;
/** Cada espaço tracejado ocupa 30px mais o vão. */
const SLOT_SPAN = 34;

export interface ShelfLayout {
  /** Índices dos livros, prateleira por prateleira. */
  rows: number[][];
  /** Espaços tracejados no fim da última prateleira: até 2 com livros, até 4 na estante vazia. */
  slots: number;
}

/** Quebra as prateleiras pela largura disponível. Sempre há pelo menos uma prateleira. */
export function layoutShelf(widths: readonly number[], available: number): ShelfLayout {
  const max = Math.max(200, available);
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;
  widths.forEach((w, i) => {
    if (row.length && used + w + SPINE_GAP > max) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(i);
    used += w + SPINE_GAP;
  });
  rows.push(row);
  const free = Math.floor((max - used) / SLOT_SPAN);
  return { rows, slots: Math.max(0, Math.min(free, widths.length ? 2 : 4)) };
}

/** Tira o item de from e põe em to (os outros andam). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

/** Fala do mascote da estante pela quantidade. */
export function shelfLine(n: number): string {
  if (n === 0) return 'Tô esperando o primeiro.';
  if (n < 5) return `${n} ${n === 1 ? 'livro' : 'livros'}. Bom começo.`;
  if (n < 20) return `${n} livros. Tá ficando bonita.`;
  return `${n} livros. Isso já é um sebo.`;
}

/** "Torto Arado: 3º lugar." (o que o leitor de tela ouve ao mudar de lugar). */
export const placeLine = (title: string, position: number) => `${title}: ${position}º lugar.`;
