import { useSyncExternalStore } from 'react';
import { parseRoute, type Route, routePath } from './routes';

/* Roteador mínimo sobre o History API. Quatro rotas não pedem biblioteca, e assim as transições
   (Paralaxe, "Do livro") ficam inteiras com o app. O botão voltar do navegador e do Android fecha a página.

   history.state guarda a posição na pilha (idx), para goBack saber se pode voltar sem sair do app,
   e como a página entra (transition). */

export type PageTransition = 'parallax' | 'fade';

interface NavState {
  idx: number;
  transition?: PageTransition;
}

export interface Location {
  route: Route;
  transition: PageTransition;
  idx: number;
}

const listeners = new Set<() => void>();
let current: Location = read();

function read(): Location {
  const state = (history.state ?? null) as NavState | null;
  return {
    route: parseRoute(location.pathname) ?? { name: 'home' },
    transition: state?.transition ?? 'parallax',
    idx: typeof state?.idx === 'number' ? state.idx : 0,
  };
}

function update() {
  current = read();
  for (const l of listeners) l();
}

// Primeira carga: marca a entrada e troca caminho desconhecido pela home.
if (typeof (history.state as NavState | null)?.idx !== 'number' || !parseRoute(location.pathname)) {
  const route = parseRoute(location.pathname) ?? { name: 'home' };
  history.replaceState({ idx: 0 } satisfies NavState, '', routePath(route) + location.search);
  current = read();
}
addEventListener('popstate', update);

export function navigate(route: Route, options: { replace?: boolean; transition?: PageTransition } = {}) {
  const state: NavState = {
    idx: options.replace ? current.idx : current.idx + 1,
    ...(options.transition ? { transition: options.transition } : {}),
  };
  const url = routePath(route) + location.search;
  if (options.replace) history.replaceState(state, '', url);
  else history.pushState(state, '', url);
  update();
}

/** Voltar: desfaz a última navegação dentro do app; se a página foi aberta direto, vai para a de cima
    (a Mascote volta para a Você; o resto, para a home). */
export function goBack() {
  if (current.idx > 0) history.back();
  else navigate(current.route.name === 'mascote' ? { name: 'voce' } : { name: 'home' }, { replace: true });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useLocation = (): Location => useSyncExternalStore(subscribe, () => current);
