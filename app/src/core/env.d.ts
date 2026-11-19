/* O núcleo roda no navegador, no Node (testes) e, um dia, no React Native. Sem DOM, só o que os três têm. */
declare function setTimeout(callback: () => void, ms?: number): unknown;
