import { useMemo, useState } from 'react';
import { ListPanel } from '../../../components/ui/ListPanel/ListPanel';
import { DataTable, type Column } from '../../../components/ui/DataTable/DataTable';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { StatusBadge } from '../../../components/ui/StatusBadge/StatusBadge';
import { ActionsMenu } from '../../../components/ui/ActionsMenu/ActionsMenu';
import { Alert } from '../../../components/ui/Alert/Alert';
import { matchesSearch } from '../../../utils/text';
import { useTeachers } from '../hooks/useTeachers';
import { TeacherFormModal } from '../components/TeacherFormModal';
import { InviteLinkModal } from '../../invites/components/InviteLinkModal';
import type { Teacher, TeacherInput } from '../types';
import styles from './TeachersPage.module.css';

type ModalState = { mode: 'create' } | { mode: 'edit'; teacher: Teacher } | null;

export function TeachersPage() {
  const { teachers, loading, create, update, setStatus } = useTeachers();
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [message, setMessage] = useState<string>();
  const [inviting, setInviting] = useState<Teacher>();

  const visible = useMemo(
    () =>
      teachers
        .filter((teacher) => matchesSearch(teacher.name, query))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [teachers, query],
  );

  const editing = modal?.mode === 'edit' ? modal.teacher : undefined;
  const others = teachers.filter((teacher) => teacher.id !== editing?.id);

  async function handleSubmit(input: TeacherInput) {
    if (editing) {
      await update(editing.id, input);
      setMessage(`Dados de ${input.name} atualizados.`);
    } else {
      await create(input);
      setMessage(`Professor ${input.name} cadastrado.`);
    }
    setModal(null);
  }

  async function toggleStatus(teacher: Teacher) {
    const next = teacher.status === 'active' ? 'inactive' : 'active';
    await setStatus(teacher.id, next);
    setMessage(`${teacher.name} ${next === 'active' ? 'ativado' : 'inativado'}.`);
  }

  const columns: Column<Teacher>[] = [
    { key: 'avatar', header: 'Foto', hideHeader: true, render: () => <Avatar /> },
    { key: 'name', header: 'Nome', render: (teacher) => teacher.name },
    { key: 'email', header: 'E-mail', render: (teacher) => teacher.email },
    { key: 'area', header: 'Área de Atuação', render: (teacher) => teacher.area },
    {
      key: 'hours',
      header: 'Carga Horária',
      nowrap: true,
      render: (teacher) => `${teacher.weeklyHours} Horas/Semanais`,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (teacher) => <StatusBadge status={teacher.status} />,
    },
    {
      key: 'options',
      header: 'Opções',
      align: 'center',
      render: (teacher) => (
        <ActionsMenu
          label={`Opções de ${teacher.name}`}
          actions={[
            { label: 'Editar', onSelect: () => setModal({ mode: 'edit', teacher }) },
            // Convite só para professores ativos.
            ...(teacher.status === 'active'
              ? [{ label: 'Gerar convite', onSelect: () => setInviting(teacher) }]
              : []),
            {
              label: teacher.status === 'active' ? 'Inativar' : 'Ativar',
              onSelect: () => void toggleStatus(teacher),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <title>Professores | ProFly</title>
      <ListPanel
        title="Professores"
        actionLabel="+ Novo Professor"
        onAction={() => {
          setMessage(undefined);
          setModal({ mode: 'create' });
        }}
        searchLabel="Pesquisar professor por nome"
        searchValue={query}
        onSearchChange={setQuery}
        status={message && <Alert variant="success">{message}</Alert>}
      >
        <div className={styles.table}>
          <DataTable
            caption="Professores cadastrados"
            columns={columns}
            rows={visible}
            getRowKey={(teacher) => teacher.id}
            emptyMessage={
              loading
                ? 'Carregando professores…'
                : query
                  ? `Nenhum professor encontrado para “${query}”.`
                  : 'Nenhum professor cadastrado.'
            }
          />
        </div>
      </ListPanel>
      <TeacherFormModal
        open={modal !== null}
        teacher={editing}
        others={others}
        onClose={() => setModal(null)}
        onSubmit={handleSubmit}
      />
      <InviteLinkModal teacher={inviting} onClose={() => setInviting(undefined)} />
    </>
  );
}
