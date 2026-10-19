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

export function AccountPage() {
  const { session, logout, updateSession } = useAuth();
  const navigate = useNavigate();
  const { account, save } = useAccount(session);
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
    updateSession({ name: updated.name });
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
          {!account ? (
            <p className={styles.loading}>Carregando dados…</p>
          ) : editing ? (
            <AccountForm account={account} onSubmit={handleSave} onCancel={stopEditing} />
          ) : (
            <AccountDetails account={account} />
          )}
        </Card>
      </section>
    </>
  );
}
