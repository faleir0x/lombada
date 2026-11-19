/* Rotas do app. Puro (sem navegador), para testar. A navegação fica em router.ts. */

export type Route =
  | { name: 'home' }
  | { name: 'estante' }
  | { name: 'voce' }
  | { name: 'baralho'; sessionId: string }
  /** Vitrine de estados, só em desenvolvimento e nos testes de ponta a ponta. */
  | { name: 'vitrine' };

export function parseRoute(pathname: string): Route | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'home' };
  if (path === '/estante') return { name: 'estante' };
  if (path === '/voce') return { name: 'voce' };
  if (path === '/vitrine') return { name: 'vitrine' };
  const deck = path.match(/^\/baralho\/([^/]+)$/);
  if (deck?.[1]) {
    try {
      return { name: 'baralho', sessionId: decodeURIComponent(deck[1]) };
    } catch {
      return null;
    }
  }
  return null;
}

export function routePath(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'baralho':
      return `/baralho/${encodeURIComponent(route.sessionId)}`;
    default:
      return `/${route.name}`;
  }
}

/** Páginas que abrem por cima da home (estante, baralho, você). */
export const isPage = (route: Route) =>
  route.name === 'estante' || route.name === 'voce' || route.name === 'baralho';
