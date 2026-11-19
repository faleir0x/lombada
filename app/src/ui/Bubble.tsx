import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons/Icon';

/* Balão de fala do mascote (DESIGN.md §6). Sempre o inverso do fundo. Aparece a partir do bico em 200ms;
   mudar popKey refaz a entrada. As ideias (modo largo) chegam com a home. */
export function Bubble({
  children,
  icon,
  action,
  popKey,
}: {
  children: ReactNode;
  icon?: IconName;
  action?: { label: string; icon?: IconName; onClick(): void };
  popKey?: string | number;
}) {
  return (
    <div key={popKey} className="bubble pop">
      <p className="b-line">
        {icon && <Icon name={icon} />}
        <span>{children}</span>
      </p>
      {action && (
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
