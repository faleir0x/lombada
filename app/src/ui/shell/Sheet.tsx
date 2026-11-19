import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscape } from '../a11y/escape';
import { useShell } from './Shell';

/* Folha de baixo (detalhe do livro, resumo de uma busca). Diálogo de verdade (R7): role="dialog", fundo
   inerte, foco na folha ao abrir, Esc e toque fora fecham, foco volta para quem abriu. */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const { layer, setSheetOpen, returnFocus } = useShell();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEscape(onClose, open);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    setSheetOpen(id, true);
    const focus = setTimeout(() => ref.current?.focus({ preventScroll: true }), 40);
    return () => {
      clearTimeout(focus);
      // Se quem abriu sumiu (livro tirado da estante), quem fechou decide para onde o foco vai.
      if (opener?.isConnected) returnFocus(opener);
      setSheetOpen(id, false);
    };
  }, [open, id, setSheetOpen, returnFocus]);

  if (!layer) return null;
  return createPortal(
    <>
      <div className="a-scrim" data-open={open} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className="a-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-open={open}
      >
        {children}
      </div>
    </>,
    layer,
  );
}
