import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/session/useAuth';
import { useDemoProfiles } from './demoService';
import { courses, weekdays } from './catalog';
import { ProfileAvatar } from '../account/components/ProfileAvatar';
import { institutionToday } from '../planning/institutionDate';
import styles from './TeacherHomePage.module.css';
import { Alert } from '../../components/ui/Alert/Alert';
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
  const today = institutionToday();
  const [day, setDay] = useState((new Date(`${today}T12:00:00`).getDay() + 6) % 7);
  const windows =
    profile?.availability
      .filter((item) => item.weekday === day)
      .sort((a, b) => a.start.localeCompare(b.start)) ?? [];
  const approved = profile?.requests.filter((item) => item.status === 'APPROVED').length ?? 0;
  const pending = profile?.requests.filter((item) => item.status === 'PENDING').length ?? 0;
  const adjustments =
    profile?.requests.filter((item) => item.status === 'CHANGES_REQUESTED').length ?? 0;
  return (
    <section className={styles.page}>
      <title>Meu início | ProFly</title>
      {error && <Alert variant="error">{error}</Alert>}
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
          <p>Veja seus horários e acompanhe as respostas da coordenação.</p>
        </div>
        <Link to="/conta" className={styles.profile}>
          Meu perfil<span aria-hidden="true">↗</span>
        </Link>
      </header>
      <div className={styles.overview}>
        <section className={styles.agenda}>
          <div className={styles.agendaTop}>
            <span>Minha agenda</span>
            <span className={styles.agendaBadge}>Aguardando publicação</span>
          </div>
          <div className={styles.agendaBody}>
            <svg className={styles.calendarArt} viewBox="0 0 88 92" fill="none" aria-hidden="true">
              <rect
                x="8"
                y="13"
                width="72"
                height="70"
                rx="14"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M8 34h72M28 5v17M60 5v17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect x="24" y="48" width="12" height="12" rx="4" fill="currentColor" opacity=".8" />
              <rect x="49" y="48" width="12" height="12" rx="4" fill="currentColor" opacity=".3" />
            </svg>
            <div>
              <h2>Suas aulas, em uma só agenda.</h2>
              <p>
                Quando a coordenação publicar sua escala, você acompanha as aulas por dia, semana ou
                mês.
              </p>
            </div>
          </div>
          <Link to="/calendario">
            Abrir meu calendário <span aria-hidden="true">↗</span>
          </Link>
        </section>
        <section className={styles.profileCard} aria-label="Resumo do perfil docente">
          <div className={styles.profileHeading}>
            <ProfileAvatar email={session?.email ?? ''} size={50} />
            <div>
              <h2>Meu perfil acadêmico</h2>
              <span>Informações declaradas</span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Formações</dt>
              <dd>{profile?.education.length ?? 0}</dd>
            </div>
            <div>
              <dt>Conhecimentos</dt>
              <dd>{profile?.knowledge.length ?? 0}</dd>
            </div>
            <div>
              <dt>Cursos aprovados</dt>
              <dd>{approved}</dd>
            </div>
          </dl>
          <Link to="/conta">Conferir meu perfil acadêmico</Link>
        </section>
      </div>
      <div className={styles.mainGrid}>
        <section className={styles.availability} aria-labelledby="availability-summary-title">
          <header>
            <div>
              <h2 id="availability-summary-title">Minha disponibilidade</h2>
              <p>
                {profile?.weeklyHours
                  ? `${profile.weeklyHours} horas semanais pretendidas`
                  : 'Seus horários declarados à coordenação'}
              </p>
            </div>
            <Link to="/disponibilidade">Editar horários</Link>
          </header>
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
          <div className={styles.windows}>
            {windows.length ? (
              windows.map((item) => (
                <div className={styles.window} key={item.id}>
                  <span className={styles.timeIcon} aria-hidden="true">
                    ◷
                  </span>
                  <div>
                    <strong>
                      {item.start} — {item.end}
                    </strong>
                    <span>Disponível para aulas</span>
                  </div>
                  <span className={styles.declared}>Declarado</span>
                </div>
              ))
            ) : (
              <div className={styles.noWindow}>
                <strong>Nenhum horário informado para {weekdays[day].toLowerCase()}.</strong>
                <p>Você pode atualizar sua disponibilidade quando precisar.</p>
                <Link to="/disponibilidade">Organizar minha semana</Link>
              </div>
            )}
          </div>
          <p className={styles.availabilityNote}>
            Disponibilidade não é uma aula marcada. As aulas confirmadas aparecerão no calendário
            após a publicação.
          </p>
        </section>
        <aside className={styles.nextStep}>
          <span className={styles.stepIcon} aria-hidden="true">
            ◎
          </span>
          <h2>
            {adjustments
              ? 'A coordenação pediu ajustes'
              : pending
                ? 'Acompanhe sua entrada nos cursos'
                : approved
                  ? 'Prepare sua próxima semana'
                  : 'Mantenha seu perfil por perto'}
          </h2>
          <p>
            {adjustments
              ? 'Confira os retornos abaixo antes de atualizar suas informações.'
              : pending
                ? `${pending} ${pending === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} análise. A decisão é independente em cada curso.`
                : approved
                  ? 'Confira a disponibilidade e acompanhe a publicação da sua escala.'
                  : 'Formação, conhecimentos e disponibilidade ajudam a coordenação a conhecer sua atuação.'}
          </p>
          <a href="#minhas-solicitacoes">Ver minhas solicitações</a>
          <div className={styles.history}>
            <h3>Histórico de aulas</h3>
            <p>
              As últimas 10 aulas aparecerão após o registro das ocorrências. Nenhuma aula foi
              considerada realizada automaticamente.
            </p>
          </div>
        </aside>
      </div>
      <section id="minhas-solicitacoes" className={styles.requestsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Minhas solicitações</h2>
            <p>Acompanhe a resposta de cada coordenação.</p>
          </div>
          <span>
            {profile?.requests.length ?? 0} {profile?.requests.length === 1 ? 'curso' : 'cursos'}
          </span>
        </div>
        <div className={styles.courses}>
          {profile?.requests.map((request) => (
            <article key={request.courseId} className={styles.course}>
              <div className={styles.courseTop}>
                <span className={styles.courseIcon} aria-hidden="true">
                  ▤
                </span>
                <span className={styles.badge} data-status={request.status}>
                  {statusLabels[request.status]}
                </span>
              </div>
              <h3>{courses.find((item) => item.id === request.courseId)?.name}</h3>
              <div className={styles.subjects}>
                {request.subjects.map((subject) => (
                  <span key={subject}>{subject}</span>
                ))}
              </div>
              {request.reason ? (
                <div className={styles.reason}>
                  <strong>Retorno da coordenação</strong>
                  <p>{request.reason}</p>
                </div>
              ) : (
                <p className={styles.requestNote}>
                  A solicitação foi encaminhada para análise do curso.
                </p>
              )}
            </article>
          ))}
          {!profile?.requests.length && (
            <p className={styles.requestNote}>Nenhuma solicitação registrada nesta demonstração.</p>
          )}
        </div>
      </section>
    </section>
  );
}
