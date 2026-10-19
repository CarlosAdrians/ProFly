import { useMemo, useState } from 'react';
import { ListPanel } from '../../../components/ui/ListPanel/ListPanel';
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
  const { subjects, loading, create, update, setStatus } = useSubjects();
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [message, setMessage] = useState<string>();

  const visible = useMemo(
    () =>
      subjects
        .filter((subject) => matchesSearch(subject.name, query))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [subjects, query],
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
    await setStatus(subject.id, next);
    setMessage(`${subject.name} ${next === 'active' ? 'ativada' : 'inativada'}.`);
  }

  const columns: Column<Subject>[] = [
    { key: 'name', header: 'Nome', render: (subject) => subject.name },
    { key: 'code', header: 'Código', nowrap: true, render: (subject) => subject.code },
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
      <ListPanel
        title="Disciplinas"
        actionLabel="+ Nova Disciplina"
        onAction={() => {
          setMessage(undefined);
          setModal({ mode: 'create' });
        }}
        searchLabel="Pesquisar disciplina por nome"
        searchValue={query}
        onSearchChange={setQuery}
        status={message && <Alert variant="success">{message}</Alert>}
      >
        <div className={styles.table}>
          <DataTable
            caption="Disciplinas cadastradas"
            columns={columns}
            rows={visible}
            getRowKey={(subject) => subject.id}
            emptyMessage={
              loading
                ? 'Carregando disciplinas…'
                : query
                  ? `Nenhuma disciplina encontrada para “${query}”.`
                  : 'Nenhuma disciplina cadastrada.'
            }
          />
        </div>
      </ListPanel>
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
