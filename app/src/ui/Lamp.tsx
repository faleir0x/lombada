import { type Ref, useId, useImperativeHandle, useRef } from 'react';
import { animate, reducedMotion } from './motion';

/* O abajur da cena (DESIGN.md §5): preso ao mascote, não ao topo. Acende à noite, apaga de dia.
   Tocar na cúpula troca o tema ("Puxou a cordinha"): um tranco por mola em translateY. */

export interface LampHandle {
  /** Tranco de mola; toques seguidos somam. */
  tug(): void;
  /** A lâmpada pisca duas vezes ao acender. */
  flicker(): void;
  /** Peças para a entrada "Acender". */
  parts(): { bulb: SVGElement | null; cone: SVGElement | null; motes: HTMLElement | null };
}

const FLICKER: Keyframe[] = [
  { opacity: 0 },
  { opacity: 1, offset: 0.25 },
  { opacity: 0.2, offset: 0.45 },
  { opacity: 1, offset: 0.7 },
  { opacity: 0.5, offset: 0.85 },
  { opacity: 1 },
];

const MOTES: [left: number, top: number, seconds: number][] = [
  [22, 20, 11],
  [64, 34, 13],
  [40, 58, 9],
  [76, 70, 15],
  [12, 76, 12],
  [52, 12, 10],
];

export function Lamp({ onPull, ref }: { onPull?: () => void; ref?: Ref<LampHandle> }) {
  // R8: o gradiente tem ID único por instância.
  const gradient = `lamp-cone-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const wrap = useRef<HTMLDivElement>(null);
  const bulb = useRef<SVGEllipseElement>(null);
  const cone = useRef<SVGPathElement>(null);
  const motes = useRef<HTMLDivElement>(null);
  const spring = useRef({ y: 0, v: 0, running: false, last: 0 });

  useImperativeHandle(ref, () => ({
    tug() {
      if (reducedMotion() || !wrap.current) return;
      const s = spring.current;
      s.v += 440;
      if (s.running) return;
      s.running = true;
      s.last = performance.now();
      const step = (now: number) => {
        const el = wrap.current;
        const dt = Math.min(0.033, (now - s.last) / 1000 || 0.016);
        s.last = now;
        // Rigidez 320, amortecimento 15 (DESIGN.md §4).
        s.v += (-320 * s.y - 15 * s.v) * dt;
        s.y += s.v * dt;
        if (!el || (Math.abs(s.y) < 0.1 && Math.abs(s.v) < 2)) {
          s.y = 0;
          s.v = 0;
          s.running = false;
          if (el) el.style.transform = '';
          return;
        }
        el.style.transform = `translateX(-50%) translateY(${s.y.toFixed(2)}px)`;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    flicker() {
      if (bulb.current) animate(bulb.current, FLICKER, { duration: 220, easing: 'linear' });
    },
    parts: () => ({ bulb: bulb.current, cone: cone.current, motes: motes.current }),
  }));

  return (
    <div className="a-lampwrap" ref={wrap} aria-hidden="true">
      <svg className="a-lamp" viewBox="0 0 380 600" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-lamp-glow)' }} />
            <stop offset=".7" stopOpacity=".4" style={{ stopColor: 'var(--color-lamp-glow)' }} />
            <stop offset="1" stopOpacity="0" style={{ stopColor: 'var(--color-lamp-glow)' }} />
          </linearGradient>
        </defs>
        <path ref={cone} className="a-cone" d="M146 112L234 112L360 600L20 600Z" fill={`url(#${gradient})`} />
        <rect x="185" y="58" width="10" height="9" rx="2" className="a-shade" />
        <path d="M164 66C170 64 210 64 216 66L242 110C224 116 156 116 138 110Z" className="a-shade" />
        <ellipse ref={bulb} className="a-bulb" cx="190" cy="111" rx="46" ry="4.5" />
      </svg>
      <div className="a-motes" ref={motes}>
        {MOTES.map(([left, top, s]) => (
          <i
            key={`${left}-${top}`}
            style={{ left: `${left}%`, top: `${top}%`, animationDuration: `${s}s` }}
          />
        ))}
      </div>
      {onPull && <button className="a-pull" type="button" tabIndex={-1} onClick={onPull} data-spring="off" />}
    </div>
  );
}
