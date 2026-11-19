import { useSyncExternalStore } from 'react';

/* Tema dia/noite (DESIGN.md §2): data-theme na raiz; sem escolha, segue o sistema. A escolha fica no
   aparelho com a mesma chave do protótipo e é aplicada antes do primeiro quadro (script em index.html). */

export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const KEY = 'lombada-theme';
const media = matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
media.addEventListener('change', emit);

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setThemePref(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Sem armazenamento: vale só nesta sessão.
  }
  emit();
}

export function effectiveTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return media.matches ? 'dark' : 'light';
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, effectiveTheme);
  const pref = useSyncExternalStore(subscribe, readThemePref);
  return {
    theme,
    pref,
    setPref: setThemePref,
    /** O abajur: troca para o oposto do que está na tela, como escolha explícita. */
    toggle: () => setThemePref(theme === 'dark' ? 'light' : 'dark'),
  };
}
