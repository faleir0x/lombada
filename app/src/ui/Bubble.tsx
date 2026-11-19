import type { ReactNode } from 'react';
import type { Idea } from '../core/api/types';
import { Icon, type IconName } from './icons/Icon';

/* Balão do mascote (DESIGN.md §6). Sempre o inverso do fundo. Dois modos:
   - Fala: uma frase curta, com ícone e botão de ação opcionais ("Tentar de novo").
   - Ideias (largo): título, três itens com ícone, título e motivo, e rodapé com "Outras" e "Fechar".
     O mesmo formato serve às buscas vizinhas quando não há resultado (sem "Outras").
   Aparece a partir do bico em 200ms; mudar popKey refaz a entrada. */

export interface BubbleIdeas {
  items: Idea[];
  onPick(query: string): void;
  onMore?: () => void;
  onClose(): void;
}

export function Bubble({
  children,
  icon,
  action,
  ideas,
  hidden = false,
  popKey,
}: {
  children: ReactNode;
  icon?: IconName;
  action?: { label: string; icon?: IconName; onClick(): void };
  ideas?: BubbleIdeas;
  hidden?: boolean;
  popKey?: string | number;
}) {
  return (
    <div
      key={popKey}
      className={ideas ? 'bubble wide pop' : 'bubble pop'}
      data-hidden={hidden}
      aria-hidden={hidden}
    >
      <p className="b-line">
        {icon && <Icon name={icon} />}
        <span>{children}</span>
      </p>
      {ideas && (
        <div>
          <ul className="b-rows">
            {ideas.items.map((idea) => (
              <li key={idea.query}>
                <button className="b-row" type="button" onClick={() => ideas.onPick(idea.query)}>
                  <Icon name="book" />
                  <span>
                    <b>{idea.query}</b>
                    <small>{idea.reason}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="b-foot">
            {ideas.onMore && (
              <button className="b-btn" type="button" onClick={ideas.onMore}>
                <Icon name="refresh" />
                Outras
              </button>
            )}
            <button className="b-btn" type="button" onClick={ideas.onClose}>
              <Icon name="close" />
              Fechar
            </button>
          </div>
        </div>
      )}
      {action && !ideas && (
        <div className="b-act">
          <button className="b-btn" type="button" onClick={action.onClick}>
            {action.icon && <Icon name={action.icon} />}
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
