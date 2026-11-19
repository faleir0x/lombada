import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SessionDetail, SessionId, SessionSummary } from '../../core/api/types';
import { api } from '../../platform/appApi';
import { requestSearch } from '../../platform/handoff';
import { useMascotKind } from '../../platform/mascot';
import { enqueueWrite, writesSettled } from '../../platform/outbox';
import { goBack, navigate } from '../../platform/router';
import { useAnnounce } from '../../ui/a11y/Announcer';
import { GeneratedCover } from '../../ui/Cover';
import { Icon } from '../../ui/icons/Icon';
import { Lamp } from '../../ui/Lamp';
import { Mascot, type MascotMood } from '../../ui/mascot/Mascot';
import { animate, DUR, EASE, reducedMotion } from '../../ui/motion';
import { PageTop } from '../../ui/PageTop';
import { countsLine, Summary, type SummaryItem, summaryHeader } from '../../ui/Summary';
import { Sheet } from '../../ui/shell/Sheet';
import { shortDate } from '../shelf/BookDetail';
import { MASCOT_INFO, MascotPage } from './MascotPage';
import '../home/home.css';
import '../../ui/summary.css';
import '../shelf/shelf.css';
import './you.css';

/* Página Você ("Mascote em cima", DESIGN.md §6): topo igual ao da estante, com o mascote comentando os
   números e o nome dele abrindo a página Mascote; três números; o histórico de buscas, com o resumo de cada
   uma numa folha; e "Apagar buscas" no fim. */

async function allSessions(): Promise<SessionSummary[]> {
  const out: SessionSummary[] = [];
  let cursor: string | null = null;
  do {
    const page = await api.listSessions(cursor);
    out.push(...page.sessions);
    cursor = page.next_cursor;
  } while (cursor);
  return out;
}

function itemsOf(detail: SessionDetail): SummaryItem[] {
  return detail.books.flatMap((b) =>
    b.result
      ? [
          {
            id: b.id,
            title: b.title,
            authors: b.authors,
            cover: b.cover,
            result: b.result,
            onShelf: b.on_shelf,
          },
        ]
      : [],
  );
}

/** A fala do mascote da Você, pelos números (DESIGN.md §6). */
export function youLine(seen: number, kept: number, searches: number, erased: boolean): string {
  if (!searches) {
    return erased ? `Histórico limpo. A estante continua com ${kept}.` : 'Nenhuma busca ainda. Bora começar?';
  }
  const verdict = seen && kept / seen < 0.3 ? 'Exigente, hein.' : 'Tá fácil te agradar.';
  return `${seen} vistos, ${kept} ${kept === 1 ? 'ficou' : 'ficaram'}. ${verdict}`;
}

const RECEDED: Keyframe = { transform: 'translateX(-28%)', opacity: 0.55 };
const IN_PLACE: Keyframe = { transform: 'none', opacity: 1 };

