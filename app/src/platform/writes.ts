/* Escritas na API (julgar, desfazer, mudar o ♥) saem uma por vez, na ordem em que aconteceram:
   "♥ e logo Desfazer" não pode chegar invertido. A fase A7 troca esta fila em memória por uma fila salva
   no aparelho, que sobrevive a ficar sem conexão. */

let tail: Promise<void> = Promise.resolve();
let pending = 0;

export function enqueueWrite(write: () => Promise<void>): Promise<void> {
  pending++;
  const run = tail.then(write).catch((e: unknown) => {
    console.error('Escrita na API falhou:', e);
  });
  tail = run.finally(() => {
    pending--;
  });
  return tail;
}

/** Espera as escritas da fila (para ler a estante já com elas aplicadas). */
export const writesSettled = (): Promise<void> => tail;
export const pendingWrites = () => pending;
