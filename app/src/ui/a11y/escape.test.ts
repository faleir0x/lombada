import { describe, expect, it, vi } from 'vitest';
import { createEscapeStack } from './escape';

describe('pilha do Esc', () => {
  it('fecha só o de cima, e depois o de baixo', () => {
    const s = createEscapeStack();
    const page = vi.fn();
    const sheet = vi.fn();
    s.push(page);
    s.push(sheet);
    expect(s.handle()).toBe(true);
    expect(sheet).toHaveBeenCalledTimes(1);
    expect(page).not.toHaveBeenCalled();
  });

  it('quem sai da pilha não é mais chamado', () => {
    const s = createEscapeStack();
    const page = vi.fn();
    const sheet = vi.fn();
    s.push(page);
    const pop = s.push(sheet);
    pop();
    s.handle();
    expect(sheet).not.toHaveBeenCalled();
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('pilha vazia não faz nada', () => {
    expect(createEscapeStack().handle()).toBe(false);
  });
});
