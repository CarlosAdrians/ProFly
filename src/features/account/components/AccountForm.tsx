import { useState, type FormEvent } from 'react';
import { TextField } from '../../../components/ui/TextField/TextField';
import { Alert } from '../../../components/ui/Alert/Alert';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import type { Account, AccountInput } from '../types';
import { validateAccount, type AccountFormErrors } from '../validation';
import styles from './AccountSection.module.css';

interface AccountFormProps {
  account: Account;
  onSubmit: (input: AccountInput) => Promise<void>;
  onCancel: () => void;
}

/** Contact details are editable; authorization roles remain assigned by the system. */
export function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [phone, setPhone] = useState(account.phone ?? '');
  const [failure, setFailure] = useState('');
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    setFailure('');
    const nextErrors = validateAccount({ name, email, phone });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const input = event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0]);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim().replace(/\s+/g, ' '), email, phone });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      {failure && <Alert variant="error">{failure}</Alert>}
      <fieldset className={styles.formFields} disabled={saving}>
        <div className={styles.fullWidth}>
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
              if (submitted) setErrors(validateAccount({ name: event.target.value, email, phone }));
            }}
          />
        </div>
        <TextField
          label="E-mail de acesso:"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
          hint="Use este e-mail para entrar na sua conta."
        />
        <TextField
          label="Telefone:"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          error={errors.phone}
          onChange={(event) => setPhone(event.target.value)}
          hint="Opcional. Informe DDD e número."
        />
        <TextField
          label="Perfil:"
          className={styles.fullWidth}
          readOnly
          aria-readonly="true"
          value={account.role ?? 'Não informado'}
          hint="Definido pelo sistema e não pode ser alterado pelo usuário."
        />
      </fieldset>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          <Icon name="close" />
          Cancelar
        </Button>
        <Button type="submit" loading={saving} loadingText="Salvando…">
          <Icon name="save" />
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
