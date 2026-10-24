import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { Button } from '../../../components/ui/Button/Button';
import { SearchField } from '../../../components/ui/SearchField/SearchField';
import { DataTable, type Column } from '../../../components/ui/DataTable/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge/StatusBadge';
import { ActionsMenu } from '../../../components/ui/ActionsMenu/ActionsMenu';
import { Alert } from '../../../components/ui/Alert/Alert';
import { matchesSearch } from '../../../utils/text';
import { useSubjects } from '../hooks/useSubjects';
import { SubjectFormModal } from '../components/SubjectFormModal';
import type { Subject, SubjectInput } from '../types';
import styles from './SubjectsPage.module.css';

type ModalState = { mode: 'create' } | { mode: 'edit'; subject: Subject } | null;

export function SubjectsPage() {
  const { subjects, loading, error: readError, create, update, setStatus } = useSubjects();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [failure, setFailure] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [message, setMessage] = useState<string>();

  const visible = useMemo(
    () =>
      subjects
        .filter(
          (subject) =>
            matchesSearch(`${subject.name} ${subject.code}`, query) &&
            (statusFilter === 'all' || subject.status === statusFilter),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [subjects, query, statusFilter],
  );

  const editing = modal?.mode === 'edit' ? modal.subject : undefined;
  const others = subjects.filter((subject) => subject.id !== editing?.id);

  async function handleSubmit(input: SubjectInput) {
    if (editing) {
      // Apenas o nome é atualizado; o código existente é preservado.
      await update(editing.id, { name: input.name });
      setMessage(`Dados de ${input.name} atualizados.`);
    } else {
      const created = await create(input);
      setMessage(`Disciplina ${created.name} cadastrada com o código ${created.code}.`);
    }
    setModal(null);
  }

  async function toggleStatus(subject: Subject) {
    const next = subject.status === 'active' ? 'inactive' : 'active';
    try {
      await setStatus(subject.id, next);
      setFailure('');
      setMessage(`${subject.name} ${next === 'active' ? 'ativada' : 'inativada'}.`);
    } catch {
      setFailure('Não foi possível alterar a disciplina. Tente novamente.');
    }
  }

  const columns: Column<Subject>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (subject) => (
        <span className={styles.subjectName}>
          <span className={styles.bookIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 4h12a2 2 0 0 1 2 2v14H7a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1Z" />
              <path d="M4 17a3 3 0 0 1 3-3h12M8 7h7M8 10h5" />
            </svg>
          </span>
          {subject.name}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Código',
      nowrap: true,
      render: (subject) => <span className={styles.code}>{subject.code}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (subject) => <StatusBadge status={subject.status} />,
    },
    {
      key: 'options',
      header: 'Opções',
      align: 'center',
      render: (subject) => (
        <ActionsMenu
          label={`Opções de ${subject.name}`}
          actions={[
            { label: 'Editar', onSelect: () => setModal({ mode: 'edit', subject }) },
            {
              label: subject.status === 'active' ? 'Inativar' : 'Ativar',
              onSelect: () => void toggleStatus(subject),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <title>Disciplinas | ProFly</title>
      <section className={styles.page} aria-labelledby="subjects-title">
        <PageHeader
          title="Disciplinas"
          titleId="subjects-title"
          actions={
            <Button
              onClick={() => {
                setMessage(undefined);
                setModal({ mode: 'create' });
              }}
            >
              + Nova disciplina
            </Button>
          }
        />
        <div className={styles.intro}>
          <p>
            Organize as disciplinas do curso.
            <span>Gerencie as disciplinas que entram no planejamento do curso.</span>
          </p>
          <span className={styles.coursePill}>Direito</span>
        </div>
        <div aria-live="polite">
          {readError && <Alert variant="error">{readError}</Alert>}
          {failure && <Alert variant="error">{failure}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}
        </div>
        <div className={styles.workspace}>
          <div className={styles.catalog}>
            <div className={styles.catalogHeader}>
              <div>
                <h2>Catálogo do curso</h2>
                <p>
                  {subjects.length} disciplinas ·{' '}
                  {subjects.filter((subject) => subject.status === 'active').length} ativas
                </p>
              </div>
              <span className={styles.catalogMark} aria-hidden="true">
                ▤
              </span>
            </div>
            <div className={styles.tools}>
              <SearchField
                label="Pesquisar disciplina por nome"
                placeholder="Buscar nome ou código"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className={styles.filters} role="group" aria-label="Situação das disciplinas">
                {[
                  ['all', 'Todas'],
                  ['active', 'Ativas'],
                  ['inactive', 'Inativas'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={statusFilter === value}
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.table}>
              <DataTable
                caption="Disciplinas cadastradas"
                columns={columns}
                rows={visible}
                getRowKey={(subject) => subject.id}
                emptyMessage={
                  readError
                    ? 'Catálogo indisponível. Recarregue a página para tentar novamente.'
                    : loading
                      ? 'Carregando disciplinas…'
                      : query
                        ? `Nenhuma disciplina encontrada para “${query}”.`
                        : 'Nenhuma disciplina nesta situação.'
                }
              />
            </div>
            <div className={styles.catalogFooter}>
              {visible.length} de {subjects.length} disciplinas
              <span>Códigos preservados ao editar</span>
            </div>
          </div>
          <aside className={styles.guide}>
            <div className={styles.guideArt} aria-hidden="true">
              <svg viewBox="0 0 200 130" fill="none">
                <rect
                  x="42"
                  y="26"
                  width="80"
                  height="94"
                  rx="10"
                  fill="currentColor"
                  opacity=".13"
                />
                <rect
                  x="68"
                  y="14"
                  width="88"
                  height="100"
                  rx="10"
                  fill="currentColor"
                  opacity=".1"
                  stroke="currentColor"
                />
                <path
                  d="M85 39h52M85 51h38M85 76h52M85 88h32"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="106" r="18" fill="var(--color-bg)" stroke="currentColor" />
                <path
                  d="m142 106 6 6 10-12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2>Do catálogo para a agenda</h2>
            <p>
              As disciplinas ativas ficam disponíveis ao criar uma alocação. Inativar mantém o
              registro para consulta.
            </p>
            <Link to="/alocacoes">Organizar alocações</Link>
            <div className={styles.guideNote}>
              <strong>Antes de editar</strong>
              <p>
                Use um nome claro e confira se a disciplina já existe. O código identifica o
                registro e permanece o mesmo.
              </p>
            </div>
          </aside>
        </div>
      </section>
      <SubjectFormModal
        open={modal !== null}
        subject={editing}
        others={others}
        onClose={() => setModal(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
