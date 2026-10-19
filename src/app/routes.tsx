import { Navigate, type RouteObject } from 'react-router';
import { AppLayout } from '../layouts/AppLayout/AppLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { AccountPage } from '../features/account/pages/AccountPage';
import { TeachersPage } from '../features/teachers/pages/TeachersPage';
import { SubjectsPage } from '../features/subjects/pages/SubjectsPage';
import { paths } from './paths';

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to={paths.login} replace /> },
  { path: paths.login, element: <LoginPage /> },
  { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: paths.account, element: <AccountPage /> },
      { path: paths.teachers, element: <TeachersPage /> },
      { path: paths.subjects, element: <SubjectsPage /> },
    ],
  },
  // Rotas fora do escopo (dashboard, calendário, alocações) ou inexistentes.
  { path: '*', element: <Navigate to="/" replace /> },
];
