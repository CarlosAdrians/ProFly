import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { Card } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Alert } from '../../../components/ui/Alert/Alert';
import { Icon } from '../../../components/ui/Icon/Icon';
import { paths } from '../../../app/paths';
import { useAuth } from '../../auth/session/useAuth';
import { useAccount } from '../hooks/useAccount';
import { AccountDetails } from '../components/AccountDetails';
import { AccountForm } from '../components/AccountForm';
import { AccountPhoto } from '../components/AccountPhoto';
import type { AccountInput } from '../types';
import styles from './AccountPage.module.css';
import { usePhoto } from '../photos';
import { useDemoProfiles } from '../../registration/demoService';
import { weekdays } from '../../registration/catalog';

export function AccountPage() {
  const { session, logout, updateSession } = useAuth();
  const { photo, save: savePhoto } = usePhoto(session?.email ?? '');
  const { profiles, error: profileError } = useDemoProfiles();
  const profile = profiles.find((item) => item.email === session?.email);
  const navigate = useNavigate();
  const { account, save, error: accountError } = useAccount(session);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string>();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);
  function startEditing() {
    setMessage(undefined);
    setEditing(true);
  }
  function stopEditing() {
    returnFocus.current = true;
    setEditing(false);
  }
  async function handleSave(input: AccountInput) {
    const updated = await save(input);
    updateSession({ name: updated.name, email: updated.email });
    setMessage('Dados atualizados com sucesso.');
    stopEditing();
  }
  async function handlePhoto(next?: string) {
    await savePhoto(next);
    setMessage(next ? 'Foto de perfil atualizada.' : 'Foto de perfil removida.');
  }
  function handleLogout() {
    logout();
    navigate(paths.login, { replace: true });
  }
  const role = account?.role ?? (session?.role === 'teacher' ? 'Professor' : 'Coordenador');
  return (
    <section className={styles.page} aria-labelledby="account-title">
      <title>Conta | ProFly</title>
      <PageHeader title="Conta" titleId="account-title" />
      <p className={styles.intro}>
        Gerencie sua identidade, seus dados de contato e seu perfil acadêmico.
      </p>
      {profileError && <Alert variant="error">{profileError}</Alert>}
      {accountError && <Alert variant="error">{accountError}</Alert>}
      <div role="status" className={styles.status}>
        {message && <Alert variant="success">{message}</Alert>}
      </div>
      <div className={styles.layout}>
        <aside className={styles.identity} aria-label="Identidade e acesso">
          <div className={styles.identityMain}>
            <AccountPhoto
              value={photo}
              name={account?.name ?? session?.name ?? ''}
              onChange={handlePhoto}
              disabled={editing || !account}
            />
            <span className={styles.photoHint}>Clique na foto para editar</span>
            <h2>{account?.name ?? session?.name}</h2>
            <span className={styles.role}>
              <Icon name="shield" size={14} />
              {role}
            </span>
          </div>
          <nav className={styles.anchors} aria-label="Seções da conta">
            <a href="#dados-cadastrais">
              <Icon name="user" />
              Dados cadastrais
            </a>
            {profile && (
              <a href="#perfil-academico">
                <Icon name="graduation" />
                Perfil acadêmico
              </a>
            )}
          </nav>
          <div className={styles.session}>
            <p>Seu acesso</p>
            <span>Conectado como {role.toLowerCase()}.</span>
            <Button
              className={styles.signout}
              variant="secondary"
              onClick={handleLogout}
              disabled={editing}
            >
              <Icon name="logout" />
              Sair da conta
            </Button>
          </div>
        </aside>
        <div className={styles.content}>
          <Card
            id="dados-cadastrais"
            className={styles.card}
            data-mode={editing ? 'edit' : 'view'}
            aria-labelledby="account-section-title"
            role="region"
          >
            <header className={styles.cardHeader}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionIcon}>
                  <Icon name="user" size={20} />
                </span>
                <div>
                  <h2 id="account-section-title">
                    {editing ? 'Editar dados cadastrais' : 'Dados cadastrais'}
                  </h2>
                  <p>Informações de identificação e contato.</p>
                </div>
              </div>
              {!editing && account && (
                <Button
                  ref={editButtonRef}
                  className={styles.editButton}
                  variant="secondary"
                  onClick={startEditing}
                >
                  <Icon name="edit" />
                  Editar dados
                </Button>
              )}
            </header>
            <div className={styles.cardBody}>
              {!account ? (
                <p className={styles.loading}>Carregando dados…</p>
              ) : editing ? (
                <AccountForm account={account} onSubmit={handleSave} onCancel={stopEditing} />
              ) : (
                <AccountDetails account={account} />
              )}
            </div>
          </Card>
          {profile && (
            <Card id="perfil-academico" className={styles.card}>
              <header className={styles.cardHeader}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionIcon}>
                    <Icon name="graduation" size={21} />
                  </span>
                  <div>
                    <h2>Meu perfil acadêmico</h2>
                    <p>Informações declaradas no seu cadastro.</p>
                  </div>
                </div>
                <span className={styles.declared}>Declarado</span>
              </header>
              <div className={styles.academicBody}>
                <section className={styles.education} aria-labelledby="account-education-title">
                  <h3 id="account-education-title">
                    <Icon name="graduation" />
                    Formação
                  </h3>
                  {profile.education.map((item) => (
                    <article key={item.id}>
                      <span>
                        {item.degree} · {item.year}
                      </span>
                      <h4>{item.field}</h4>
                      <p>{item.institution}</p>
                    </article>
                  ))}
                  {!profile.education.length && (
                    <p className={styles.empty}>Nenhuma formação informada.</p>
                  )}
                </section>
                <section aria-labelledby="account-knowledge-title">
                  <h3 id="account-knowledge-title">
                    <Icon name="book" />
                    Conhecimentos
                  </h3>
                  <ul className={styles.knowledge}>
                    {profile.knowledge.map((item) => (
                      <li key={item.id}>
                        <span>{item.name}</span>
                        <small>Nível {item.level}</small>
                      </li>
                    ))}
                  </ul>
                  {!profile.knowledge.length && (
                    <p className={styles.empty}>Nenhum conhecimento informado.</p>
                  )}
                </section>
                <section aria-labelledby="account-availability-title">
                  <h3 id="account-availability-title">
                    <Icon name="clock" />
                    Horários pretendidos
                  </h3>
                  <ul className={styles.availability}>
                    {[...profile.availability]
                      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
                      .map((item) => (
                        <li key={item.id}>
                          <span>{weekdays[item.weekday]}</span>
                          <strong>
                            {item.start}–{item.end}
                          </strong>
                        </li>
                      ))}
                  </ul>
                  {!profile.availability.length && (
                    <p className={styles.empty}>Sem horários pretendidos informados.</p>
                  )}
                  <Link className={styles.scheduleLink} to={paths.availability}>
                    Consultar minha semana
                    <Icon name="arrowRight" size={16} />
                  </Link>
                </section>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
