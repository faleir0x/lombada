import { useState } from 'react';

/* "Capa gerada, depois a foto" (DESIGN.md §6, R13): a capa gerada já está desenhada embaixo; a foto entra
   por cima em 200ms quando carrega. Se não vier, fica a gerada. Sem esqueleto e sem brilho em loop. */
export function CoverPhoto({ url }: { url: string }) {
  const [state, setState] = useState<'loading' | 'in' | 'failed'>('loading');
  if (state === 'failed') return null;
  return (
    <img
      className="cover-photo"
      src={url}
      alt=""
      decoding="async"
      draggable={false}
      data-state={state}
      onLoad={() => setState('in')}
      onError={() => setState('failed')}
    />
  );
}
