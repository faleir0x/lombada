import { useCallback, useEffect, useState } from 'react';
import type { SessionDetail, SessionId, SessionSummary } from '../../core/api/types';
import { api } from '../../platform/appApi';
import { requestSearch } from '../../platform/handoff';
import { goBack } from '../../platform/router';
import { enqueueWrite, writesSettled } from '../../platform/writes';
import { GeneratedCover } from '../../ui/Cover';
import { Icon } from '../../ui/icons/Icon';
import { Mascot } from '../../ui/mascot/Mascot';
import { PageTop } from '../../ui/PageTop';
import { countsLine, Summary, type SummaryItem, summaryHeader } from '../../ui/Summary';
import { Sheet } from '../../ui/shell/Sheet';
import { shortDate } from '../shelf/BookDetail';
import '../../ui/summary.css';
import '../shelf/shelf.css';
import './you.css';

/* Página Você (DESIGN.md §6, opção C · Área do usuário): dois números, o mascote e o histórico de buscas.
   Tocar numa busca abre o resumo dela numa folha, com o ♥ funcionando como no fim do baralho, e
   "Buscar de novo" fixo no pé. */

/** Todas as páginas do histórico. */
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

export function YouPage({ titleId }: { titleId: string }) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [onShelf, setOnShelf] = useState(0);
  const [openId, setOpenId] = useState<SessionId | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);

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
      enqueueWrite(() => (on ? api.addToShelf(item.id, sessionId) : api.removeFromShelf(item.id)));
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

  const seen = sessions?.reduce((n, s) => n + s.loved + s.passed, 0) ?? 0;
  const shown = openId && detail?.session_id === openId ? detail : null;
  const items = shown ? itemsOf(shown) : [];

  return (
    <div className="you">
      <PageTop titleId={titleId} title="Você" onBack={goBack} />
      <div className="p-body you-body">
        <div className="y-wrap">
          <div className="y-stats">
            <div>
              <b>{seen}</b>
              <span>vistos</span>
            </div>
            <div>
              <b>{onShelf}</b>
              <span>na estante</span>
            </div>
          </div>
          <h3 className="y-h">Mascote</h3>
          <div className="y-masc">
            <Mascot className="y-m" />
            <span>Fantasma</span>
          </div>
          <h3 className="y-h">Buscas</h3>
          <ul className="slist">
            {sessions && sessions.length === 0 && <li className="y-empty">Suas buscas aparecem aqui.</li>}
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
        </div>
      </div>
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
