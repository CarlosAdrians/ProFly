import { Link } from 'react-router';
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout';
import { paths, postLoginPath } from '../../../app/paths';

// Provisório (etapa 1): o formulário de login simulado entra na etapa 2.
export function LoginPage() {
  return (
    <AuthLayout variant="split">
      <title>Login | ProFly</title>
      <h1>Login</h1>
      <p>Tela em construção — prevista para a etapa 2.</p>
      <ul>
        <li>
          <Link to={paths.forgotPassword}>Esqueceu senha</Link>
        </li>
        <li>
          <Link to={postLoginPath}>Acessar o sistema (provisório)</Link>
        </li>
      </ul>
    </AuthLayout>
  );
}
