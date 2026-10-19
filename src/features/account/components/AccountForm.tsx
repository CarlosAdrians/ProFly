import { useState, type FormEvent } from 'react';
import { TextField } from '../../../components/ui/TextField/TextField';
import { Button } from '../../../components/ui/Button/Button';
import type { Account, AccountInput } from '../types';
import { validateAccount, type AccountFormErrors } from '../validation';
import styles from './AccountSection.module.css';

interface AccountFormProps {
  account: Account;
  onSubmit: (input: AccountInput) => Promise<void>;
  onCancel: () => void;
}

/** Modo de edição: só o nome é editável; e-mail de acesso e perfil ficam somente leitura. */
export function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
  const [name, setName] = useState(account.name);
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateAccount({ name });
    setErrors(nextErrors);
    if (nextErrors.name) {
      const input = event.currentTarget.elements.namedItem('name');
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setSaving(true);
    await onSubmit({ name: name.trim().replace(/\s+/g, ' ') });
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <TextField
        label="Nome completo:"
        name="name"
        autoComplete="name"
        required
        maxLength={100}
        autoFocus
        value={name}
        error={errors.name}
        onChange={(event) => {
          setName(event.target.value);
          if (submitted) setErrors(validateAccount({ name: event.target.value }));
        }}
      />
      <TextField
        label="E-mail de acesso:"
        readOnly
        aria-readonly="true"
        value={account.email}
        hint="Usado no login. A alteração depende da integração com o back-end."
      />
      <TextField
        label="Perfil:"
        readOnly
        aria-readonly="true"
        value={account.role ?? 'Não informado'}
        hint="Definido pelo sistema e não pode ser alterado pelo usuário."
      />
      <div className={styles.actions}>
        <Button type="submit" loading={saving} loadingText="Salvando…">
          Salvar alterações
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
