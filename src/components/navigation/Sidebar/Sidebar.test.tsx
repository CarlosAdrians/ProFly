import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';

function renderAt(path: string) {
  return renderApp(path, { authenticated: true }).router;
}

describe('Sidebar', () => {
  it('inclui calendario e alocacoes no menu da coordenacao', () => {
    renderAt('/professores');
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const labels = within(nav)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(labels).toEqual(['Conta', 'Professores', 'Disciplinas', 'Calendário', 'Alocações']);
  });

  it('marca o item da rota atual', () => {
    renderAt('/disciplinas');
    expect(screen.getByRole('link', { name: 'Disciplinas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Professores' })).not.toHaveAttribute('aria-current');
  });

  it('usa a marca institucional e disponibiliza as novas telas', () => {
    renderAt('/conta');
    expect(screen.queryByText(/Dashboard/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Calendário' })).toHaveAttribute('href', '/calendario');
    expect(screen.getByRole('link', { name: 'Alocações' })).toHaveAttribute('href', '/alocacoes');
    expect(screen.getByRole('img', { name: 'ProFly — UNIFACISA' })).toHaveAttribute(
      'src',
      '/images/unifacisa-symbol.png',
    );
  });

  it('navega entre Conta, Professores e Disciplinas', async () => {
    const user = userEvent.setup();
    const router = renderAt('/conta');
    await user.click(screen.getByRole('link', { name: 'Professores' }));
    expect(router.state.location.pathname).toBe('/professores');
    await user.click(screen.getByRole('link', { name: 'Disciplinas' }));
    expect(router.state.location.pathname).toBe('/disciplinas');
    await user.click(screen.getByRole('link', { name: 'Conta' }));
    expect(router.state.location.pathname).toBe('/conta');
  });

  it('abre e fecha o menu recolhível', async () => {
    const user = userEvent.setup();
    renderAt('/conta');
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
