import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DUR, EASE } from './motion';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('motion.ts e tokens.css', () => {
  for (const [name, ms] of Object.entries(DUR)) {
    it(`--dur-${kebab(name)} é ${ms}ms`, () => expect(token(`dur-${kebab(name)}`)).toBe(`${ms}ms`));
  }
  for (const [name, curve] of Object.entries(EASE)) {
    it(`--ease-${kebab(name)} é a mesma curva`, () => expect(token(`ease-${kebab(name)}`)).toBe(curve));
  }
});
