import { Link } from 'react-router';
import { useAuth } from '../auth/session/useAuth';
import { useDemoProfiles } from './demoService';
import { courses } from './catalog';
import { ProfileAvatar } from '../account/components/ProfileAvatar';
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
  return (
    <section className={styles.page}>
      <title>Meu início | ProFly</title>
      {error && <Alert variant="error">{error}</Alert>}
      <header className={styles.header}>
        <div>
          <h1>Olá, {session?.name.split(' ')[0]}.</h1>
          <p>Acompanhe suas solicitações e prepare seu próximo semestre.</p>
        </div>
        <Link to="/conta" className={styles.profile}>
          <ProfileAvatar email={session?.email ?? ''} size={48} />
          <span>Meu perfil</span>
        </Link>
      </header>
      <div className={styles.notice}>
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Sua conta está pronta.</strong>
          <p>
            A participação nos cursos depende da análise de cada coordenação. Seus dados acadêmicos
            continuam declarados até a confirmação.
          </p>
        </div>
      </div>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Minhas solicitações</h2>
          <span>{profile?.requests.length ?? 0} curso(s)</span>
        </div>
        <div className={styles.courses}>
          {profile?.requests.map((request) => (
            <article key={request.courseId} className={styles.course}>
              <span className={styles.badge} data-status={request.status}>
                {statusLabels[request.status]}
              </span>
              <h3>{courses.find((item) => item.id === request.courseId)?.name}</h3>
              <p>{request.subjects.join(' · ')}</p>
              {request.reason && (
                <div className={styles.reason}>
                  <strong>Retorno da coordenação</strong>
                  <p>{request.reason}</p>
                </div>
              )}
            </article>
          ))}
          {!profile?.requests.length && <p>Nenhuma solicitação registrada nesta demonstração.</p>}
        </div>
      </section>
      <div className={styles.lower}>
        <section className={styles.empty}>
          <h2>Minha semana</h2>
          <img src="/images/icons/calendario.png" alt="" />
          <h3>Suas aulas aparecerão aqui</h3>
          <p>
            Você ainda não tem uma escala publicada. A aprovação no curso não atribui aulas
            automaticamente.
          </p>
          <Link to="/calendario">Abrir meu calendário</Link>
        </section>
        <section className={styles.empty}>
          <h2>Histórico de aulas</h2>
          <img src="/images/icons/disciplinas.png" alt="" />
          <h3>Ainda não há aulas no histórico</h3>
          <p>
            As últimas 10 aulas aparecerão após o registro das ocorrências. Uma aula agendada não é
            considerada realizada automaticamente.
          </p>
        </section>
      </div>
    </section>
  );
}
