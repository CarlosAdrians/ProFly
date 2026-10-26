import { Link } from 'react-router';
import { Icon } from '../components/ui/Icon/Icon';
import { useApi, useApiSession } from './hooks';
import { useScope, useAcademicReviewer } from './scope';
import { today, dayLabel, timeLabel } from './dates';
import { addDate } from './calendarModel';
import { Heading, LoadingError, Panel } from './ui';
import type { Application, Items, Occurrence, Planning, Subject, User } from './types';
import s from './Portal.module.css';

export interface UpcomingClass {
  id: string;
  date: string;
  startsAt: string;
  endsAt: string;
  subjectName: string;
  groupName: string;
  courseName?: string;
  teacherName?: string;
}
export function UpcomingClasses({ items }: { items: UpcomingClass[] }) {
  return (
    <ol className={s.upcomingList}>
      {items.map((item) => (
        <li key={item.id}>
          <div className={s.agendaDate}>
            <strong>{Number(item.date.slice(8))}</strong>
            <span>
              {new Date(`${item.date}T12:00:00Z`)
                .toLocaleDateString('pt-BR', { month: 'short' })
                .replace('.', '')}
            </span>
          </div>
          <div className={s.agendaDetails}>
            <time dateTime={item.startsAt}>
              {timeLabel(item.startsAt)}–{timeLabel(item.endsAt)}
            </time>
            <h3>{item.subjectName}</h3>
            <p>{[item.groupName, item.courseName, item.teacherName].filter(Boolean).join(' · ')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function CoordinatorOverview() {
  const canReview = useAcademicReviewer();
  const { courseId, courses } = useScope();
  const { user } = useApiSession();
  const applications = useApi<Items<Application>>(
    canReview ? `/courses/${courseId}/applications` : null,
  );
  const planning = useApi<Planning>(courseId ? `/courses/${courseId}/planning` : null);
  const occurrences = useApi<Items<Occurrence>>(
    courseId ? `/courses/${courseId}/occurrences` : null,
  );
  const subjects = useApi<Items<Subject>>(
    courseId ? `/courses/${courseId}/subjects?limit=100` : null,
  );
  const teachers = useApi<Items<User>>(courseId ? `/courses/${courseId}/teachers` : null);
  const start = today(),
    end = addDate(start, 28),
    now = new Date().toISOString();
  const upcoming = (occurrences.data?.items ?? [])
    .filter((o) => o.status === 'PLANNED' && o.date >= start && o.date <= end && o.endsAt > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5)
    .map((o) => ({
      ...o,
      teacherName: teachers.data?.items.find((t) => t.id === o.teacherId)?.name,
    }));
  const pending = applications.data?.items.filter((a) => a.status === 'SUBMITTED');
  const drafts = planning.data?.allocations.filter((a) => a.state === 'DRAFT');
  const awaiting = occurrences.data?.items.filter((o) => o.status === 'PLANNED' && o.endsAt <= now);
  return (
    <>
      <Heading
        title="Meu início"
        description={
          courses.find((c) => c.id === courseId)?.name
            ? `Acompanhe o que precisa de atenção em ${courses.find((c) => c.id === courseId)!.name}.`
            : 'Sua rotina de coordenação, em um só lugar.'
        }
      />
      {!courseId ? (
        <Panel title="Organize seu espaço">
          <p>Selecione um curso para acompanhar solicitações e aulas.</p>
          {user?.roles.includes('admin') && (
            <Link to="/administracao">Configurar cursos e coordenações</Link>
          )}
        </Panel>
      ) : (
        <>
          <div className={s.homeLayout}>
            <Panel title="Próximas aulas do curso">
              <div className={s.sectionCaption}>
                <span>Escala publicada · próximos 28 dias</span>
                <Link to="/calendario">Ver calendário</Link>
              </div>
              <LoadingError {...occurrences} retry={occurrences.refresh} />
              <LoadingError {...teachers} retry={teachers.refresh} />
              {occurrences.data && !upcoming.length ? (
                <div className={s.agendaEmpty}>
                  <Icon name="calendar" size={32} />
                  <h3>Sua próxima escala começa aqui</h3>
                  <p>Depois de publicar as alocações, as próximas aulas aparecem nesta agenda.</p>
                  <Link to="/alocacoes">Organizar escala</Link>
                </div>
              ) : (
                <UpcomingClasses items={upcoming} />
              )}
            </Panel>
            <Panel title="Para cuidar agora">
              {canReview && <LoadingError {...applications} retry={applications.refresh} />}
              <LoadingError {...occurrences} retry={occurrences.refresh} />
              <div className={s.workList}>
                {canReview && (
                  <Link to="/professores">
                    <Icon name="userPlus" size={24} />
                    <div>
                      <strong>Cadastros docentes</strong>
                      <p>
                        {pending
                          ? pending.length
                            ? `${pending.length} ${pending.length === 1 ? 'solicitação aguarda' : 'solicitações aguardam'} sua análise.`
                            : 'Nenhuma solicitação pendente na lista.'
                          : 'Consultando solicitações…'}
                      </p>
                    </div>
                    <Icon name="arrowRight" />
                  </Link>
                )}
                <Link to="/alocacoes">
                  <Icon name="calendar" size={24} />
                  <div>
                    <strong>Revisar planejamento</strong>
                    <p>
                      {drafts
                        ? drafts.length
                          ? `${drafts.length} ${drafts.length === 1 ? 'alocação em rascunho' : 'alocações em rascunho'}.`
                          : 'Nenhum rascunho aguardando revisão.'
                        : 'Consultando planejamento…'}
                    </p>
                  </div>
                  <Icon name="arrowRight" />
                </Link>
                <Link to="/historico">
                  <Icon name="check" size={24} />
                  <div>
                    <strong>Confirmar aulas</strong>
                    <p>
                      {awaiting
                        ? awaiting.length
                          ? `${awaiting.length} ${awaiting.length === 1 ? 'aula passada a confirmar' : 'aulas passadas a confirmar'}.`
                          : 'Nenhuma aula passada a confirmar na lista.'
                        : 'Consultando histórico…'}
                    </p>
                  </div>
                  <Icon name="arrowRight" />
                </Link>
                <Link to="/ausencias">
                  <Icon name="document" size={24} />
                  <div>
                    <strong>Atestados recebidos</strong>
                    <p>Consulte documentos e analise os afastamentos.</p>
                  </div>
                  <Icon name="arrowRight" />
                </Link>
              </div>
            </Panel>
          </div>
          <Panel title="Planejamento do curso">
            <div className={s.sectionCaption}>
              <span>
                {planning.data
                  ? `${planning.data.published.length} alocações publicadas`
                  : 'Consultando publicações…'}
              </span>
              <Link to="/alocacoes">Abrir alocações</Link>
            </div>
            {drafts?.length === 0 && (
              <p className={s.muted}>
                Você pode criar uma alocação ou revisar uma existente antes de publicar.
              </p>
            )}
            {drafts?.slice(0, 4).map((a) => (
              <div className={s.row} key={a.id}>
                <div>
                  <strong>
                    {subjects.data?.items.find((v) => v.id === a.subjectId)?.name ?? 'Disciplina'}
                  </strong>
                  <p>
                    {teachers.data?.items.find((v) => v.id === a.teacherId)?.name ?? 'Professor'} ·{' '}
                    {a.slots.length} encontros previstos
                  </p>
                </div>
                <span className={s.badge}>Rascunho</span>
              </div>
            ))}
            {pending?.length ? (
              <p className={s.muted}>
                Há cadastros para analisar antes de incluir novos professores na escala.
              </p>
            ) : null}
            <p className={s.muted}>
              Referência de hoje: {dayLabel(start)}. A escala do professor muda após a publicação.
            </p>
          </Panel>
        </>
      )}
    </>
  );
}
