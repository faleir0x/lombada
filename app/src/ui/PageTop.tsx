import type { ReactNode } from 'react';
import { Icon } from './icons/Icon';

/* Topo das páginas: voltar, título e um complemento à direita (contagem). */
export function PageTop({
  titleId,
  title,
  aside,
  onBack,
}: {
  titleId: string;
  title: ReactNode;
  aside?: ReactNode;
  onBack: () => void;
}) {
  return (
    <header className="p-top">
      <button className="a-ib" type="button" aria-label="Voltar" onClick={onBack}>
        <Icon name="back" />
      </button>
      <h2 id={titleId}>{title}</h2>
      {aside !== undefined && <span>{aside}</span>}
    </header>
  );
}
