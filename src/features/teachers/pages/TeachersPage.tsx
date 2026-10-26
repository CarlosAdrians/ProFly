import { useState } from 'react';
import { DataTable, type Column } from '../../../components/ui/DataTable/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge/StatusBadge';
import { ActionsMenu } from '../../../components/ui/ActionsMenu/ActionsMenu';
import { Alert } from '../../../components/ui/Alert/Alert';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { SearchField } from '../../../components/ui/SearchField/SearchField';
import { matchesSearch } from '../../../utils/text';
import { useTeachers } from '../hooks/useTeachers';
import { useDemoProfiles, reviewDemoRequest } from '../../registration/demoService';
import { courses, weekdays } from '../../registration/catalog';
import type { TeacherProfile, CourseRequest } from '../../registration/model';
import { ProfileAvatar } from '../../account/components/ProfileAvatar';
import type { Teacher } from '../types';
import styles from './TeachersPage.module.css';
import { useAuth } from '../../auth/session/useAuth';
import { demoCoordinatorCourses } from '../../auth/demoCourseScope';

export function TeachersPage() {
  const { session } = useAuth();
  const assignedCourses = demoCoordinatorCourses(session);
  const { teachers, loading, setStatus } = useTeachers();
  const { profiles, error: profileError } = useDemoProfiles();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'teachers' | 'requests'>('teachers');
  const [selectedCourse, setCourseId] = useState(assignedCourses[0] ?? '');
  const courseId = assignedCourses.includes(selectedCourse)
    ? selectedCourse
    : (assignedCourses[0] ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<TeacherProfile | Teacher | null>(null);
  const [reason, setReason] = useState('');
  const pending = profiles.filter((profile) =>
    profile.requests.some(
      (request) => request.courseId === courseId && request.status === 'PENDING',
    ),
  );
  const registered: Teacher[] = profiles
    .filter((profile) =>
      profile.requests.some((r) => r.courseId === courseId && r.status === 'APPROVED'),
    )
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      area: profile.knowledge.map((k) => k.name).join(', '),
      weeklyHours: profile.weeklyHours ? +profile.weeklyHours : undefined,
      status: 'active',
    }));
  const visible = [...(courseId === 'direito' ? teachers : []), ...registered]
    .filter((teacher) => matchesSearch(teacher.name, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  async function toggleStatus(teacher: Teacher) {
    try {
      const next = teacher.status === 'active' ? 'inactive' : 'active';
      await setStatus(teacher.id, next);
      setMessage(`${teacher.name} ${next === 'active' ? 'ativado' : 'inativado'}.`);
    } catch {
      setError('Não foi possível alterar o vínculo.');
    }
  }
  function open(profile: TeacherProfile | Teacher) {
    setViewing(profile);
    setReason('');
    setError('');
  }
  const application =
    viewing && 'requests' in viewing
      ? viewing.requests.find((r) => r.courseId === courseId)
      : undefined;
  async function decide(decision: Exclude<CourseRequest['status'], 'PENDING'>) {
    if (!viewing || !('requests' in viewing)) return;
    try {
      reviewDemoRequest(viewing.email, courseId, decision, reason, viewing.version, session);
      setMessage(
        `Solicitação de ${viewing.name} ${decision === 'APPROVED' ? 'aprovada' : decision === 'REJECTED' ? 'recusada' : 'devolvida para ajustes'} neste curso.`,
      );
      setViewing(null);
      setError('');
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Não foi possível registrar a decisão.',
      );
    }
  }
  const columns: Column<Teacher>[] = [
    {
      key: 'avatar',
      header: 'Foto',
      hideHeader: true,
      render: (teacher) => <ProfileAvatar email={teacher.email} />,
    },
    { key: 'name', header: 'Nome', render: (teacher) => teacher.name },
    { key: 'email', header: 'E-mail', render: (teacher) => teacher.email },
    { key: 'area', header: 'Área de Atuação', render: (teacher) => teacher.area },
    {
      key: 'hours',
      header: 'Carga Horária',
      nowrap: true,
      render: (teacher) =>
        teacher.weeklyHours === undefined
          ? 'Não informada'
          : `${teacher.weeklyHours} Horas/Semanais`,
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
            {
              label: 'Ver perfil',
              onSelect: () => open(profiles.find((p) => p.email === teacher.email) ?? teacher),
            },
            ...(teachers.some((t) => t.id === teacher.id)
              ? [
                  {
                    label: teacher.status === 'active' ? 'Inativar' : 'Ativar',
                    onSelect: () => void toggleStatus(teacher),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];
  return (
    <section className={styles.page}>
      <title>Professores | ProFly</title>
      {profileError && <Alert variant="error">{profileError}</Alert>}
      <PageHeader
        title="Professores"
        titleId="teachers-title"
        actions={
          <label className={styles.courseLabel}>
            Curso
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setMessage('');
              }}
            >
              {courses
                .filter((course) => assignedCourses.includes(course.id))
                .map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
            </select>
          </label>
        }
      />
      <p className={styles.intro}>
        O professor cria a própria conta pelo login. Você analisa a entrada no curso e acompanha os
        vínculos aprovados.
      </p>
      {message && <Alert variant="success">{message}</Alert>}
      <div className={styles.tabs} role="tablist" aria-label="Professores e solicitações">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'teachers'}
          onClick={() => setTab('teachers')}
        >
          Professores do curso
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'requests'}
          onClick={() => setTab('requests')}
        >
          Solicitações <span>{pending.length}</span>
        </button>
      </div>
      {tab === 'teachers' ? (
        <div className={styles.panel} role="tabpanel" aria-label="Professores do curso">
          <SearchField
            label="Pesquisar professor por nome"
            placeholder="Nome"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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
                    : 'Nenhum vínculo aprovado neste curso. Analise as solicitações para começar.'
              }
            />
          </div>
        </div>
      ) : (
        <div className={styles.requests} role="tabpanel" aria-label="Solicitações de entrada">
          {pending.length === 0 && (
            <div className={styles.empty}>
              <h2>Nenhuma solicitação pendente</h2>
              <p>
                Quando um professor se cadastrar e selecionar este curso, a solicitação aparecerá
                aqui para sua análise.
              </p>
            </div>
          )}
          {pending.map((profile) => (
            <article className={styles.request} key={profile.id}>
              <ProfileAvatar email={profile.email} size={56} />
              <div>
                <span className={styles.pending}>Aguardando análise</span>
                <h2>{profile.name}</h2>
                <p>{profile.email}</p>
                <p>{profile.requests.find((r) => r.courseId === courseId)?.subjects.join(' · ')}</p>
              </div>
              <Button onClick={() => open(profile)}>Analisar solicitação</Button>
            </article>
          ))}
        </div>
      )}
      {error && !viewing && <Alert variant="error">{error}</Alert>}
      <Modal
        open={viewing !== null}
        size="wide"
        title={application?.status === 'PENDING' ? 'Analisar solicitação' : 'Perfil do professor'}
        onClose={() => setViewing(null)}
      >
        {viewing && (
          <>
            <header className={styles.profileHeader}>
              <ProfileAvatar email={viewing.email} size={64} />
              <div>
                <h2>{viewing.name}</h2>
                <p>{viewing.email}</p>
              </div>
            </header>
            {'education' in viewing ? (
              <>
                <p className={styles.declared}>
                  Informações declaradas pelo professor. A aprovação de entrada não confirma
                  automaticamente todos os conhecimentos nem atribui aulas.
                </p>
                <h3>Formação acadêmica</h3>
                {viewing.education.map((item) => (
                  <p key={item.id}>
                    {item.degree} em {item.field} · {item.institution} · {item.year}
                  </p>
                ))}
                <h3>Conhecimentos declarados</h3>
                <ul>
                  {viewing.knowledge.map((item) => (
                    <li key={item.id}>
                      {item.name} — nível {item.level}
                    </li>
                  ))}
                </ul>
                <div className={styles.profileGrid}>
                  {(['teaching', 'professional'] as const).map((key) => (
                    <div key={key}>
                      <h3>
                        {key === 'teaching' ? 'Experiência docente' : 'Experiência profissional'}
                      </h3>
                      <p>
                        {viewing[key].status === 'NONE'
                          ? 'Declarou não possuir experiência.'
                          : viewing[key].status === 'UNKNOWN'
                            ? 'Ainda não informado.'
                            : `${viewing[key].organization} · ${viewing[key].activity} · ${viewing[key].units} ${key === 'teaching' ? 'semestres' : 'meses'}`}
                      </p>
                    </div>
                  ))}
                </div>
                <h3>Disponibilidade</h3>
                <ul>
                  {viewing.availability.map((item) => (
                    <li key={item.id}>
                      {weekdays[item.weekday]} · {item.start}–{item.end}
                    </li>
                  ))}
                </ul>
                <p>
                  Dedicação pretendida:{' '}
                  {viewing.weeklyHours
                    ? `${viewing.weeklyHours} h/semana`
                    : 'não informada (opcional)'}
                  . O limite institucional será definido separadamente.
                </p>
              </>
            ) : (
              <>
                <p>{viewing.area}</p>
                <p>Dedicação: {viewing.weeklyHours} h/semana</p>
                <p>
                  Cadastro ilustrativo da demonstração. Perfil acadêmico detalhado ainda não
                  informado.
                </p>
              </>
            )}
            {application?.status === 'PENDING' && (
              <div className={styles.review}>
                <h3>Análise para {courses.find((c) => c.id === courseId)?.name}</h3>
                <p>A decisão vale somente para este curso.</p>
                <label>
                  Motivo ou orientações
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {error && <Alert variant="error">{error}</Alert>}
                <div className={styles.reviewActions}>
                  <Button variant="secondary" onClick={() => void decide('CHANGES_REQUESTED')}>
                    Pedir ajustes
                  </Button>
                  <Button variant="danger" onClick={() => void decide('REJECTED')}>
                    Recusar
                  </Button>
                  <Button variant="success" onClick={() => void decide('APPROVED')}>
                    Aprovar neste curso
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </section>
  );
}
