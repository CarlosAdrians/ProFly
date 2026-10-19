import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import { teachersSeed } from '../../../mocks/teachers';
import { TEACHERS_STORAGE_KEY } from '../services/teacherService';
import type { Teacher } from '../types';

async function setup() {
  const user = userEvent.setup();
  const view = renderApp('/professores', { authenticated: true });
  await screen.findByText('Ana Beatriz Lima');
  return { user, ...view };
}

function bodyRows() {
  const table = screen.getByRole('table', { name: 'Professores cadastrados' });
  return within(table).getAllByRole('row').slice(1);
}

function rowOf(name: string) {
  return screen.getByRole('cell', { name }).closest('tr')!;
}

function stored(): Teacher[] {
  return JSON.parse(localStorage.getItem(TEACHERS_STORAGE_KEY)!);
}

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '+ Novo Professor' }));
  return screen.getByRole('dialog', { name: 'Cadastrar professor' });
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  values: Partial<Record<string, string>>,
) {
  for (const [label, value] of Object.entries(values)) {
    const input = within(dialog).getByLabelText(label);
    await user.clear(input);
    if (value) await user.type(input, value);
  }
}

describe('Professores', () => {
  it('exibe o título visível com o botão + Novo Professor no cabeçalho', async () => {
    await setup();
    const title = screen.getByRole('heading', { level: 1, name: 'Professores' });
    expect(title).not.toHaveClass('visually-hidden');
    const header = title.closest('header')!;
    expect(within(header).getByRole('button', { name: '+ Novo Professor' })).toBeInTheDocument();
  });

  describe('listagem', () => {
    it('exibe as colunas do protótipo e os professores fictícios em ordem alfabética', async () => {
      await setup();
      const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
      expect(headers).toEqual([
        'Foto',
        'Nome',
        'E-mail',
        'Área de Atuação',
        'Carga Horária',
        'Status',
        'Opções',
      ]);
      expect(bodyRows()).toHaveLength(teachersSeed.length);
      const firstRow = within(bodyRows()[0]);
      expect(firstRow.getByText('Ana Beatriz Lima')).toBeInTheDocument();
      expect(firstRow.getByText('ana.lima@profly.test')).toBeInTheDocument();
      expect(firstRow.getByText('Direito Civil')).toBeInTheDocument();
      expect(firstRow.getByText('20 Horas/Semanais')).toBeInTheDocument();
      expect(firstRow.getByText('Ativo')).toBeInTheDocument();
      expect(within(rowOf('Elisa Farias')).getByText('Inativo')).toBeInTheDocument();
    });

    it('guarda os dados fictícios no navegador na primeira visita', async () => {
      await setup();
      expect(stored()).toHaveLength(teachersSeed.length);
    });
  });

  describe('pesquisa por nome', () => {
    it('filtra ignorando acentos e maiúsculas', async () => {
      const { user } = await setup();
      const search = screen.getByRole('searchbox', { name: 'Pesquisar professor por nome' });
      await user.type(search, 'JOAO');
      expect(bodyRows()).toHaveLength(1);
      expect(screen.getByText('João Pedro Santos')).toBeInTheDocument();
      await user.clear(search);
      await user.type(search, 'ri');
      expect(bodyRows().map((row) => within(row).getAllByRole('cell')[1].textContent)).toEqual([
        'Ana Beatriz Lima',
        'Elisa Farias',
        'Gabriela Tavares',
        'Henrique Brito',
      ]);
    });

    it('informa quando nada é encontrado', async () => {
      const { user } = await setup();
      await user.type(screen.getByRole('searchbox'), 'xyz');
      expect(screen.getByText('Nenhum professor encontrado para “xyz”.')).toBeInTheDocument();
    });
  });

  describe('cadastro', () => {
    it('valida campos obrigatórios e foca o primeiro inválido', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await user.click(within(dialog).getByRole('button', { name: 'CADASTRAR' }));
      expect(within(dialog).getByText('Informe o nome completo.')).toBeInTheDocument();
      expect(within(dialog).getByText('Informe o e-mail.')).toBeInTheDocument();
      expect(within(dialog).getByText('Informe o contato.')).toBeInTheDocument();
      expect(within(dialog).getByText('Informe a área de atuação.')).toBeInTheDocument();
      expect(within(dialog).getByText('Informe a carga horária.')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Nome completo:')).toHaveFocus();
    });

    it('valida formatos e e-mail duplicado', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, {
        'Nome completo:': 'Maria Clara',
        'E-mail:': 'ana.lima@profly.test',
        'Contato:': '8399',
        'Área de atuação:': 'Direito Civil',
        'Carga horária (horas semanais):': '0',
      });
      await user.click(within(dialog).getByRole('button', { name: 'CADASTRAR' }));
      expect(
        within(dialog).getByText('Já existe um professor com este e-mail.'),
      ).toBeInTheDocument();
      expect(within(dialog).getByText('Informe um telefone válido com DDD.')).toBeInTheDocument();
      expect(within(dialog).getByText(/entre 1 e 168/)).toBeInTheDocument();
      expect(within(dialog).getByLabelText('E-mail:')).toHaveFocus();
    });

    it('formata o contato e aceita apenas números na carga horária', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, {
        'Contato:': '83900001234',
        'Carga horária (horas semanais):': '2a0',
      });
      expect(within(dialog).getByLabelText('Contato:')).toHaveValue('(83) 90000-1234');
      expect(within(dialog).getByLabelText('Carga horária (horas semanais):')).toHaveValue('20');
    });

    it('cadastra um professor ativo e persiste no navegador', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, {
        'Nome completo:': 'Maria Clara Dantas',
        'E-mail:': 'Maria.Dantas@profly.test',
        'Contato:': '83900001234',
        'Área de atuação:': 'Direito Digital',
        'Carga horária (horas semanais):': '30',
      });
      await user.click(within(dialog).getByRole('button', { name: 'CADASTRAR' }));

      expect(
        await screen.findByText('Professor Maria Clara Dantas cadastrado.'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const row = within(rowOf('Maria Clara Dantas'));
      expect(row.getByText('maria.dantas@profly.test')).toBeInTheDocument();
      expect(row.getByText('30 Horas/Semanais')).toBeInTheDocument();
      expect(row.getByText('Ativo')).toBeInTheDocument();
      expect(stored().find((t) => t.name === 'Maria Clara Dantas')).toMatchObject({
        email: 'maria.dantas@profly.test',
        phone: '83900001234',
        area: 'Direito Digital',
        weeklyHours: 30,
        status: 'active',
      });
    });

    it('fecha sem salvar pelo botão Fechar', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, { 'Nome completo:': 'Rascunho' });
      await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(bodyRows()).toHaveLength(teachersSeed.length);
    });
  });

  describe('edição', () => {
    it('abre o formulário preenchido e salva as alterações', async () => {
      const { user } = await setup();
      await user.click(screen.getByRole('button', { name: 'Opções de Bruno Cavalcanti' }));
      await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
      const dialog = screen.getByRole('dialog', { name: 'Editar professor' });
      expect(within(dialog).getByLabelText('Nome completo:')).toHaveValue('Bruno Cavalcanti');
      expect(within(dialog).getByLabelText('E-mail:')).toHaveValue('bruno.cavalcanti@profly.test');
      expect(within(dialog).getByLabelText('Contato:')).toHaveValue('(83) 90000-0002');
      expect(within(dialog).getByLabelText('Carga horária (horas semanais):')).toHaveValue('40');

      await fill(user, dialog, {
        'Área de atuação:': 'Direito Processual Penal',
        'Carga horária (horas semanais):': '36',
      });
      await user.click(within(dialog).getByRole('button', { name: 'SALVAR' }));

      expect(await screen.findByText('Dados de Bruno Cavalcanti atualizados.')).toBeInTheDocument();
      const row = within(rowOf('Bruno Cavalcanti'));
      expect(row.getByText('Direito Processual Penal')).toBeInTheDocument();
      expect(row.getByText('36 Horas/Semanais')).toBeInTheDocument();
      expect(bodyRows()).toHaveLength(teachersSeed.length);
      expect(stored().find((t) => t.id === 't02')).toMatchObject({
        area: 'Direito Processual Penal',
        weeklyHours: 36,
      });
    });

    it('permite manter o próprio e-mail ao editar', async () => {
      const { user } = await setup();
      await user.click(screen.getByRole('button', { name: 'Opções de Ana Beatriz Lima' }));
      await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
      const dialog = screen.getByRole('dialog', { name: 'Editar professor' });
      await user.click(within(dialog).getByRole('button', { name: 'SALVAR' }));
      expect(await screen.findByText('Dados de Ana Beatriz Lima atualizados.')).toBeInTheDocument();
    });
  });

  describe('ativação e inativação', () => {
    it('inativa e reativa um professor, persistindo o status', async () => {
      const { user } = await setup();
      await user.click(screen.getByRole('button', { name: 'Opções de Camila Nóbrega' }));
      await user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
      expect(await screen.findByText('Camila Nóbrega inativado.')).toBeInTheDocument();
      expect(within(rowOf('Camila Nóbrega')).getByText('Inativo')).toBeInTheDocument();
      expect(stored().find((t) => t.id === 't03')?.status).toBe('inactive');

      await user.click(screen.getByRole('button', { name: 'Opções de Camila Nóbrega' }));
      await user.click(screen.getByRole('menuitem', { name: 'Ativar' }));
      expect(await screen.findByText('Camila Nóbrega ativado.')).toBeInTheDocument();
      expect(within(rowOf('Camila Nóbrega')).getByText('Ativo')).toBeInTheDocument();
      expect(stored().find((t) => t.id === 't03')?.status).toBe('active');
    });
  });

  describe('persistência', () => {
    it('mantém cadastros e alterações ao recarregar a tela', async () => {
      const first = await setup();
      const dialog = await openCreate(first.user);
      await fill(first.user, dialog, {
        'Nome completo:': 'Pedro Henrique Lins',
        'E-mail:': 'pedro.lins@profly.test',
        'Contato:': '8333334444',
        'Área de atuação:': 'Direito Civil',
        'Carga horária (horas semanais):': '10',
      });
      await first.user.click(within(dialog).getByRole('button', { name: 'CADASTRAR' }));
      await screen.findByText('Professor Pedro Henrique Lins cadastrado.');
      await first.user.click(screen.getByRole('button', { name: 'Opções de Diego Albuquerque' }));
      await first.user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
      await screen.findByText('Diego Albuquerque inativado.');
      first.unmount();

      await setup();
      expect(bodyRows()).toHaveLength(teachersSeed.length + 1);
      expect(screen.getByText('Pedro Henrique Lins')).toBeInTheDocument();
      expect(within(rowOf('Diego Albuquerque')).getByText('Inativo')).toBeInTheDocument();
    });

    it('recria os dados fictícios se o armazenamento estiver corrompido', async () => {
      localStorage.setItem(TEACHERS_STORAGE_KEY, '{corrompido');
      await setup();
      expect(bodyRows()).toHaveLength(teachersSeed.length);
    });
  });

  it('exige sessão para acessar a tela', () => {
    const { router } = renderApp('/professores');
    expect(router.state.location.pathname).toBe('/login');
  });
});
