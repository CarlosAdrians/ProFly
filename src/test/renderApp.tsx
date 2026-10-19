import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/routes';
import { AuthProvider } from '../features/auth/session/AuthProvider';
import { SESSION_KEY } from '../features/auth/session/authContext';
import { demoCoordinator } from '../mocks/coordinator';

interface RenderAppOptions {
  /** Inicia com a sessão simulada do coordenador. */
  authenticated?: boolean;
}

/** Renderiza a aplicação completa (rotas + sessão) em uma rota inicial. */
export function renderApp(path: string, { authenticated = false }: RenderAppOptions = {}) {
  if (authenticated) {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        name: demoCoordinator.name,
        email: demoCoordinator.email,
        startedAt: new Date().toISOString(),
      }),
    );
  }
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, ...result };
}
