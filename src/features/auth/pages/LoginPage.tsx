import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout';
import { TextField } from '../../../components/ui/TextField/TextField';
import { PasswordField } from '../../../components/ui/PasswordField/PasswordField';
import { Button } from '../../../components/ui/Button/Button';
import { Alert } from '../../../components/ui/Alert/Alert';
import { paths, postLoginPath } from '../../../app/paths';
import { useAuth } from '../session/useAuth';
import { InvalidCredentialsError } from '../services/authService';
import { validateEmail, validatePassword } from '../validation';
import styles from './AuthForm.module.css';

interface LoginErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): LoginErrors {
  return { email: validateEmail(email), password: validatePassword(password) };
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setSubmitted(true);
    setFormError(undefined);

    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setLoading(true);
    try {
      const session = await login(email, password);
      navigate(session.role === 'teacher' ? paths.teacherHome : postLoginPath, { replace: true });
    } catch (error) {
      setLoading(false);
      setFormError(
        error instanceof InvalidCredentialsError
          ? error.message
          : 'Não foi possível entrar. Tente novamente.',
      );
    }
  }

  return (
    <AuthLayout variant="split">
      <title>Login | ProFly</title>
      <h1 className={`${styles.title} ${styles.loginTitle}`}>Acesso ao ProFly</h1>
      <p className={styles.register}>
        <Link className={styles.link} to={paths.register}>
          Cadastrar
        </Link>
      </p>
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formError && <Alert variant="error">{formError}</Alert>}
        <TextField
          ref={emailRef}
          label="E-mail:"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (submitted)
              setErrors((prev) => ({ ...prev, email: validateEmail(event.target.value) }));
          }}
        />
        <PasswordField
          ref={passwordRef}
          label="Senha:"
          name="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (submitted)
              setErrors((prev) => ({ ...prev, password: validatePassword(event.target.value) }));
          }}
        />
        <div className={styles.actions}>
          <Link className={styles.link} to={paths.forgotPassword}>
            Esqueceu senha
          </Link>
          <Button type="submit" loading={loading} loadingText="Entrando…">
            Login
          </Button>
        </div>
      </form>
      <footer className={styles.legalLinks}>
        <Link to={paths.terms}>Termos de uso</Link>
        <span aria-hidden="true">·</span>
        <Link to={paths.privacy}>Privacidade</Link>
      </footer>
      <p className={styles.demoNotice}>Demonstração local · Use dados fictícios.</p>
    </AuthLayout>
  );
}
