import type { KeyValueStore } from '../core/storage';

/* KeyValueStore sobre o localStorage. Toda leitura e escrita protegida: em janela anônima ou com
   armazenamento bloqueado, o app continua, só não lembra. */
export function localStore(): KeyValueStore {
  return {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Sem armazenamento: segue sem salvar.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Sem armazenamento: nada a apagar.
      }
    },
  };
}
