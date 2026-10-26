import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from './routes';

it('recupera erros de rota sem expor stack ou apagar dados', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.setItem('preserved-test', 'test-value');
  function BrokenPage(): never {
    throw new Error('private-stack-detail');
  }
  try {
    const router = createMemoryRouter(
      [
        {
          errorElement: routes[0].errorElement,
          children: [{ path: '/broken', element: <BrokenPage /> }],
        },
      ],
      { initialEntries: ['/broken'] },
    );
    render(<RouterProvider router={router} />);
    expect(
      await screen.findByRole('heading', { name: 'Não foi possível abrir esta tela' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    expect(screen.queryByText(/private-stack-detail/)).not.toBeInTheDocument();
    expect(localStorage.getItem('preserved-test')).toBe('test-value');
  } finally {
    log.mockRestore();
  }
});
