import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout';
import { TextField } from '../../../components/ui/TextField/TextField';
import { PasswordField } from '../../../components/ui/PasswordField/PasswordField';
import { Button } from '../../../components/ui/Button/Button';
import { Alert } from '../../../components/ui/Alert/Alert';
import { paths } from '../../../app/paths';
import { completeInvite, InviteUnavailableError, lookupInvite } from '../services/inviteService';
import { passwordPolicyHint, validateNewPassword, type NewPasswordErrors } from '../passwordPolicy';
import type { InviteLookup } from '../types';
import authStyles from '../../auth/pages/AuthForm.module.css';
import styles from './CreatePasswordPage.module.css';

const unavailableMessages: Record<Exclude<InviteLookup['status'], 'valid'>, string> = {
  invalid: 'Este link de convite é inválido ou não corresponde a um convite conhecido.',
  used: 'Este convite já foi utilizado.',
  unavailable: 'Este convite não está mais disponível.',
};

/**
 * Criação de senha pelo professor a partir do link de convite.
 * A conferência do convite é local; a criação da senha depende da porta de ativação
 * (accountActivationGateway). O sucesso só é exibido se a ativação for concluída — sem
 * back-end integrado, ela falha e o convite continua pendente.
 */
export function CreatePasswordPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [lookup, setLookup] = useState<InviteLookup | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    lookupInvite(token).then((result) => {
      if (active) setLookup(result);
    });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (done) loginButtonRef.current?.focus();
  }, [done]);

  function revalidate(next: { password: string; confirmation: string }) {
    if (submitted) setErrors(validateNewPassword(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateNewPassword({ password, confirmation });
    setErrors(nextErrors);
    const firstInvalid = (['password', 'confirmation'] as const).find((field) => nextErrors[field]);
    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(firstInvalid);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setSaving(true);
    setSubmitError(undefined);
    try {
      await completeInvite(token, password);
      // Só chega aqui se a conta foi ativada e o convite consumido.
      setPassword('');
      setConfirmation('');
      setDone(true);
    } catch (error) {
      if (error instanceof InviteUnavailableError) {
        // O convite deixou de valer (ex.: professor inativado) durante o preenchimento.
        setLookup(await lookupInvite(token));
      } else {
        // Ativação não concluída: nada foi gravado e o convite continua pendente.
        setSubmitError(
          'Não foi possível criar a senha no momento. O convite continua válido; tente novamente mais tarde.',
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function renderContent() {
    if (!lookup) return <p className={styles.muted}>Verificando convite…</p>;

    if (lookup.status !== 'valid') {
      return (
        <div className={styles.stack}>
          <Alert variant="error">
            <strong>Não é possível criar a senha.</strong> {unavailableMessages[lookup.status]}{' '}
            Solicite um novo link à coordenação.
          </Alert>
          <Link className={`${authStyles.link} ${authStyles.backLink}`} to={paths.login}>
            Ir para o login
          </Link>
        </div>
      );
    }

    if (done) {
      return (
        <Button
          ref={loginButtonRef}
          className={styles.submit}
          onClick={() => navigate(paths.login)}
        >
          Ir para o login
        </Button>
      );
    }

    return (
      <form className={authStyles.form} noValidate onSubmit={handleSubmit}>
        {submitError && <Alert variant="error">{submitError}</Alert>}
        <p className={authStyles.intro}>
          Olá, {lookup.teacherName}! Crie sua senha de acesso ao ProFly.
        </p>
        <TextField
          label="E-mail:"
          readOnly
          aria-readonly="true"
          autoComplete="username"
          value={lookup.email}
          hint="Confira se este é o seu e-mail."
        />
        <PasswordField
          label="Senha:"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          hint={passwordPolicyHint}
          error={errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            revalidate({ password: event.target.value, confirmation });
          }}
        />
        <PasswordField
          label="Confirmar senha:"
          name="confirmation"
          autoComplete="new-password"
          required
          value={confirmation}
          error={errors.confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            revalidate({ password, confirmation: event.target.value });
          }}
        />
        <Button type="submit" className={styles.submit} loading={saving} loadingText="Criando…">
          Criar senha
        </Button>
      </form>
    );
  }

  return (
    <AuthLayout variant="backdrop">
      <title>Criar senha | ProFly</title>
      <h1 className="visually-hidden">Criar senha</h1>
      <div role="status" className={styles.status}>
        {done && lookup?.status === 'valid' && (
          <Alert variant="success">
            <strong>Senha criada com sucesso!</strong>
          </Alert>
        )}
      </div>
      {renderContent()}
    </AuthLayout>
  );
}
