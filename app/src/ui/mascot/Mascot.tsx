import { type Ref, type RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useMascotKind } from '../../platform/mascot';
import { Mascot as Engine, type MascotKind, type MascotMood } from './engine.js';
import './mascot.css';

export type { MascotKind, MascotMood };

export interface MascotHandle {
  talk(): void;
}

interface MascotProps {
  /** Sem kind, usa o mascote escolhido pela pessoa. */
  kind?: MascotKind;
  mood?: MascotMood;
  /** Campo que o olhar segue quando o humor é "listen". */
  attn?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  className?: string;
  ref?: Ref<MascotHandle>;
}

/* O motor desenha dentro do div por conta própria; o React só cria, troca o humor e desmonta. */
export function Mascot({ kind, mood = 'idle', attn, className, ref }: MascotProps) {
  const chosen = useMascotKind();
  const shape = kind ?? chosen;
  const host = useRef<HTMLDivElement>(null);
  const first = useRef(shape);
  const [engine, setEngine] = useState<Engine | null>(null);

  // O motor nasce uma vez; trocar de mascote é setShape (mantém humor e molas, sem piscar).
  useEffect(() => {
    if (!host.current) return;
    const e = new Engine(host.current, first.current);
    setEngine(e);
    return () => {
      e.destroy();
      setEngine(null);
    };
  }, []);

  useEffect(() => {
    if (engine && engine.key !== shape) engine.setShape(shape);
  }, [engine, shape]);

  useEffect(() => {
    engine?.setMood(mood);
  }, [engine, mood]);

  useEffect(() => {
    if (engine) engine.attn = attn?.current ?? null;
  }, [engine, attn]);

  useImperativeHandle(ref, () => ({ talk: () => engine?.talk() }), [engine]);

  return <div ref={host} className={className ? `mascot ${className}` : 'mascot'} aria-hidden="true" />;
}
