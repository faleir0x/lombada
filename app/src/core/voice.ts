/* Voz do mascote (DESIGN.md §6): um banco de falas por situação, sorteio sem repetir a anterior.
   Textos copiados do protótipo (POOLS em design-explorations/prototipo.html), que usa o banco
   de texto.html e as falas escolhidas em fechamento.html. Pontuação tipográfica, sem travessão. */

export const VOICE = {
  idle: [
    'Largou mais um no capítulo 3?',
    'Terminou um bom e nada mais desce?',
    'Qual foi o último que te pegou de verdade?',
    'Marcador no mesmo lugar faz uma semana?',
    'Me fala um livro que você amou. Eu faço o resto.',
    'Bora achar o próximo antes que a ressaca piore?',
  ],
  listen: ['Hm. Continua.', 'Tô ouvindo.', 'Vai, mais detalhe.', 'Isso eu consigo trabalhar.'],
  think: ['Deixa eu ver o que combina.', 'Peraí, tô pensando.'],
  read: [
    'Lendo as orelhas.',
    'Folheando umas trinta orelhas aqui.',
    'Deixa eu ver a estante dos fundos.',
    'Separando os que valem a pena.',
  ],
  readLong: [
    'Esse tá demorando. Deve ser coisa boa.',
    'Quase. Achei um que eu gostei.',
    'Mais um pouquinho, tô no último corredor.',
  ],
  result: [
    'Separei dez. Arrasta pra direita o que te pegar.',
    'Dez na mesa. Arrasta pra direita o que te pegar.',
    'Pronto, dez. Direita pra guardar, esquerda pra passar.',
  ],
  nudge: [
    'Sem ideia? Toca no ícone de ideia, aqui embaixo.',
    'Pode ser só um humor. Tipo “quero chorar no ônibus”.',
    'Vale título, autor ou um sentimento meio vago.',
    'Um livro que você amou já me diz muita coisa.',
  ],
  drowsy: ['Vou só descansar a vista.', 'Me acorda quando decidir.', 'Fecho um olho e fico de guarda.'],
  wake: ['Opa. Tô aqui.', 'Não tava dormindo. Tava lendo de olho fechado.', 'Voltei. Onde a gente parou?'],
  empty: ['Escreve qualquer coisa, ou me pede uma ideia.'],
  error: ['Perdi a conexão no meio da busca. Tenta de novo?'],
  night: ['Agora sim. Clima de leitura.', 'Luz baixa, livro bom. Bora.'],
  day: ['Lendo de dia? Respeito.', 'Claro demais pra mim, mas tudo bem.'],
  profile: ['Logo dá pra me trocar por outro mascote. Mas por quê?'],
  deckStart: [
    'Separei dez. Arrasta pra direita o que te pegar.',
    'Dez na mesa. Arrasta pra direita o que te pegar.',
  ],
  rescue: ['Sabia que esse ia voltar.'],
  unlove: ['Esfriou rápido, hein.'],
  offline: ['Caiu a conexão. Pode seguir, eu guardo tudo aqui.'],
  online: ['Voltou a conexão. Já subi tudo.'],
  offEnd: ['Os próximos dez chegam quando a conexão voltar.'],
  deckMore: ['Buscando mais dez com o que você me ensinou.'],
  like: [
    'Boa. Pra estante.',
    'Esse eu também guardaria.',
    'Sabia que esse ia te pegar.',
    'Anotado. Vem mais desse tipo.',
  ],
  dislike: [
    'Justo. Anotado.',
    'Esse não. Tô aprendendo.',
    'Tudo bem, eu também não ia ler.',
    'Próximo. Já entendi o tipo.',
  ],
  dislike3: ['Três seguidos? Me conta de novo o que você quer.'],
  ask: [
    'Já leu esse? O que você achou?',
    'Esse você já conhece? Gostou ou não?',
    'Já leu? Coração se gostou, xis se não.',
    'Leitor experiente. E aí, valeu a pena?',
    'Já passou por esse? Me conta como foi.',
  ],
  askCancel: ['Beleza, fica pra depois.', 'Ah, ainda não leu? Melhor ainda.'],
  loved: ['Já leu e amou? A gente tem gosto parecido.', 'Ótimo sinal. Vou atrás de outros assim.'],
  readNo: ['Já leu e não curtiu? Esse tipo sai da lista.'],
  rateUp: ['Anotado. Vou atrás de mais assim.', 'Boa. Esse conta muito pro próximo lote.'],
  rateDown: ['Poxa. Anotado, esse tipo pesa menos agora.', 'Acontece. Valeu por me contar.'],
} as const satisfies Record<string, readonly string[]>;

export type VoiceKey = keyof typeof VOICE;

/** Falas que mudam o que a pessoa pode fazer e vão para a região anunciada (R9). As outras são enfeite. */
export const ANNOUNCED: ReadonlySet<VoiceKey> = new Set([
  'read',
  'readLong',
  'result',
  'error',
  'empty',
  'profile',
]);

/** Fim do lote (DESIGN.md §6): "Quatro de dez. Os próximos vêm com esses na cabeça." */
const NUMBERS = ['Nenhum', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez'];
export function endOfBatchLine(loved: number): string {
  if (!loved) return 'Nenhum te pegou. Me conta de outro jeito?';
  return `${NUMBERS[loved] ?? loved} de dez. Os próximos vêm com ${loved === 1 ? 'esse' : 'esses'} na cabeça.`;
}

/** Busca sem resultado (DESIGN.md §7): cita a busca se couber, com aspas curvas. */
export function noResultLine(query: string): string {
  const q = query.trim();
  return `${q.length <= 32 ? `“${q}” eu não tenho.` : 'Isso eu não tenho.'} Chega perto?`;
}

export interface Voice {
  pick(key: VoiceKey): string;
}

/**
 * Sorteia sem repetir a última fala da mesma situação.
 * Na primeira visita, a primeira fala "idle" é sempre a primeira do banco.
 */
export function createVoice({ random = Math.random, firstVisit = false } = {}): Voice {
  const last = new Map<VoiceKey, string>();
  let saidFirst = !firstVisit;
  return {
    pick(key) {
      const pool: readonly string[] = VOICE[key];
      if (key === 'idle' && !saidFirst) {
        saidFirst = true;
        last.set(key, pool[0] ?? '');
        return pool[0] ?? '';
      }
      if (pool.length === 1) return pool[0] ?? '';
      const options = pool.filter((line) => line !== last.get(key));
      const line = options[Math.floor(random() * options.length)] ?? pool[0] ?? '';
      last.set(key, line);
      return line;
    },
  };
}
