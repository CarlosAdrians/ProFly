import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader/PageHeader';
import { Button } from '../../components/ui/Button/Button';
import { SearchField } from '../../components/ui/SearchField/SearchField';
import { Alert } from '../../components/ui/Alert/Alert';
import { DataTable, type Column } from '../../components/ui/DataTable/DataTable';
import { Modal } from '../../components/ui/Modal/Modal';
import { ProfileAvatar } from '../account/components/ProfileAvatar';
import { courses } from '../registration/catalog';
import { matchesSearch } from '../../utils/text';
import { PlanModal, type PlanEditor } from './PlanModal';
import { cancelPlan, shiftLabels, shiftOf, usePlans, type Plan } from './service';
import styles from './Planning.module.css';
export function AllocationsPage() {
  const { plans, error: readError } = usePlans();
  const [courseId, setCourseId] = useState('direito');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [editor, setEditor] = useState<PlanEditor | null>(null);
  const [cancelling, setCancelling] = useState<Plan | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const filtered = plans
    .filter(
      (plan) =>
        plan.courseId === courseId &&
        (filter === 'cancelled' ? plan.state === 'CANCELLED' : plan.state === 'DRAFT') &&
        (filter !== 'unscheduled' || !plan.date) &&
        matchesSearch(`${plan.subject} ${plan.teacherName} ${plan.group}`, query),
    )
    .sort(
      (a, b) =>
        (a.date || '9999').localeCompare(b.date || '9999') || a.start.localeCompare(b.start),
    );
  const current = plans.filter((plan) => plan.courseId === courseId && plan.state === 'DRAFT');
  const columns: Column<Plan>[] = [
    {
      key: 'subject',
      header: 'Disciplina e turma',
      render: (plan) => (
        <div className={styles.tableSubject}>
          <strong>{plan.subject}</strong>
          <span>{plan.group}</span>
        </div>
      ),
    },
    {
      key: 'teacher',
      header: 'Professor',
      render: (plan) => (
        <div className={styles.tableTeacher}>
          <ProfileAvatar email={plan.teacherEmail} size={34} />
          <span>{plan.teacherName}</span>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Dia e horário',
      render: (plan) =>
        plan.date ? (
          <div className={styles.tableSubject}>
            <strong>
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(new Date(`${plan.date}T12:00:00`))}
            </strong>
            <span>
              {plan.start}–{plan.end} · {shiftLabels[shiftOf(plan.start)]}
            </span>
          </div>
        ) : (
          <span className={styles.unscheduledBadge}>Horário a definir</span>
        ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (plan) => (
        <span className={styles.draftBadge}>
          {plan.state === 'CANCELLED' ? 'Cancelado' : 'Rascunho'}
        </span>
      ),
    },
    {
      key: 'options',
      header: 'Ações',
      render: (plan) =>
        plan.state === 'DRAFT' ? (
          <div className={styles.rowActions}>
            <button
              type="button"
              onClick={() => setEditor({ plan })}
              aria-label={`Editar ${plan.subject} de ${plan.teacherName}`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setCancelling(plan);
              }}
              aria-label={`Cancelar ${plan.subject} de ${plan.teacherName}`}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <span className={styles.muted}>Preservado no histórico local</span>
        ),
    },
  ];
  return (
    <section className={styles.page}>
      <title>Alocações | ProFly</title>
      <PageHeader
        title="Alocações"
        titleId="allocations-title"
        actions={<Button onClick={() => setEditor({ courseId })}>+ Nova alocação</Button>}
      />
      <div className={styles.pageIntro}>
        <p>
          Reúna disciplina, professor, turma e horário. As alterações também aparecem no calendário.
        </p>
        <Link to="/calendario" className={styles.calendarLink}>
          Abrir calendário
        </Link>
      </div>
      <div className={styles.summaryStrip}>
        <div>
          <strong>{current.length}</strong>
          <span>alocações em rascunho</span>
        </div>
        <div>
          <strong>{current.filter((plan) => !!plan.date).length}</strong>
          <span>com horário definido</span>
        </div>
        <div>
          <strong>{current.filter((plan) => !plan.date).length}</strong>
          <span>aguardando horário</span>
        </div>
        <p>
          Planejamento em revisão.
          <br />
          Nenhuma escala foi publicada.
        </p>
      </div>
      {readError && <Alert variant="error">{readError}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {error && !cancelling && <Alert variant="error">{error}</Alert>}
      <div className={styles.allocationPanel}>
        <div className={styles.listFilters}>
          <SearchField
            label="Pesquisar alocação"
            placeholder="Disciplina, professor ou turma"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label>
            Curso
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Situação
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="active">Em planejamento</option>
              <option value="unscheduled">Horário a definir</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </label>
        </div>
        <DataTable
          caption="Alocações em planejamento"
          columns={columns}
          rows={filtered}
          getRowKey={(plan) => plan.id}
          emptyMessage="Nenhuma alocação encontrada. Crie um rascunho ou ajuste os filtros."
        />
      </div>
      <p className={styles.gradeNote}>
        Os dados ilustrativos ficam neste navegador. Os conflitos de professor e turma são
        conferidos no rascunho; a publicação institucional ainda não está disponível.
      </p>
      <PlanModal
        editor={editor}
        onClose={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          setMessage('Alocação salva em rascunho.');
        }}
      />
      <Modal open={!!cancelling} title="Cancelar rascunho" onClose={() => setCancelling(null)}>
        <h2>Cancelar este rascunho?</h2>
        <p>
          {cancelling?.subject} · {cancelling?.teacherName}
        </p>
        <p>
          Ele sai do calendário e permanece na lista de canceladas. Nenhuma aula publicada será
          alterada.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={() => setCancelling(null)}>
            Manter alocação
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!cancelling) return;
              try {
                cancelPlan(cancelling);
                setCancelling(null);
                setMessage('Rascunho cancelado e preservado na lista de canceladas.');
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Não foi possível cancelar.');
              }
            }}
          >
            Cancelar rascunho
          </Button>
        </div>
      </Modal>
    </section>
  );
}
