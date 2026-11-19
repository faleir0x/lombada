import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* Confere os contrastes medidos no DESIGN.md §2 direto do tokens.css, para uma troca de cor
   não passar despercebida. */

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Bloco não encontrado: ${selector}`);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

function vars(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
    out.set(m[1] as string, (m[2] as string).trim());
  return out;
}

const light = vars(block(':root'));
const darkSystem = vars(block(':root:not([data-theme="light"])'));
const darkChosen = vars(block(':root[data-theme="dark"]'));

function hex(theme: Map<string, string>, name: string): string {
  let value = theme.get(name) ?? light.get(name);
  for (let i = 0; value?.startsWith('var(') && i < 5; i++) {
    const ref = value.slice(4, -1);
    value = theme.get(ref) ?? light.get(ref);
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} não é uma cor sólida: ${value}`);
  return value;
}

function luminance(color: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(color.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [frente, fundo, mínimo], na ordem da tabela "Contraste medido" do DESIGN.md §2.
const pairs: [string, string, number][] = [
  ['--color-text', '--color-bg', 4.5],
  ['--color-text', '--color-surface', 4.5],
  ['--color-text-muted', '--color-bg', 4.5],
  ['--color-text-muted', '--color-surface', 4.5],
  ['--color-on-accent', '--color-accent', 4.5],
  ['--color-accent', '--color-bg', 3],
  ['--color-on-bubble', '--color-bubble', 4.5],
  ['--color-accent-on-bubble', '--color-bubble', 3],
  ['--mascot-body', '--color-bg', 3],
  ['--mascot-eye', '--mascot-body', 3],
];

describe('tokens de cor', () => {
  it('a noite escolhida à mão é igual à noite do sistema', () => {
    expect(Object.fromEntries(darkChosen)).toEqual(Object.fromEntries(darkSystem));
  });

  for (const [theme, label] of [
    [light, 'dia'],
    [darkChosen, 'noite'],
  ] as const) {
    for (const [fg, bg, min] of pairs) {
      it(`${label}: ${fg} sobre ${bg} passa de ${min}:1`, () => {
        expect(contrast(hex(theme, fg), hex(theme, bg))).toBeGreaterThanOrEqual(min);
      });
    }
  }
});
