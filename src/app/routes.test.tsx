import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('rotas', () => {
  it.each([
    ['/login', 'Login'],
    ['/esqueceu-senha', 'Esqueceu senha'],
    ['/conta', 'Conta'],
    ['/professores', 'Professores'],
    ['/disciplinas', 'Disciplinas'],
  ])('%s exibe a tela %s', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('redireciona a raiz para o login', () => {
    const router = renderAt('/');
    expect(router.state.location.pathname).toBe('/login');
  });

  it.each(['/dashboard', '/calendario', '/alocacoes', '/rota-inexistente'])(
    'redireciona %s (fora do escopo) para o login',
    (path) => {
      const router = renderAt(path);
      expect(router.state.location.pathname).toBe('/login');
    },
  );

  it('navega entre login e recuperação de senha', async () => {
    const user = userEvent.setup();
    const router = renderAt('/login');
    await user.click(screen.getByRole('link', { name: 'Esqueceu senha' }));
    expect(router.state.location.pathname).toBe('/esqueceu-senha');
    await user.click(screen.getByRole('link', { name: 'Voltar ao login' }));
    expect(router.state.location.pathname).toBe('/login');
  });
});
