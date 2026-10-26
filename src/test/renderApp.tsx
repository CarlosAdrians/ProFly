import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/routes';
import { AuthProvider } from '../features/auth/session/AuthProvider';
import { SESSION_KEY } from '../features/auth/session/authContext';
import { demoCoordinator } from '../mocks/coordinator';
import type { Session } from '../features/auth/session/types';

interface RenderAppOptions {
  /** Inicia com a sessão simulada do coordenador. */
  authenticated?: boolean;
}

/** Grava uma sessão no formato atual (com perfil) antes de renderizar. */
export function storeSession(role: Session['role'], email: string, name: string) {
  const session: Session = { name, email, role, startedAt: new Date().toISOString() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Renderiza a aplicação completa (rotas + sessão) em uma rota inicial. */
export function renderApp(path: string, { authenticated = false }: RenderAppOptions = {}) {
  if (authenticated) storeSession('coordinator', demoCoordinator.email, demoCoordinator.name);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, ...result };
}
