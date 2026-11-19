import type { CSSProperties } from 'react';
import { CoverPhoto } from './CoverPhoto';

/* Capa gerada (DESIGN.md §6): retângulo 2:3 na cor do livro, título em Newsreader e autor, tudo
   proporcional à largura. As cores de capa são conteúdo, não tokens. Com foto, ela entra por cima. */
export function GeneratedCover({
  title,
  author,
  color,
  width,
  photo,
}: {
  title: string;
  author: string;
  color: string;
  width: number;
  photo?: string | null;
}) {
  const style = { '--c': color, '--t': '#EDE6D3', '--w': `${width}px` } as CSSProperties;
  return (
    <div className="cover" style={style} aria-hidden="true">
      <b>{title}</b>
      <small>{author}</small>
      {photo && <CoverPhoto url={photo} />}
    </div>
  );
}
