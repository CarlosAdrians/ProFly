import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { Card } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Alert } from '../../../components/ui/Alert/Alert';
import { paths } from '../../../app/paths';
import { useAuth } from '../../auth/session/useAuth';
import { useAccount } from '../hooks/useAccount';
import { AccountDetails } from '../components/AccountDetails';
import { AccountForm } from '../components/AccountForm';
import type { AccountInput } from '../types';
import styles from './AccountPage.module.css';
import { PhotoField } from '../../../components/ui/PhotoField/PhotoField';
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

  // Ao sair do modo de edição, o foco volta para "Editar dados".
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
    // Mantém a sessão alinhada ao perfil salvo, para todo o restante da interface.
    updateSession({ name: updated.name, email: updated.email });
    setMessage('Dados atualizados com sucesso.');
    stopEditing();
  }

  function handleLogout() {
    // Encerra apenas a sessão demonstrativa; dados no localStorage são preservados.
    logout();
    navigate(paths.login, { replace: true });
  }

  return (
    <>
      <title>Conta | ProFly</title>
      {profileError && <Alert variant="error">{profileError}</Alert>}
      {accountError && <Alert variant="error">{accountError}</Alert>}
      <section className={styles.page} aria-labelledby="account-title">
        <PageHeader
          title="Conta"
          titleId="account-title"
          actions={
            <Button variant="danger" onClick={handleLogout}>
              Sair da conta
            </Button>
          }
        />
        <div role="status" className={styles.status}>
          {message && <Alert variant="success">{message}</Alert>}
        </div>
        <Card
          className={styles.card}
          data-mode={editing ? 'edit' : 'view'}
          aria-labelledby="account-section-title"
          role="region"
        >
          <div className={styles.cardHeader}>
            <h2 id="account-section-title" className={styles.sectionTitle}>
              {editing ? 'Editar dados cadastrais' : 'Dados cadastrais'}
            </h2>
            {!editing && account && (
              <Button ref={editButtonRef} variant="secondary" onClick={startEditing}>
                Editar dados
              </Button>
            )}
          </div>
          <PhotoField value={photo} onChange={savePhoto} />
          {!account ? (
            <p className={styles.loading}>Carregando dados…</p>
          ) : editing ? (
            <AccountForm account={account} onSubmit={handleSave} onCancel={stopEditing} />
          ) : (
            <AccountDetails account={account} />
          )}
        </Card>
        {profile && (
          <Card className={styles.card}>
            <h2 className={styles.sectionTitle}>Meu perfil acadêmico</h2>
            <p>Informações declaradas no cadastro. A aprovação é independente por curso.</p>
            <h3>Formação</h3>
            {profile.education.map((item) => (
              <p key={item.id}>
                {item.degree} em {item.field} · {item.institution} · {item.year}
              </p>
            ))}
            <h3>Conhecimentos</h3>
            <ul>
              {profile.knowledge.map((item) => (
                <li key={item.id}>
                  {item.name} — nível {item.level}
                </li>
              ))}
            </ul>
            <h3>Disponibilidade</h3>
            <ul>
              {profile.availability.map((item) => (
                <li key={item.id}>
                  {weekdays[item.weekday]} · {item.start}–{item.end}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
