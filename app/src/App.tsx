import { lazy, Suspense, useMemo, useRef } from 'react';
import { DeckPage } from './pages/deck/DeckPage';
import { Home } from './pages/home/Home';
import { ShelfPage } from './pages/shelf/ShelfPage';
import { YouPage } from './pages/you/YouPage';
import { requestSearchFocus } from './platform/handoff';
import { goBack, type PageTransition, useLocation } from './platform/router';
import { isPage, type Route } from './platform/routes';
import { type PageSpec, Shell } from './ui/shell/Shell';

const VITRINE_ON = import.meta.env.DEV || import.meta.env.VITE_VITRINE === '1';
// Fora do desenvolvimento e dos testes, a vitrine nem entra no build.
const Vitrine = VITRINE_ON ? lazy(() => import('./dev/Vitrine')) : null;

function pageFor(route: Route, transition: PageTransition): PageSpec | null {
  switch (route.name) {
    case 'estante':
      return { key: 'estante', transition, onBack: goBack, content: <ShelfPage titleId="estante-title" /> };
    case 'voce':
      return { key: 'voce', transition, onBack: goBack, content: <YouPage titleId="voce-title" /> };
    case 'baralho':
      // Uma chave só: "Mais dez" troca a busca dentro da mesma página, sem reabrir.
      return {
        key: 'baralho',
        transition,
        onBack: () => {
          requestSearchFocus();
          goBack();
        },
        content: <DeckPage sessionId={route.sessionId} />,
      };
    default:
      return null;
  }
}

export function App() {
  const { route, transition } = useLocation();
  // O que fica embaixo das páginas: a home, ou a vitrine quando foi dela que a página abriu.
  const base = useRef<'home' | 'vitrine'>('home');
  if (!isPage(route)) base.current = route.name === 'vitrine' && VITRINE_ON ? 'vitrine' : 'home';
  const page = useMemo(() => pageFor(route, transition), [route, transition]);
  const home =
    base.current === 'vitrine' && Vitrine ? (
      <Suspense fallback={null}>
        <Vitrine />
      </Suspense>
    ) : (
      <Home covered={page !== null} />
    );
  return <Shell home={home} page={page} />;
}
