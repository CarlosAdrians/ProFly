import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/session/useAuth';
import { useDemoProfiles } from './demoService';
import { courses, weekdays } from './catalog';
import { useInstitutionToday } from '../planning/institutionDate';
import { Alert } from '../../components/ui/Alert/Alert';
import styles from './TeacherHomePage.module.css';
const statusLabels = {
  PENDING: 'Aguardando análise',
  APPROVED: 'Aprovado neste curso',
  REJECTED: 'Não aprovado',
  CHANGES_REQUESTED: 'Ajustes solicitados',
};
export function TeacherHomePage() {
  const { session } = useAuth();
  const { profiles, error } = useDemoProfiles();
  const profile = profiles.find((item) => item.email === session?.email);
  const today = useInstitutionToday();
  const [day, setDay] = useState((new Date(`${today}T12:00:00`).getDay() + 6) % 7);
  const windows =
    profile?.availability
      .filter((item) => item.weekday === day)
      .sort((a, b) => a.start.localeCompare(b.start)) ?? [];
  const adjustments =
    profile?.requests.filter((item) => item.status === 'CHANGES_REQUESTED').length ?? 0;
  const pending = profile?.requests.filter((item) => item.status === 'PENDING') ?? [];
  return (
    <section className={styles.page}>
      <title>Meu início | ProFly</title>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>
            {new Intl.DateTimeFormat('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(new Date(`${today}T12:00:00`))}
          </p>
          <h1>Olá, {session?.name.split(' ')[0]}.</h1>
          <p>Consulte sua agenda e mantenha seus horários pretendidos atualizados.</p>
        </div>
        <Link to="/calendario" className={styles.calendarLink}>
          Abrir calendário
        </Link>
      </header>
      {error && <Alert variant="error">{error}</Alert>}
      {pending.length > 0 && (
        <Alert variant="info">
          Seu cadastro aguarda aprovação em{' '}
          {pending
            .map(
              (request) =>
                courses.find((course) => course.id === request.courseId)?.name ?? request.courseId,
            )
            .join(', ')}
          . Cada coordenação aprova apenas a entrada em seu curso. Enquanto isso, você pode
          acompanhar a análise e atualizar seus horários pretendidos.{' '}
          <a href="#minhas-solicitacoes">Ver situação das solicitações</a>
        </Alert>
      )}
      {adjustments > 0 && (
        <Alert variant="info">
          A coordenação pediu ajustes em seu cadastro.{' '}
          <a href="#minhas-solicitacoes">Confira o retorno abaixo.</a>
        </Alert>
      )}
      <div className={styles.workspace}>
        <div className={styles.primary}>
          <section className={styles.panel} aria-labelledby="agenda-title">
            <header className={styles.panelHeading}>
              <div>
                <h2 id="agenda-title">Agenda de aulas</h2>
                <p>Escala publicada pela coordenação</p>
              </div>
              <span className={styles.badge}>Aguardando publicação</span>
            </header>
            <div className={styles.empty}>
              <span aria-hidden="true" className={styles.emptyIcon}>
                ▦
              </span>
              <div>
                <h3>Nenhuma aula publicada para consulta</h3>
                <p>
                  Quando sua escala for publicada, os encontros aparecerão aqui e no calendário.
                  Seus horários pretendidos ficam em uma seção separada.
                </p>
              </div>
            </div>
            <footer className={styles.panelFooter}>
              <Link to="/calendario">Consultar calendário de aulas</Link>
            </footer>
          </section>
          <section className={styles.panel} aria-labelledby="history-title">
            <header className={styles.panelHeading}>
              <div>
                <h2 id="history-title">Histórico de aulas</h2>
                <p>Últimas 10 aulas com ocorrência registrada</p>
              </div>
            </header>
            <div className={styles.historyColumns} aria-hidden="true">
              <span>Disciplina e turma</span>
              <span>Data e horário</span>
              <span>Situação</span>
            </div>
            <div className={styles.historyEmpty}>
              <h3>Nenhuma ocorrência disponível</h3>
              <p>
                O histórico depende do registro das aulas. Uma data passada não confirma que a aula
                foi realizada.
              </p>
            </div>
          </section>
        </div>
        <aside className={styles.secondary}>
          <section className={styles.panel} aria-labelledby="availability-summary-title">
            <header className={styles.panelHeading}>
              <div>
                <h2 id="availability-summary-title">Horários pretendidos</h2>
                <p>
                  {profile?.weeklyHours
                    ? `${profile.weeklyHours} horas semanais pretendidas`
                    : 'Preferências informadas no cadastro'}
                </p>
              </div>
            </header>
            <div className={styles.availabilityBody}>
              <div className={styles.weekdays} role="group" aria-label="Dia da disponibilidade">
                {weekdays.map((label, index) => (
                  <button
                    type="button"
                    key={label}
                    aria-pressed={day === index}
                    aria-label={label}
                    onClick={() => setDay(index)}
                  >
                    <span>{label.slice(0, 3)}</span>
                    <i
                      data-available={profile?.availability.some((item) => item.weekday === index)}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <p className={styles.dayLabel}>{weekdays[day]}</p>
              {windows.length ? (
                windows.map((item) => (
                  <div className={styles.window} key={item.id}>
                    <strong>
                      {item.start}–{item.end}
                    </strong>
                    <span>Pretendido</span>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>Sem horário pretendido neste dia.</p>
              )}
              <p className={styles.note}>
                Preferências de disponibilidade não são aulas atribuídas.
                {profile?.weeklyHours &&
                  ' O acompanhamento da meta semanal depende do registro de aulas realizadas; ainda não há dados para calcular esse progresso.'}
              </p>
            </div>
            <footer className={styles.panelFooter}>
              <Link to="/disponibilidade">Consultar minha semana</Link>
            </footer>
          </section>
          <section className={styles.panel} aria-labelledby="education-title">
            <header className={styles.panelHeading}>
              <div>
                <h2 id="education-title">Formação e certificações</h2>
                <p>Informações declaradas no cadastro</p>
              </div>
            </header>
            <div className={styles.education}>
              {profile?.education.length ? (
                profile.education.map((item) => (
                  <article key={item.id}>
                    <span>
                      {item.degree} · {item.year}
                    </span>
                    <h3>{item.field}</h3>
                    <p>{item.institution}</p>
                  </article>
                ))
              ) : (
                <p className={styles.muted}>Nenhuma formação disponível para consulta.</p>
              )}
              <p className={styles.note}>
                Comprovantes e certificados ainda não estão disponíveis para consulta.
              </p>
            </div>
          </section>
        </aside>
      </div>
      <details
        id="minhas-solicitacoes"
        className={styles.requests}
        open={adjustments > 0 || undefined}
      >
        <summary>
          <span>Solicitações de acesso aos cursos</span>
          <span>
            {profile?.requests.length ?? 0} {profile?.requests.length === 1 ? 'curso' : 'cursos'}
          </span>
        </summary>
        <p className={styles.requestIntro}>
          A coordenação de cada curso analisa sua solicitação. A aprovação não atribui aulas
          automaticamente.
        </p>
        <div className={styles.courses}>
          {profile?.requests.map((request) => (
            <article key={request.courseId} className={styles.course}>
              <div>
                <h3>{courses.find((item) => item.id === request.courseId)?.name}</h3>
                <span className={styles.badge} data-status={request.status}>
                  {statusLabels[request.status]}
                </span>
              </div>
              <p>{request.subjects.join(' · ')}</p>
              {request.reason && (
                <p className={styles.reason}>
                  <strong>Retorno da coordenação: </strong>
                  {request.reason}
                </p>
              )}
            </article>
          ))}
          {!profile?.requests.length && (
            <p className={styles.muted}>Nenhuma solicitação registrada nesta demonstração.</p>
          )}
        </div>
      </details>
    </section>
  );
}
