import { PageTop } from '../ui/PageTop';

/* Página ainda vazia: estante (A5), baralho (A4) e você (A6) ganham conteúdo nas próximas fases. */
export function PlaceholderPage({
  titleId,
  title,
  onBack,
}: {
  titleId: string;
  title: string;
  onBack: () => void;
}) {
  return (
    <>
      <PageTop titleId={titleId} title={title} onBack={onBack} />
      <div className="p-body">
        <p className="t-body">Em construção.</p>
      </div>
    </>
  );
}
