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
  const [result, setResult] = useState('');
  const [formError, setFormError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setSubmitted(true);
    setResult('');
    setFormError('');

    const nextError = validateEmail(email);
    setError(nextError);
    if (nextError) return emailRef.current?.focus();

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setResult(
        'A recuperação por e-mail ainda não está disponível nesta demonstração. Nenhuma mensagem foi enviada e sua senha permanece igual.',
      );
    } catch {
      setFormError('Não foi possível solicitar a recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="backdrop">
      <title>Esqueceu senha | ProFly</title>
      <h1 className={styles.title}>Recuperar senha</h1>
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formError && <Alert variant="error">{formError}</Alert>}
        <p className={styles.intro}>Informe o e-mail usado na sua conta.</p>
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
            {result && <Alert variant="info">{result}</Alert>}
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
