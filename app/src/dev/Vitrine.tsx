import { useRef, useState } from 'react';
import { navigate } from '../platform/router';
import { type ThemePref, useTheme } from '../platform/theme';
import { useAnnounce } from '../ui/a11y/Announcer';
import { Bubble } from '../ui/Bubble';
import { Icon, type IconName } from '../ui/icons/Icon';
import { ML, ORDER } from '../ui/mascot/engine.js';
import { Mascot, type MascotHandle, type MascotKind, type MascotMood } from '../ui/mascot/Mascot';
import { reducedMotion } from '../ui/motion';
import { Sheet } from '../ui/shell/Sheet';
import './vitrine.css';

/* Vitrine de estados (como os botões do protótipo): cada peça da fundação visual, para olhar nos dois
   temas e com movimento reduzido, e para os testes de ponta a ponta. Só existe em desenvolvimento e
   nos testes (VITE_VITRINE=1); fora disso, /vitrine mostra a home. */

const THEMES: [ThemePref, string][] = [
  ['system', 'Sistema'],
  ['light', 'Dia'],
  ['dark', 'Noite'],
];

const KINDS: Record<MascotKind, string> = {
  fantasma: 'Fantasma',
  coruja: 'Coruja',
  barba: 'Bibliotecário',
  corvo: 'Corvo',
  traca: 'Traça',
};

const ICON_BUTTONS: [IconName, string][] = [
  ['lamp', 'Abajur'],
  ['shelf', 'Estante'],
  ['user', 'Perfil'],
  ['idea', 'Pedir uma ideia'],
  ['send', 'Buscar'],
  ['search', 'Buscar parecidos'],
  ['refresh', 'Desfazer'],
  ['close', 'Passar'],
  ['heart', 'Guardar na estante'],
  ['book', 'Já li'],
  ['back', 'Voltar'],
  ['next', 'Avançar'],
  ['up', 'Gostei'],
  ['down2', 'Não gostei'],
  ['trash', 'Tirar da estante'],
];

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="dev-row dev-chips">
      <legend className="sr">{label}</legend>
      {options.map(([v, text]) => (
        <button
          key={v}
          className="dev-chip"
          type="button"
          aria-pressed={v === value}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </fieldset>
  );
}

export default function Vitrine() {
  const { pref, setPref } = useTheme();
  const announce = useAnnounce();
  const mascot = useRef<MascotHandle>(null);
  const [kind, setKind] = useState<MascotKind>('fantasma');
  const [mood, setMood] = useState<MascotMood>('idle');
  const [loved, setLoved] = useState(false);
  const [pop, setPop] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <main className="dev" tabIndex={-1}>
      <header>
        <h1 className="t-title">Vitrine</h1>
        <p className="t-caption dev-note">
          As peças da fundação visual. Movimento reduzido: {reducedMotion() ? 'sim' : 'não'}.
        </p>
      </header>

      <section aria-labelledby="dev-tema">
        <h2 id="dev-tema" className="t-heading">
          Tema
        </h2>
        <Chips label="Tema" options={THEMES} value={pref} onChange={setPref} />
      </section>

      <section aria-labelledby="dev-mascote">
        <h2 id="dev-mascote" className="t-heading">
          Mascote
        </h2>
        <div className="dev-stage">
          <Mascot ref={mascot} kind={kind} mood={mood} className="dev-m" />
        </div>
        <Chips label="Humor" options={ML} value={mood} onChange={setMood} />
        <Chips
          label="Mascote"
          options={ORDER.map((k): [MascotKind, string] => [k, KINDS[k]])}
          value={kind}
          onChange={setKind}
        />
        <div className="dev-row">
          <button className="btn-quiet" type="button" onClick={() => mascot.current?.talk()}>
            Falar
          </button>
        </div>
      </section>

      <section aria-labelledby="dev-botoes">
        <h2 id="dev-botoes" className="t-heading">
          Botões
        </h2>
        <div className="dev-row">
          {ICON_BUTTONS.map(([name, label]) => (
            <button key={name} className="a-ib" type="button" aria-label={label}>
              <Icon name={name} />
            </button>
          ))}
          <button className="a-ib" type="button" aria-label="Já li (desativado)" disabled>
            <Icon name="book" />
          </button>
        </div>
        <div className="dev-row">
          <button className="btn-primary" type="button">
            <Icon name="search" />
            Buscar de novo
          </button>
          <button className="btn-quiet" type="button">
            Nova busca
          </button>
          <button
            className="hb"
            type="button"
            aria-pressed={loved}
            aria-label="Amei Torto Arado"
            onClick={() => setLoved((v) => !v)}
          >
            <Icon name="heart" />
          </button>
        </div>
      </section>

      <section aria-labelledby="dev-balao">
        <h2 id="dev-balao" className="t-heading">
          Balão
        </h2>
        <div className="dev-bubbles">
          <Bubble popKey={pop}>Largou mais um no capítulo 3?</Bubble>
          <Bubble
            popKey={pop}
            icon="offline"
            action={{ label: 'Tentar de novo', icon: 'refresh', onClick: () => {} }}
          >
            Perdi a conexão no meio da busca. Tenta de novo?
          </Bubble>
        </div>
        <div className="dev-row">
          <button className="btn-quiet" type="button" onClick={() => setPop((n) => n + 1)}>
            Refazer a entrada
          </button>
        </div>
      </section>

      <section aria-labelledby="dev-folha">
        <h2 id="dev-folha" className="t-heading">
          Folha e páginas
        </h2>
        <div className="dev-row">
          <button className="btn-quiet" type="button" onClick={() => setSheetOpen(true)}>
            Abrir a folha
          </button>
          <button className="btn-quiet" type="button" onClick={() => navigate({ name: 'estante' })}>
            Abrir a estante
          </button>
          <button
            className="btn-quiet"
            type="button"
            onClick={() => navigate({ name: 'baralho', sessionId: 'exemplo' }, { transition: 'fade' })}
          >
            Abrir o baralho
          </button>
          <button className="btn-quiet" type="button" onClick={() => navigate({ name: 'voce' })}>
            Abrir Você
          </button>
        </div>
      </section>

      <section aria-labelledby="dev-anuncio">
        <h2 id="dev-anuncio" className="t-heading">
          Leitor de tela
        </h2>
        <div className="dev-row">
          <button className="btn-quiet" type="button" onClick={() => announce('Lendo as orelhas.')}>
            Anunciar “Lendo as orelhas.”
          </button>
        </div>
      </section>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Livro">
        <div className="dev-sheet-head">
          <h3 className="t-heading">Torto Arado</h3>
          <button className="a-ib" type="button" aria-label="Fechar" onClick={() => setSheetOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <p className="t-body">
          Duas irmãs crescem numa fazenda no sertão da Bahia, marcadas por um acidente na infância com a faca
          da avó.
        </p>
      </Sheet>
    </main>
  );
}
