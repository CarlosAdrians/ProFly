import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout';
import { TextField } from '../../../components/ui/TextField/TextField';
import { Button } from '../../../components/ui/Button/Button';
import { Alert } from '../../../components/ui/Alert/Alert';
import { paths } from '../../../app/paths';
import { requestPasswordReset } from '../services/authService';
import { validateEmail } from '../validation';
import styles from './AuthForm.module.css';

export function ForgotPasswordPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSentTo(undefined);

    const nextError = validateEmail(email);
    setError(nextError);
    if (nextError) return emailRef.current?.focus();

    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    setSentTo(email.trim());
  }

  return (
    <AuthLayout variant="backdrop">
      <title>Esqueceu senha | ProFly</title>
      <h1 className="visually-hidden">Recuperar senha</h1>
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <p className={styles.intro}>Não entre em pânico, estamos aqui para ajudar.</p>
        <div>
          <TextField
            ref={emailRef}
            label="E-mail:"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            error={error}
            onChange={(event) => {
              setEmail(event.target.value);
              if (submitted) setError(validateEmail(event.target.value));
            }}
          />
          <div role="status" className={styles.status}>
            {sentTo && (
              <Alert variant="success">
                Se o e-mail {sentTo} estiver cadastrado, você receberá as instruções para redefinir
                a senha. (Simulação: nenhum e-mail foi enviado.)
              </Alert>
            )}
          </div>
        </div>
        <div className={`${styles.actions} ${styles.actionsCentered}`}>
          <Button type="submit" loading={loading} loadingText="Enviando…">
            Enviar
          </Button>
        </div>
        <Link className={`${styles.link} ${styles.backLink}`} to={paths.login}>
          Voltar ao login
        </Link>
      </form>
    </AuthLayout>
  );
}
