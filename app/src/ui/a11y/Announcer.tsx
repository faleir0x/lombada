import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';

/* Região anunciada (R9): o leitor de tela ouve só o que muda o que a pessoa pode fazer
   (carregando, resultado, erro, ideias). Falas de enfeite do mascote não passam por aqui. */

const AnnounceContext = createContext<(text: string) => void>(() => {});

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announce = useCallback((next: string) => {
    // Esvazia e preenche de novo, para a mesma frase ser lida duas vezes seguidas.
    setText('');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(next), 30);
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p className="sr" role="status" data-announcer>
        {text}
      </p>
    </AnnounceContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnounceContext);
