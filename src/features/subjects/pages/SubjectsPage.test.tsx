import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import { subjectsSeed } from '../../../mocks/subjects';
import { SUBJECTS_STORAGE_KEY } from '../services/subjectService';
import type { Subject } from '../types';

type User = ReturnType<typeof userEvent.setup>;

async function setup() {
  const user = userEvent.setup();
  const view = renderApp('/disciplinas', { authenticated: true });
  await screen.findByText('Direito Civil I');
  return { user, ...view };
}

function bodyRows() {
  const table = screen.getByRole('table', { name: 'Disciplinas cadastradas' });
  return within(table).getAllByRole('row').slice(1);
}

function names() {
  return bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent);
}

function rowOf(name: string) {
  return screen.getByRole('cell', { name }).closest('tr')!;
}

function stored(): Subject[] {
  return JSON.parse(localStorage.getItem(SUBJECTS_STORAGE_KEY)!);
}

async function openCreate(user: User) {
  await user.click(screen.getByRole('button', { name: '+ Nova Disciplina' }));
  return screen.getByRole('dialog', { name: 'Cadastrar disciplina' });
}

async function openEdit(user: User, name: string) {
  await user.click(screen.getByRole('button', { name: `Opções de ${name}` }));
  await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
  return screen.getByRole('dialog', { name: 'Editar disciplina' });
}

async function fill(user: User, dialog: HTMLElement, name?: string, code?: string) {
  const nameInput = within(dialog).getByLabelText('Nome da disciplina:');
  const codeInput = within(dialog).getByLabelText('Código:');
  if (name !== undefined) {
    await user.clear(nameInput);
    if (name) await user.type(nameInput, name);
  }
  if (code !== undefined) {
    await user.clear(codeInput);
    if (code) await user.type(codeInput, code);
  }
}

const submit = (user: User, dialog: HTMLElement, label = 'CADASTRAR') =>
  user.click(within(dialog).getByRole('button', { name: label }));

