import type { Cover, Result } from '../core/api/types';
import { GeneratedCover } from './Cover';
import { Icon } from './icons/Icon';
import './summary.css';

/* Resumo em lista ("Lista na ordem", DESIGN.md §6): fim do baralho e buscas antigas. ♥ cheio quer dizer
   que o livro está na estante; tocar num passado guarda, tocar num amado tira. Os passados ficam apagados. */

export interface SummaryItem {
  id: string;
  title: string;
  authors: string[];
  cover: Cover;
  result: Result;
  onShelf: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "4 amados · 6 passados" */
export const countsLine = (loved: number, passed: number) =>
  `${plural(loved, 'amado', 'amados')} · ${plural(passed, 'passado', 'passados')}`;

export function summaryHeader(items: SummaryItem[]): string {
  const loved = items.filter((i) => i.onShelf).length;
  return countsLine(loved, items.length - loved);
}

export function Summary({
  items,
  onToggle,
  label = 'Resumo do baralho',
  className,
}: {
  items: SummaryItem[];
  onToggle(item: SummaryItem): void;
  label?: string;
  className?: string;
}) {
  return (
    <ul className={className ? `gl ${className}` : 'gl'} aria-label={label}>
      {items.map((item) => {
        const author = item.authors.join(', ');
        const read = item.result === 'read_loved' || item.result === 'read_disliked';
        return (
          <li key={item.id} className={item.onShelf ? undefined : 'off'}>
            <GeneratedCover
              title={item.title}
              author={author}
              color={item.cover.color}
              width={34}
              photo={item.cover.url}
            />
            <div className="lt">
              <b>{item.title}</b>
              <span>
                {author}
                {read ? ' · já lido' : ''}
              </span>
            </div>
            <button
              className="hb"
              type="button"
              aria-pressed={item.onShelf}
              aria-label={`Amei ${item.title}`}
              onClick={() => onToggle(item)}
            >
              <Icon name="heart" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