export function YouPage({ titleId, mascotOpen = false }: { titleId: string; mascotOpen?: boolean }) {
  const announce = useAnnounce();
  const chosen = useMascotKind();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [onShelf, setOnShelf] = useState(0);
  const [openId, setOpenId] = useState<SessionId | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [erased, setErased] = useState(false);
  const [mood, setMood] = useState<MascotMood>('idle');
  const [mpShown, setMpShown] = useState(mascotOpen);
  const [mpClosing, setMpClosing] = useState(false);

  const main = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLElement | null>(null);
  const mascotBtn = useRef<HTMLButtonElement>(null);
  const deleteBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const emptyRow = useRef<HTMLLIElement>(null);
  const focusAfter = useRef<'cancel' | 'delete' | 'empty' | 'mascot' | null>(null);
  const firstRender = useRef(true);
  const animateIn = useRef(false);
  const mascotAtOpen = useRef(chosen);
  const receded = useRef<Animation | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    [],
  );
  const cheer = useCallback(() => {
    setMood('happy');
    timers.current.push(setTimeout(() => setMood('idle'), 1400));
  }, []);

  useEffect(() => {
    let live = true;
    writesSettled()
      .then(() => Promise.all([allSessions(), api.getShelf()]))
      .then(([list, shelf]) => {
        if (!live) return;
        setSessions(list);
        setOnShelf(shelf.books.length);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  /* Página Mascote por cima da Você: entra com a Paralaxe, e a Você recua como a home (DESIGN.md §6).
     Aberta direto pelo link, já aparece no lugar. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reage só a abrir e fechar a página Mascote.
  useLayoutEffect(() => {
    const initial = firstRender.current;
    firstRender.current = false;
    if (mascotOpen) {
      mascotAtOpen.current = chosen;
      animateIn.current = !initial;
      setMpShown(true);
      setMpClosing(false);
      const el = main.current;
      if (el && !reducedMotion()) {
        receded.current?.cancel();
        receded.current = el.animate([IN_PLACE, RECEDED], {
          duration: initial ? 0 : DUR.sheetOpen,
          easing: EASE.drawer,
          fill: 'forwards',
        });
      }
    } else if (mpShown) {
      setMpClosing(true);
    }
  }, [mascotOpen]);

  // A página Mascote aparece: desliza da direita (fade, com movimento reduzido) e recebe o foco.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando a página Mascote aparece.
  useLayoutEffect(() => {
    const el = overlay.current;
    if (!mpShown || mpClosing || !el) return;
    if (animateIn.current) {
      animateIn.current = false;
      if (reducedMotion())
        animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, evenWhenReduced: true });
      else {
        animate(el, [{ transform: 'translateX(100%)' }, { transform: 'none' }], {
          duration: DUR.sheetOpen,
          easing: EASE.drawer,
        });
      }
    }
    el.focus({ preventScroll: true });
  }, [mpShown]);

  // Ao fechar: sai pela direita, a Você volta, o foco volta para o mascote; se trocou, ele comemora.
  useLayoutEffect(() => {
    if (!mpClosing) return;
    const el = overlay.current;
    receded.current?.cancel();
    receded.current = null;
    if (main.current)
      animate(main.current, [RECEDED, IN_PLACE], { duration: DUR.sheetClose, easing: EASE.drawer });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setMpShown(false);
      setMpClosing(false);
      // Depois do render em que a Você deixa de ser inerte.
      focusAfter.current = 'mascot';
      if (chosen !== mascotAtOpen.current) cheer();
    };
    const out = el
      ? reducedMotion()
        ? animate(el, [{ opacity: 1 }, { opacity: 0 }], {
            duration: 150,
            fill: 'forwards',
            evenWhenReduced: true,
          })
        : animate(el, [{ transform: 'none' }, { transform: 'translateX(100%)' }], {
            duration: DUR.sheetClose,
            easing: EASE.drawer,
            fill: 'forwards',
          })
      : null;
    out?.finished.then(finish, finish);
    // R6: fechar não depende da animação terminar.
    const fallback = setTimeout(finish, out ? DUR.sheetClose + 120 : 0);
    return () => clearTimeout(fallback);
  }, [mpClosing, chosen, cheer]);

  useLayoutEffect(() => {
    const f = focusAfter.current;
    focusAfter.current = null;
    if (f === 'cancel') cancelBtn.current?.focus({ preventScroll: true });
    else if (f === 'delete') deleteBtn.current?.focus({ preventScroll: true });
    else if (f === 'empty') emptyRow.current?.focus({ preventScroll: true });
    else if (f === 'mascot') mascotBtn.current?.focus({ preventScroll: true });
  });

  const open = (id: SessionId) => {
    setOpenId(id);
    api
      .getSession(id)
      .then(setDetail)
      .catch(() => setOpenId(null));
  };

  // Mudar o ♥ de uma busca antiga: muda a estante, a contagem da busca e o contador da home.
  const toggle = useCallback(
    (item: SummaryItem) => {
      if (!detail) return;
      const on = !item.onShelf;
      const sessionId = detail.session_id;
      enqueueWrite(
        on
          ? { kind: 'addToShelf', bookId: item.id, fromSession: sessionId }
          : { kind: 'removeFromShelf', bookId: item.id },
      );
      const next = {
        ...detail,
        books: detail.books.map((b) => (b.id === item.id ? { ...b, on_shelf: on } : b)),
      };
      setDetail(next);
      setOnShelf((n) => n + (on ? 1 : -1));
      const items = itemsOf(next);
      const loved = items.filter((i) => i.onShelf);
      setSessions(
        (list) =>
          list?.map((s) =>
            s.session_id === sessionId
              ? {
                  ...s,
                  loved: loved.length,
                  passed: items.length - loved.length,
                  loved_preview: next.books.filter((b) => b.result && b.on_shelf).slice(0, 3),
                }
              : s,
          ) ?? null,
      );
    },
    [detail],
  );

  const again = () => {
    if (!detail) return;
    requestSearch({ query: detail.query, seedBookId: null });
    setOpenId(null);
    goBack();
  };

  // "Apagar buscas": confirmação no mesmo lugar, com o foco em "Cancelar".
  const askErase = () => {
    focusAfter.current = 'cancel';
    setConfirming(true);
  };
  const cancelErase = () => {
    focusAfter.current = 'delete';
    setConfirming(false);
  };
  const erase = () => {
    enqueueWrite({ kind: 'deleteSessions' });
    setSessions([]);
    setConfirming(false);
    setErased(true);
    focusAfter.current = 'empty';
    setMood('surprise');
    timers.current.push(setTimeout(() => setMood('idle'), 1400));
    announce(youLine(0, onShelf, 0, true));
  };

  const searches = sessions?.length ?? 0;
  const seen = sessions?.reduce((n, s) => n + s.loved + s.passed, 0) ?? 0;
  const shown = openId && detail?.session_id === openId ? detail : null;
  const items = shown ? itemsOf(shown) : [];
  const name = MASCOT_INFO[chosen].name;

  return (
    <div className="you">
      <div className="you-main" ref={main} inert={mpShown}>
        <PageTop titleId={titleId} title="Você" onBack={goBack} />
        <div className="p-body you-body">
          <div className="y-wrap">
            <div className="p-head y-head">
              {sessions && <div className="p-bub">{youLine(seen, onShelf, searches, erased)}</div>}
              <div className="y-mcol">
                <div className="a-stage p-stage">
                  <Lamp />
                  <button
                    ref={mascotBtn}
                    className="y-mbtn"
                    type="button"
                    aria-label={`Mascote: ${name}. Trocar`}
                    onClick={() => navigate({ name: 'mascote' })}
                  >
                    <Mascot className="p-m" mood={mood} paused={mpShown} />
                  </button>
                </div>
                <button
                  className="y-chg"
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() => navigate({ name: 'mascote' })}
                >
                  <span>{name}</span>
                  <Icon name="next" />
                </button>
              </div>
            </div>
            <div className="y-stats">
              <div>
                <b>{seen}</b>
                <span>vistos</span>
              </div>
              <div>
                <b>{onShelf}</b>
                <span>na estante</span>
              </div>
              <div>
                <b>{searches}</b>
                <span>{searches === 1 ? 'busca' : 'buscas'}</span>
              </div>
            </div>
            <h3 className="y-h">Buscas</h3>
            <ul className="slist">
              {sessions && searches === 0 && (
                <li className="y-empty" ref={emptyRow} tabIndex={-1}>
                  Suas buscas aparecem aqui.
                </li>
              )}
              {sessions?.map((s) => (
                <li key={s.session_id}>
                  <button className="s-row" type="button" onClick={() => open(s.session_id)}>
                    <span className="s-tx">
                      <b>{s.query}</b>
                      <span>
                        {shortDate(s.created_at)} · {countsLine(s.loved, s.passed)}
                      </span>
                    </span>
                    <span className="s-st" aria-hidden="true">
                      {s.loved_preview.map((b) => (
                        <GeneratedCover
                          key={b.id}
                          title={b.title}
                          author={b.authors.join(', ')}
                          color={b.cover.color}
                          width={26}
                          photo={b.cover.url}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {searches > 0 &&
              (confirming ? (
                // biome-ignore lint/a11y/useSemanticElements: confirmação curta em linha; fieldset quebraria o layout.
                <div className="y-conf" role="group" aria-label="Apagar buscas">
                  <p>
                    Apagar {searches} {searches === 1 ? 'busca' : 'buscas'}? A estante fica como está.
                  </p>
                  <div>
                    <button ref={cancelBtn} className="y-no" type="button" onClick={cancelErase}>
                      Cancelar
                    </button>
                    <button className="y-yes" type="button" onClick={erase}>
                      Apagar
                    </button>
                  </div>
                </div>
              ) : (
                <button ref={deleteBtn} className="y-del" type="button" onClick={askErase}>
                  <Icon name="trash" />
                  Apagar buscas
                </button>
              ))}
          </div>
        </div>
      </div>
      {mpShown && <MascotPage ref={overlay} onBack={goBack} />}
      <Sheet open={openId !== null} onClose={() => setOpenId(null)} label={shown?.query ?? 'Busca'}>
        {shown && (
          <div className="session">
            <div className="grab" aria-hidden="true" />
            <div className="ss-h">
              <div>
                <h3>{shown.query}</h3>
                <p>
                  {shortDate(shown.created_at)} · {summaryHeader(items)}
                </p>
              </div>
              <button className="a-ib" type="button" aria-label="Fechar" onClick={() => setOpenId(null)}>
                <Icon name="close" />
              </button>
            </div>
            <Summary items={items} onToggle={toggle} label={`Livros de “${shown.query}”`} />
            <div className="ss-foot">
              <button className="btn-primary" type="button" onClick={again}>
                <Icon name="search" />
                Buscar de novo
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
