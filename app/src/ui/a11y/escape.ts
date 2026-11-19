import { useEffect, useRef } from 'react';

/* Esc fecha só o que está por cima: a folha antes da página, a página antes da home
   ("Esc fecha o detalhe; outro Esc volta para a home", DESIGN.md §6). */

export function createEscapeStack() {
  const stack: (() => void)[] = [];
  return {
    push(handler: () => void): () => void {
      stack.push(handler);
      return () => {
        const i = stack.lastIndexOf(handler);
        if (i >= 0) stack.splice(i, 1);
      };
    },
    /** Chama só o de cima. Devolve se havia alguém para fechar. */
    handle(): boolean {
      const top = stack.at(-1);
      if (!top) return false;
      top();
      return true;
    },
    get size() {
      return stack.length;
    },
  };
}

const stack = createEscapeStack();
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented && stack.handle()) e.preventDefault();
  });
}

/** Registra quem fecha com Esc enquanto active for true. */
export function useEscape(handler: () => void, active = true) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!active) return;
    install();
    return stack.push(() => latest.current());
  }, [active]);
}
