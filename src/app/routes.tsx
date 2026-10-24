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
import { RegisterPage } from '../features/registration/RegisterPage';
import { TeacherHomePage } from '../features/registration/TeacherHomePage';
import { LegalPage } from '../features/legal/LegalDocument';
import { CalendarPage } from '../features/planning/CalendarPage';
import { AllocationsPage } from '../features/planning/AllocationsPage';

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
  {
    path: paths.register,
    element: (
      <RedirectIfAuthenticated>
        <RegisterPage />
      </RedirectIfAuthenticated>
    ),
  },
  { path: paths.terms, element: <LegalPage kind="terms" /> },
  { path: paths.privacy, element: <LegalPage kind="privacy" /> },
  // Pública: o professor ainda não tem acesso; o link do convite não cria sessão.
  { path: invitePath, element: <CreatePasswordPage /> },
  {
    element: (
      <RequireAuth allowedRoles={['coordinator', 'teacher']}>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: paths.account, element: <AccountPage /> },
      { path: paths.calendar, element: <CalendarPage /> },
      {
        path: paths.allocations,
        element: (
          <RequireAuth>
            <AllocationsPage />
          </RequireAuth>
        ),
      },
      {
        path: paths.teacherHome,
        element: (
          <RequireAuth allowedRoles={['teacher']}>
            <TeacherHomePage />
          </RequireAuth>
        ),
      },
      {
        path: paths.teachers,
        element: (
          <RequireAuth>
            <TeachersPage />
          </RequireAuth>
        ),
      },
      {
        path: paths.subjects,
        element: (
          <RequireAuth>
            <SubjectsPage />
          </RequireAuth>
        ),
      },
    ],
  },
  // Rotas inexistentes retornam ao acesso apropriado para a sessao.
  { path: '*', element: <Navigate to="/" replace /> },
];
