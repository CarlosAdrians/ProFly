import type { Account } from '../types';
import styles from './AccountSection.module.css';

/** Modo de visualização dos dados cadastrais. */
export function AccountDetails({ account }: { account: Account }) {
  return (
    <div className={styles.view}>
      <dl className={styles.details}>
        <div className={styles.row}>
          <dt>Nome completo</dt>
          <dd>{account.name}</dd>
        </div>
        <div className={styles.row}>
          <dt>E-mail de acesso</dt>
          <dd>{account.email}</dd>
        </div>
        <div className={styles.row}>
          <dt>Telefone</dt>
          <dd>{account.phone || 'Não informado'}</dd>
        </div>
        <div className={styles.row}>
          <dt>Perfil</dt>
          <dd>{account.role ?? 'Não informado'}</dd>
        </div>
      </dl>
    </div>
  );
}
