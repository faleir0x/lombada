import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { PageTransition } from '../../platform/router';
import { useEscape } from '../a11y/escape';
import { animate, DUR, EASE, reducedMotion } from '../motion';

/* Casca do app: a home sempre montada embaixo, uma página por cima (estante, baralho, você) e a camada das
   folhas. Cuida da Paralaxe (DESIGN.md §4), do fundo inerte e do foco (R7, R12). */

export interface PageSpec {
  /** Muda quando é outra página; a mesma chave não reabre. */
  key: string;
  transition: PageTransition;
  /** Esc e o voltar do sistema. */
  onBack: () => void;
  content: ReactNode;
}

interface ShellApi {
  layer: HTMLElement | null;
  setSheetOpen(id: string, open: boolean): void;
  /** Devolve o foco a este elemento assim que ele deixar de estar num fundo inerte (R7). */
  returnFocus(el: HTMLElement | null): void;
}

const ShellContext = createContext<ShellApi>({ layer: null, setSheetOpen: () => {}, returnFocus: () => {} });
export const useShell = () => useContext(ShellContext);

const RECEDED: Keyframe = { transform: 'translateX(-28%)', opacity: 0.55 };
const IN_PLACE: Keyframe = { transform: 'none', opacity: 1 };

export function Shell({ home, page }: { home: ReactNode; page: PageSpec | null }) {
  const homeRef = useRef<HTMLDivElement>(null);
  const homeAnim = useRef<Animation | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const firstRender = useRef(true);
  const pendingFocus = useRef<HTMLElement | null>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [sheets, setSheets] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState<PageSpec | null>(page);
  const [closing, setClosing] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const setSheetOpen = useCallback((id: string, open: boolean) => {
    setSheets((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Abre, troca ou começa a fechar a página quando a rota muda.
  const pageKey = page?.key ?? null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reage só à troca de página, não a cada render.
  useLayoutEffect(() => {
    const initial = firstRender.current;
    firstRender.current = false;
    if (page) {
      if (!shown || closing) opener.current = document.activeElement as HTMLElement | null;
      setShown(page);
      setClosing(false);
      setAnimateIn(!initial);
      const home = homeRef.current;
      if (home && page.transition === 'parallax' && !reducedMotion()) {
        homeAnim.current?.cancel();
        homeAnim.current = home.animate([IN_PLACE, RECEDED], {
          duration: initial ? 0 : DUR.sheetOpen,
          easing: EASE.drawer,
          fill: 'forwards',
        });
      }
    } else if (shown) {
      setClosing(true);
    }
  }, [pageKey]);

  // Mantém o conteúdo da página atualizado sem reabrir.
  useEffect(() => {
    if (page && shown && page.key === shown.key && page !== shown) setShown(page);
  }, [page, shown]);

  const returnFocus = useCallback((el: HTMLElement | null) => {
    pendingFocus.current = el;
  }, []);

  const finishClose = useCallback(() => {
    setShown(null);
    setClosing(false);
    // Se quem abriu a página sumiu, o foco vai para a home (R12).
    const back = opener.current;
    opener.current = null;
    // Quem já pediu foco (a home, para o campo de busca) tem a vez.
    pendingFocus.current ??= back?.isConnected
      ? back
      : (homeRef.current?.querySelector<HTMLElement>('main') ?? null);
  }, []);

  const startHomeReturn = useCallback(() => {
    const home = homeRef.current;
    const receded = homeAnim.current;
    homeAnim.current = null;
    if (!home || !receded) return;
    receded.cancel();
    animate(home, [RECEDED, IN_PLACE], { duration: DUR.sheetClose, easing: EASE.drawer });
  }, []);

  const sheetOpen = sheets.size > 0;

  // Depois de cada mudança de camada, já sem o inert, devolve o foco que estava esperando.
  // biome-ignore lint/correctness/useExhaustiveDependencies: as camadas são o gatilho, não algo lido aqui.
  useEffect(() => {
    const el = pendingFocus.current;
    if (!el || el.closest('[inert]')) return;
    // Se a própria home já pôs o foco num lugar dela (o campo de busca), não tira de lá.
    const active = document.activeElement;
    if (active && active !== document.body && homeRef.current?.contains(active) && !shown) {
      pendingFocus.current = null;
      return;
    }
    pendingFocus.current = null;
    if (el.isConnected) el.focus({ preventScroll: true });
  }, [sheetOpen, shown, closing]);

  return (
    <ShellContext.Provider value={{ layer, setSheetOpen, returnFocus }}>
      <div className="app">
        <div className="app-home" ref={homeRef} inert={Boolean(shown) || sheetOpen}>
          {home}
        </div>
        {shown && (
          <PageView
            key={shown.key}
            spec={shown}
            animateIn={animateIn}
            closing={closing}
            inert={sheetOpen}
            onCloseStart={startHomeReturn}
            onClosed={finishClose}
          />
        )}
        <div className="app-layer" ref={setLayer} />
      </div>
    </ShellContext.Provider>
  );
}

interface PageViewProps {
  spec: PageSpec;
  animateIn: boolean;
  closing: boolean;
  inert: boolean;
  onCloseStart(): void;
  onClosed(): void;
}

function PageView({ spec, animateIn, closing, inert, onCloseStart, onClosed }: PageViewProps) {
  const ref = useRef<HTMLElement>(null);

  useEscape(spec.onBack, !closing && !inert);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a entrada roda uma vez, ao montar.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (animateIn) {
      if (reducedMotion()) {
        animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, evenWhenReduced: true });
      } else if (spec.transition === 'fade') {
        animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease' });
      } else {
        animate(el, [{ transform: 'translateX(100%)' }, { transform: 'none' }], {
          duration: DUR.sheetOpen,
          easing: EASE.drawer,
        });
      }
    }
    el.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!closing) return;
    const el = ref.current;
    onCloseStart();
    const out = el
      ? reducedMotion()
        ? animate(el, [{ opacity: 1 }, { opacity: 0 }], {
            duration: 150,
            fill: 'forwards',
            evenWhenReduced: true,
          })
        : animate(el, [{ transform: 'none' }, { transform: 'translateX(100%)' }], {
            duration: DUR.sheetClose,
            easing: EASE.drawer,
            fill: 'forwards',
          })
      : null;
    // R6: fechar não pode depender da animação terminar (aba em segundo plano não anima).
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onClosed();
    };
    out?.finished.then(finish, finish);
    const fallback = setTimeout(finish, out ? DUR.sheetClose + 120 : 0);
    return () => clearTimeout(fallback);
  }, [closing, onCloseStart, onClosed]);

  return (
    <section
      className="a-page"
      ref={ref}
      tabIndex={-1}
      inert={inert || closing}
      aria-labelledby={`${spec.key}-title`}
    >
      {spec.content}
    </section>
  );
}
