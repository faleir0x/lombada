import { describe, expect, it } from 'vitest';
import { createVoice, endOfBatchLine, noResultLine, VOICE, type VoiceKey } from './voice';

describe('voz do mascote', () => {
  it('nunca repete a fala anterior da mesma situação', () => {
    const voice = createVoice({ random: () => 0 });
    let previous = '';
    for (let i = 0; i < 20; i++) {
      const line = voice.pick('read');
      expect(line).not.toBe(previous);
      previous = line;
    }
  });

  it('na primeira visita, a primeira fala é “Largou mais um no capítulo 3?”', () => {
    const voice = createVoice({ random: () => 0.99, firstVisit: true });
    expect(voice.pick('idle')).toBe('Largou mais um no capítulo 3?');
    expect(voice.pick('idle')).not.toBe('Largou mais um no capítulo 3?');
  });

  it('banco com uma fala só devolve sempre ela', () => {
    const voice = createVoice();
    expect(voice.pick('empty')).toBe('Escreve qualquer coisa, ou me pede uma ideia.');
    expect(voice.pick('empty')).toBe('Escreve qualquer coisa, ou me pede uma ideia.');
  });

  it('nenhuma fala tem travessão nem aspas retas (DESIGN.md §3)', () => {
    for (const key of Object.keys(VOICE) as VoiceKey[]) {
      for (const line of VOICE[key]) expect(line, key).not.toMatch(/[—–"]/);
    }
  });

  it('fim do lote conta por extenso', () => {
    expect(endOfBatchLine(4)).toBe('Quatro de dez. Os próximos vêm com esses na cabeça.');
    expect(endOfBatchLine(1)).toBe('Um de dez. Os próximos vêm com esse na cabeça.');
    expect(endOfBatchLine(0)).toBe('Nenhum te pegou. Me conta de outro jeito?');
  });

  it('sem resultado cita a busca curta e resume a longa', () => {
    expect(noResultLine('vampiro no sertão')).toBe('“vampiro no sertão” eu não tenho. Chega perto?');
    expect(noResultLine('um livro com vampiros no sertão nordestino nos anos 30')).toBe(
      'Isso eu não tenho. Chega perto?',
    );
  });
});
