import { type Ref, type RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Mascot as Engine, type MascotKind, type MascotMood } from './engine.js';
import './mascot.css';

export type { MascotKind, MascotMood };

export interface MascotHandle {
  talk(): void;
}

interface MascotProps {
  kind?: MascotKind;
  mood?: MascotMood;
  /** Campo que o olhar segue quando o humor é "listen". */
  attn?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  className?: string;
  ref?: Ref<MascotHandle>;
}

/* O motor desenha dentro do div por conta própria; o React só cria, troca o humor e desmonta. */
export function Mascot({ kind = 'fantasma', mood = 'idle', attn, className, ref }: MascotProps) {
  const host = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const e = new Engine(host.current, kind);
    setEngine(e);
    return () => {
      e.destroy();
      setEngine(null);
    };
  }, [kind]);

  useEffect(() => {
    engine?.setMood(mood);
  }, [engine, mood]);

  useEffect(() => {
    if (engine) engine.attn = attn?.current ?? null;
  }, [engine, attn]);

  useImperativeHandle(ref, () => ({ talk: () => engine?.talk() }), [engine]);

  return <div ref={host} className={className ? `mascot ${className}` : 'mascot'} aria-hidden="true" />;
}
