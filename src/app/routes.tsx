import { Navigate, type RouteObject } from 'react-router';
import { AppLayout } from '../layouts/AppLayout/AppLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { RedirectIfAuthenticated } from '../features/auth/components/RedirectIfAuthenticated';
import { AccountPage } from '../features/account/pages/AccountPage';
import { TeachersPage } from '../features/teachers/pages/TeachersPage';
import { SubjectsPage } from '../features/subjects/pages/SubjectsPage';
import { CreatePasswordPage } from '../features/invites/pages/CreatePasswordPage';
import { invitePath, paths } from './paths';

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to={paths.login} replace /> },
  {
    path: paths.login,
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
  // Pública: o professor ainda não tem acesso; o link do convite não cria sessão.
  { path: invitePath, element: <CreatePasswordPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: paths.account, element: <AccountPage /> },
      { path: paths.teachers, element: <TeachersPage /> },
      { path: paths.subjects, element: <SubjectsPage /> },
    ],
  },
  // Rotas fora do escopo (dashboard, calendário, alocações) ou inexistentes.
  { path: '*', element: <Navigate to="/" replace /> },
];
