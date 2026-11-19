import { navigate } from '../platform/router';
import { useTheme } from '../platform/theme';
import { Bubble } from '../ui/Bubble';
import { Icon } from '../ui/icons/Icon';
import { Mascot } from '../ui/mascot/Mascot';

/* Home provisória da fundação visual: topo, mascote e balão. A cena do abajur e a busca chegam na A3. */
export function Home() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <header className="a-top">
        <h1 className="a-word t-brand">lombada</h1>
        <nav className="a-icons" aria-label="Atalhos">
          <button
            className="a-ib"
            type="button"
            aria-label={theme === 'dark' ? 'Apagar o abajur (modo dia)' : 'Acender o abajur (modo noite)'}
            onClick={toggle}
          >
            <Icon name="lamp" />
          </button>
          <button
            className="a-ib"
            type="button"
            aria-label="Estante"
            onClick={() => navigate({ name: 'estante' })}
          >
            <Icon name="shelf" />
          </button>
          <button
            className="a-ib"
            type="button"
            aria-label="Perfil"
            onClick={() => navigate({ name: 'voce' })}
          >
            <Icon name="user" />
          </button>
        </nav>
      </header>
      <main className="a-scene" tabIndex={-1}>
        <Bubble>Largou mais um no capítulo 3?</Bubble>
        <Mascot className="a-m" />
      </main>
    </>
  );
}