describe('Disciplinas', () => {
  describe('listagem', () => {
    it('exibe as colunas do protótipo e as disciplinas fictícias em ordem alfabética', async () => {
      await setup();
      expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
        'Nome',
        'Código',
        'Status',
        'Opções',
      ]);
      expect(bodyRows()).toHaveLength(subjectsSeed.length);
      expect(names()[0]).toBe('Direito Administrativo');
      const row = within(rowOf('Direito Civil I'));
      expect(row.getByText('DIR201')).toBeInTheDocument();
      expect(row.getByText('Ativo')).toBeInTheDocument();
      expect(within(rowOf('Filosofia do Direito')).getByText('Inativo')).toBeInTheDocument();
    });

    it('guarda os dados fictícios no navegador na primeira visita', async () => {
      await setup();
      expect(stored()).toHaveLength(subjectsSeed.length);
    });
  });

  describe('pesquisa por nome', () => {
    it('filtra ignorando acentos e maiúsculas', async () => {
      const { user } = await setup();
      const search = screen.getByRole('searchbox', { name: 'Pesquisar disciplina por nome' });
      await user.type(search, 'ETICA');
      expect(names()).toEqual(['Ética Profissional']);
      await user.clear(search);
      await user.type(search, 'processual');
      expect(names()).toEqual(['Direito Processual Civil I']);
    });

    it('pesquisa somente pelo nome, não pelo código', async () => {
      const { user } = await setup();
      await user.type(screen.getByRole('searchbox'), 'DIR201');
      expect(screen.getByText('Nenhuma disciplina encontrada para “DIR201”.')).toBeInTheDocument();
    });
  });

  describe('validações', () => {
    it('exige nome e código e foca o primeiro campo inválido', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await submit(user, dialog);
      expect(within(dialog).getByText('Informe o nome da disciplina.')).toBeInTheDocument();
      expect(within(dialog).getByText('Informe o código.')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Nome da disciplina:')).toHaveFocus();
    });

    it('valida o formato do código e atualiza as mensagens ao digitar', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, 'Direito Digital', 'DIR 6');
      await submit(user, dialog);
      expect(within(dialog).getByText(/2 a 20 caracteres/)).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Código:')).toHaveFocus();
      await fill(user, dialog, undefined, 'DIR601');
      expect(within(dialog).queryByText(/2 a 20 caracteres/)).not.toBeInTheDocument();
    });

    it('converte o código para maiúsculas enquanto digita', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, undefined, 'dir601');
      expect(within(dialog).getByLabelText('Código:')).toHaveValue('DIR601');
    });
  });

  describe('duplicidade', () => {
    it('recusa código já usado, inclusive por disciplina inativa', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, 'Direito Digital', 'dir103');
      await submit(user, dialog);
      expect(
        within(dialog).getByText('O código DIR103 já pertence a “Filosofia do Direito”.'),
      ).toBeInTheDocument();
      expect(bodyRows()).toHaveLength(subjectsSeed.length);
    });

    it('recusa nome repetido sem diferenciar acentos, maiúsculas e espaços', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, 'direito  tributario', 'DIR999');
      await submit(user, dialog);
      expect(
        within(dialog).getByText('Já existe a disciplina “Direito Tributário” (código DIR401).'),
      ).toBeInTheDocument();
    });

    it('na edição, recusa o código de outra disciplina mas aceita o próprio', async () => {
      const { user } = await setup();
      const dialog = await openEdit(user, 'Direito Penal I');
      await fill(user, dialog, undefined, 'DIR201');
      await submit(user, dialog, 'SALVAR');
      expect(within(dialog).getByText(/já pertence a “Direito Civil I”/)).toBeInTheDocument();
      await fill(user, dialog, undefined, 'DIR202');
      await submit(user, dialog, 'SALVAR');
      expect(await screen.findByText('Dados de Direito Penal I atualizados.')).toBeInTheDocument();
    });
  });

  describe('cadastro', () => {
    it('cadastra uma disciplina ativa com código normalizado e persiste', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fill(user, dialog, '  Direito   Digital ', 'dir-601');
      await submit(user, dialog);
      expect(await screen.findByText('Disciplina Direito Digital cadastrada.')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const row = within(rowOf('Direito Digital'));
      expect(row.getByText('DIR-601')).toBeInTheDocument();
      expect(row.getByText('Ativo')).toBeInTheDocument();
      expect(stored().find((s) => s.code === 'DIR-601')).toMatchObject({
        name: 'Direito Digital',
        status: 'active',
      });
    });
  });

  describe('edição', () => {
    it('abre preenchido e salva nome e código', async () => {
      const { user } = await setup();
      const dialog = await openEdit(user, 'Direito Empresarial');
      expect(within(dialog).getByLabelText('Nome da disciplina:')).toHaveValue(
        'Direito Empresarial',
      );
      expect(within(dialog).getByLabelText('Código:')).toHaveValue('DIR303');
      await fill(user, dialog, 'Direito Empresarial I', 'DIR304');
      await submit(user, dialog, 'SALVAR');
      expect(
        await screen.findByText('Dados de Direito Empresarial I atualizados.'),
      ).toBeInTheDocument();
      expect(within(rowOf('Direito Empresarial I')).getByText('DIR304')).toBeInTheDocument();
      expect(screen.queryByText('Direito Empresarial')).not.toBeInTheDocument();
      expect(bodyRows()).toHaveLength(subjectsSeed.length);
      expect(stored().find((s) => s.id === 's09')).toMatchObject({
        name: 'Direito Empresarial I',
        code: 'DIR304',
      });
    });
  });

  describe('ativação e inativação', () => {
    it('inativa e reativa, persistindo o status', async () => {
      const { user } = await setup();
      await user.click(screen.getByRole('button', { name: 'Opções de Direito Penal I' }));
      await user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
      expect(await screen.findByText('Direito Penal I inativada.')).toBeInTheDocument();
      expect(within(rowOf('Direito Penal I')).getByText('Inativo')).toBeInTheDocument();
      expect(stored().find((s) => s.id === 's05')?.status).toBe('inactive');

      await user.click(screen.getByRole('button', { name: 'Opções de Direito Penal I' }));
      await user.click(screen.getByRole('menuitem', { name: 'Ativar' }));
      expect(await screen.findByText('Direito Penal I ativada.')).toBeInTheDocument();
      expect(stored().find((s) => s.id === 's05')?.status).toBe('active');
    });
  });

  describe('persistência', () => {
    it('mantém cadastros, edições e status ao recarregar a tela', async () => {
      const first = await setup();
      const dialog = await openCreate(first.user);
      await fill(first.user, dialog, 'Direito Ambiental', 'DIR602');
      await submit(first.user, dialog);
      await screen.findByText('Disciplina Direito Ambiental cadastrada.');
      await first.user.click(
        screen.getByRole('button', { name: 'Opções de Teoria Geral do Estado' }),
      );
      await first.user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
      await screen.findByText('Teoria Geral do Estado inativada.');
      first.unmount();

      await setup();
      expect(bodyRows()).toHaveLength(subjectsSeed.length + 1);
      expect(within(rowOf('Direito Ambiental')).getByText('DIR602')).toBeInTheDocument();
      expect(within(rowOf('Teoria Geral do Estado')).getByText('Inativo')).toBeInTheDocument();
    });

    it('recria os dados fictícios se o armazenamento estiver corrompido', async () => {
      localStorage.setItem(SUBJECTS_STORAGE_KEY, 'não é json');
      await setup();
      expect(bodyRows()).toHaveLength(subjectsSeed.length);
    });
  });

  it('exige sessão para acessar a tela', () => {
    const { router } = renderApp('/disciplinas');
    expect(router.state.location.pathname).toBe('/login');
  });
});
