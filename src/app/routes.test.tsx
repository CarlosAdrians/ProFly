import { screen } from '@testing-library/react';
import { renderApp } from '../test/renderApp';

describe('rotas', () => {
  it.each([
    ['/conta', 'Conta'],
    ['/professores', 'Professores'],
    ['/disciplinas', 'Disciplinas'],
  ])('%s exibe a tela %s com sessão', (path, title) => {
    renderApp(path, { authenticated: true });
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it.each(['/conta', '/professores', '/disciplinas'])(
    '%s sem sessão redireciona para o login',
    (path) => {
      const { router } = renderApp(path);
      expect(router.state.location.pathname).toBe('/login');
      expect(
        screen.getByRole('heading', { level: 1, name: 'Acesso ao ProFly' }),
      ).toBeInTheDocument();
    },
  );

  it('exibe Esqueceu senha sem sessão', () => {
    renderApp('/esqueceu-senha');
    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar senha' })).toBeInTheDocument();
  });

  it('redireciona o login para /professores quando já existe sessão', () => {
    const { router } = renderApp('/login', { authenticated: true });
    expect(router.state.location.pathname).toBe('/professores');
  });

  it('redireciona a raiz para o login', () => {
    const { router } = renderApp('/');
    expect(router.state.location.pathname).toBe('/login');
  });

  it.each(['/dashboard', '/calendario', '/alocacoes', '/rota-inexistente'])(
    'redireciona %s (fora do escopo) para o login',
    (path) => {
      const { router } = renderApp(path);
      expect(router.state.location.pathname).toBe('/login');
    },
  );

  it.each(['/dashboard', '/rota-inexistente'])(
    'redireciona %s para /professores quando há sessão',
    (path) => {
      const { router } = renderApp(path, { authenticated: true });
      expect(router.state.location.pathname).toBe('/professores');
    },
  );
});
