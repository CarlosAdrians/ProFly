import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import { teachersSeed } from '../../../mocks/teachers';
import { TEACHERS_STORAGE_KEY } from '../services/teacherService';

async function setup() {
  const user = userEvent.setup();
  const view = renderApp('/professores', { authenticated: true });
  await screen.findByText('Ana Beatriz Lima');
  return { user, ...view };
}
describe('Professores e solicitacoes', () => {
  it('mantem a listagem e remove o cadastro de outra pessoa da coordenacao', async () => {
    await setup();
    expect(screen.getByRole('heading', { name: 'Professores', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Novo Professor' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      teachersSeed.length + 1,
    );
    expect(screen.getByText(/O professor cria a própria conta pelo login/)).toBeInTheDocument();
  });
  it('pesquisa ignorando acentos e informa ausencia de resultados', async () => {
    const { user } = await setup();
    const search = screen.getByRole('searchbox');
    await user.type(search, 'JOAO');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('João Pedro Santos')).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'xyz');
    expect(screen.getByText('Nenhum professor encontrado para “xyz”.')).toBeInTheDocument();
  });
  it('abre o perfil sem permitir trocar dados declarados ou criar uma conta por convite', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Opções de Ana Beatriz Lima' }));
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Gerar convite' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Ver perfil' }));
    expect(screen.getByRole('dialog', { name: 'Perfil do professor' })).toHaveTextContent(
      'ana.lima@profly.test',
    );
  });
  it('mantem ativacao de vinculo e persistencia dos professores ilustrativos', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Opções de Camila Nóbrega' }));
    await user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
    expect(await screen.findByText('Camila Nóbrega inativado.')).toBeInTheDocument();
    const rows = JSON.parse(localStorage.getItem(TEACHERS_STORAGE_KEY)!);
    expect(rows.find((item: { id: string }) => item.id === 't03').status).toBe('inactive');
  });
  it('troca o contexto de curso sem exibir vinculos de outro curso', async () => {
    const { user } = await setup();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Curso' }), 'sistemas');
    expect(screen.queryByText('Ana Beatriz Lima')).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum vínculo aprovado neste curso/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Solicitações/ }));
    expect(screen.getByText('Nenhuma solicitação pendente')).toBeInTheDocument();
  });
  it('preserva a protecao da rota sem sessao', () => {
    expect(renderApp('/professores').router.state.location.pathname).toBe('/login');
  });
});
