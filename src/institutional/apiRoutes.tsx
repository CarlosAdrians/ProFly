import { StatusPage } from '../app/StatusPage';
import { PrivacyPage, PrivacyInformation } from './PrivacyPage';
import { Navigate, type RouteObject } from 'react-router';
import { ForRole } from './RoleGuard';
import {
  ApiForgotPage,
  ApiInvitePage,
  ApiLoginPage,
  ApiRegisterPage,
  ApiResetPage,
  ApiVerifyPage,
} from './AuthPages';
import { ApiGuard, PortalLayout } from './Layout';
import { ApiAccountPage, ApiAvailabilityPage, ApiHomePage, HistoryPage } from './AccountPages';
import { ApiSubjectsPage, ApiTeachersPage } from './AcademicPages';
import { ApiAllocationsPage } from './PlanningPages';
import { ApiCalendarPage } from './CalendarPage';
import { ApiAbsencesPage } from './AbsencesPage';
import { ApiAdminPage } from './AdminPage';
import { LegalPage } from '../features/legal/LegalDocument';
import { RouteErrorPage } from '../app/RouteErrorPage';
export const apiRoutes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Navigate to="/inicio" replace /> },
      { path: '/404', element: <StatusPage state="notFound" /> },
      { path: '/carregando', element: <StatusPage state="loading" /> },
      { path: '/manutencao', element: <StatusPage state="maintenance" /> },
      { path: '/login', element: <ApiLoginPage /> },
      { path: '/cadastro', element: <ApiRegisterPage /> },
      { path: '/esqueceu-senha', element: <ApiForgotPage /> },
      { path: '/verificar-email', element: <ApiVerifyPage /> },
      { path: '/redefinir-senha', element: <ApiResetPage /> },
      { path: '/ativar-acesso', element: <ApiInvitePage /> },
      { path: '/termos', element: <LegalPage kind="terms" /> },
      {
        path: '/privacidade',
        element: (
          <LegalPage kind="privacy">
            <PrivacyInformation />
          </LegalPage>
        ),
      },
      {
        element: <ApiGuard />,
        children: [
          {
            element: <PortalLayout />,
            children: [
              { path: '/inicio', element: <ApiHomePage /> },
              { path: '/conta', element: <ApiAccountPage /> },
              { path: '/conta/privacidade', element: <PrivacyPage /> },
              {
                path: '/administracao/privacidade',
                element: (
                  <ForRole roles={['admin']}>
                    <PrivacyPage admin />
                  </ForRole>
                ),
              },
              {
                path: '/professores',
                element: (
                  <ForRole roles={['coordinator', 'admin']}>
                    <ApiTeachersPage />
                  </ForRole>
                ),
              },
              {
                path: '/disciplinas',
                element: (
                  <ForRole roles={['coordinator', 'admin']}>
                    <ApiSubjectsPage />
                  </ForRole>
                ),
              },
              {
                path: '/horarios',
                element: (
                  <ForRole roles={['teacher']}>
                    <ApiAvailabilityPage />
                  </ForRole>
                ),
              },
              {
                path: '/disponibilidade',
                element: (
                  <ForRole roles={['teacher']}>
                    <ApiAvailabilityPage />
                  </ForRole>
                ),
              },
              { path: '/calendario', element: <ApiCalendarPage /> },
              {
                path: '/alocacoes',
                element: (
                  <ForRole roles={['coordinator', 'admin']}>
                    <ApiAllocationsPage />
                  </ForRole>
                ),
              },
              { path: '/historico', element: <HistoryPage /> },
              { path: '/ausencias', element: <ApiAbsencesPage /> },
              { path: '/administracao', element: <ApiAdminPage /> },
              { path: '/configuracoes', element: <Navigate to="/conta" replace /> },
              { path: '/notificacoes', element: <Navigate to="/inicio" replace /> },
            ],
          },
        ],
      },
      { path: '*', element: <StatusPage state="notFound" /> },
    ],
  },
];
