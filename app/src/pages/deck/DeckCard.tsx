import type { CSSProperties, KeyboardEvent, PointerEvent, Ref } from 'react';
import type { DeckBook } from '../../core/api/types';
import { CoverPhoto } from '../../ui/CoverPhoto';
import { Icon } from '../../ui/icons/Icon';

/* Card do baralho ("Capa cheia", DESIGN.md §6): a capa ocupa tudo; embaixo, sobre um degradê escuro,
   título, autor, ano e páginas, e o motivo com o ícone de ideia. Toque gira o card: sinopse, dados e o
   crédito da fonte. */

export function metaLine(book: DeckBook, pagesWord: 'p.' | 'páginas'): string {
  const parts = [book.authors.join(', ')];
  if (book.year) parts.push(String(book.year));
  if (book.pages) parts.push(`${book.pages} ${pagesWord}`);
  return parts.join(' · ');
}

export function cardLabel(book: DeckBook): string {
  return `${book.title}, ${book.authors.join(', ')}.${book.why ? ` ${book.why}` : ''}`;
}

interface DeckCardProps {
  book: DeckBook;
  depth: number;
  flipped: boolean;
  ref?: Ref<HTMLDivElement>;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: PointerEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

export function DeckCard({ book, depth, flipped, ref, ...handlers }: DeckCardProps) {
  const top = depth === 0;
  return (
    // biome-ignore lint/a11y/useSemanticElements: um card que gira não é um fieldset; group + roledescription é o padrão de carrossel/baralho.
    <div
      ref={ref}
      className="k-cw"
      data-depth={depth}
      data-flipped={flipped}
      tabIndex={top ? 0 : -1}
      role="group"
      aria-roledescription="card"
      aria-label={cardLabel(book)}
      aria-hidden={top ? undefined : true}
      {...(top ? handlers : {})}
    >
      <div className="k-ci">
        <div className="k-face" aria-hidden={flipped}>
          <div className="k-cover" style={{ '--c': book.cover.color } as CSSProperties}>
            <span className="k-mark" aria-hidden="true" />
            {book.cover.url && <CoverPhoto url={book.cover.url} />}
          </div>
          <div className="k-over">
            <h3>{book.title}</h3>
            <p>{metaLine(book, 'p.')}</p>
            {book.why && (
              <p className="k-w">
                <Icon name="idea" />
                <span>{book.why}</span>
              </p>
            )}
          </div>
        </div>
        <div className="k-face k-back" aria-hidden={!flipped}>
          <h3>{book.title}</h3>
          <p className="k-meta">{metaLine(book, 'páginas')}</p>
          <p className="k-syn">{book.synopsis}</p>
          <p className="k-attr">Dados: {book.attribution.label}</p>
        </div>
      </div>
    </div>
  );
}
