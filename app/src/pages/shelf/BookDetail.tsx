import type { Rating, ShelfBook } from '../../core/api/types';
import { GeneratedCover } from '../../ui/Cover';
import { Icon } from '../../ui/icons/Icon';

/* Detalhe do livro (DESIGN.md §6, "Estante" e "Mover no detalhe"): capa, dados, sinopse, quando foi
   guardado e de qual busca veio, "3º de 40" com ‹ ›, "Depois de ler" com 👍 e 👎, lixeira e "Buscar parecidos".
   Tudo numa linha só, só com ícones. */

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "12 nov" */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()] ?? ''}`;
}

export function BookDetail({
  book,
  position,
  total,
  onMove,
  onRate,
  onRemove,
  onSimilar,
}: {
  book: ShelfBook;
  position: number;
  total: number;
  onMove(direction: -1 | 1): void;
  onRate(rating: Exclude<Rating, null>): void;
  onRemove(): void;
  onSimilar(): void;
}) {
  const author = book.authors.join(', ');
  const meta = [book.year, book.pages ? `${book.pages} páginas` : null].filter(Boolean).join(' · ');
  return (
    <div className="detail">
      <div className="grab" aria-hidden="true" />
      <div className="d-row">
        <GeneratedCover
          title={book.title}
          author={author}
          color={book.cover.color}
          width={96}
          photo={book.cover.url}
        />
        <div className="d-head">
          <h3>{book.title}</h3>
          <p>{author}</p>
          {meta && <p className="d-meta">{meta}</p>}
        </div>
      </div>
      <p className="d-syn">{book.synopsis}</p>
      <ul className="d-info">
        <li>
          <Icon name="cal" />
          <span>Guardado em {shortDate(book.added_at)}</span>
        </li>
        {book.from && (
          <li>
            <Icon name="search" />
            <span>Da busca “{book.from.query}”</span>
          </li>
        )}
        <li className="d-pos">
          <Icon name="shelf" />
          <span>
            {position}º de {total} na estante
          </span>
          {/* biome-ignore lint/a11y/useSemanticElements: grupo de dois botões dentro da linha; fieldset quebraria o layout em linha. */}
          <span className="d-move" role="group" aria-label="Mudar de lugar">
            <button
              className="d-mv"
              type="button"
              data-move="-1"
              aria-label="Uma posição para trás"
              disabled={position === 1}
              onClick={() => onMove(-1)}
            >
              <Icon name="back" />
            </button>
            <button
              className="d-mv"
              type="button"
              data-move="1"
              aria-label="Uma posição para a frente"
              disabled={position === total}
              onClick={() => onMove(1)}
            >
              <Icon name="next" />
            </button>
          </span>
        </li>
      </ul>
      <div className="d-foot">
        {/* biome-ignore lint/a11y/useSemanticElements: grupo de dois botões em linha, com o rótulo visível ao lado. */}
        <div className="d-rate" role="group" aria-label="Depois de ler">
          <span>Depois de ler</span>
          <button
            className="d-rb"
            type="button"
            aria-pressed={book.rating === 'up'}
            aria-label="Gostei"
            onClick={() => onRate('up')}
          >
            <Icon name="up" />
          </button>
          <button
            className="d-rb"
            type="button"
            aria-pressed={book.rating === 'down'}
            aria-label="Não gostei"
            onClick={() => onRate('down')}
          >
            <Icon name="down2" />
          </button>
        </div>
        <div className="d-act">
          <button className="d-ib" type="button" aria-label="Tirar da estante" onClick={onRemove}>
            <Icon name="trash" />
          </button>
          <button className="d-ib d-go" type="button" aria-label="Buscar parecidos" onClick={onSimilar}>
            <Icon name="search" />
          </button>
        </div>
      </div>
    </div>
  );
}
