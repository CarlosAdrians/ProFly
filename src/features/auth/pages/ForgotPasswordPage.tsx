import { Link } from 'react-router';
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout';
import { paths } from '../../../app/paths';

// Provisório (etapa 1): o formulário de recuperação simulado entra na etapa 2.
export function ForgotPasswordPage() {
  return (
    <AuthLayout variant="backdrop">
      <title>Esqueceu senha | ProFly</title>
      <h1>Esqueceu senha</h1>
      <p>Tela em construção — prevista para a etapa 2.</p>
      <Link to={paths.login}>Voltar ao login</Link>
    </AuthLayout>
  );
}
