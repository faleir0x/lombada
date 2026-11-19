import { HUGE, type IconName } from './hugeicons';

export type { IconName };

/* Ícone Hugeicons em currentColor. O tamanho vem do CSS de quem usa (22px por padrão, DESIGN.md §4).
   data-ico diz ao botão qual gesto o ícone faz no clique (reactions.ts). */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const icon = HUGE[name];
  return (
    <svg
      className={className ? `ico ${className}` : 'ico'}
      data-ico={name}
      viewBox={`0 0 ${icon.w} ${icon.h}`}
      aria-hidden="true"
      focusable="false"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG estático do próprio app (hugeicons.ts), nunca texto de fora.
      dangerouslySetInnerHTML={{ __html: icon.b }}
    />
  );
}
