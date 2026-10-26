import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { StatusPage, LoadingPlaceholder } from './StatusPage';
import { apiRoutes } from '../institutional/apiRoutes';

it('endereço inexistente mostra 404 com retorno e conserva o endereço para diagnóstico', async () => {
  const router = createMemoryRouter(apiRoutes, { initialEntries: ['/pagina-inexistente'] });
  render(<RouterProvider router={router} />);
  expect(
    await screen.findByRole('heading', { name: 'Essa página ficou fora da agenda.' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/pagina-inexistente');
  expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/inicio');
  expect(screen.getByRole('img', { name: 'UNIFACISA Centro Universitário' })).toBeInTheDocument();
});

it('carregamento funciona antes do roteador e anuncia espera sem porcentagem fictícia', () => {
  render(<StatusPage state="loading" />);
  expect(screen.getByRole('status')).toHaveTextContent('Abrindo seu próximo capítulo.');
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('carregamento parcial tem anúncio próprio sem substituir o formulário', () => {
  render(
    <>
      <input aria-label="Informação não salva" defaultValue="preservada" />
      <LoadingPlaceholder label="Buscando seus horários…" />
    </>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Buscando seus horários…');
  expect(screen.getByLabelText('Informação não salva')).toHaveValue('preservada');
});
