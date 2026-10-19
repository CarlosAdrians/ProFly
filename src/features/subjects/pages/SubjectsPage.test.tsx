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

async function fillName(user: User, dialog: HTMLElement, name: string) {
  const input = within(dialog).getByLabelText('Nome da disciplina:');
  await user.clear(input);
  if (name) await user.type(input, name);
}

const submit = (user: User, dialog: HTMLElement, label = 'CADASTRAR') =>
  user.click(within(dialog).getByRole('button', { name: label }));

async function createSubject(user: User, name: string) {
  const dialog = await openCreate(user);
  await fillName(user, dialog, name);
  await submit(user, dialog);
  return screen.findByText(new RegExp(`Disciplina ${name} cadastrada com o código`));
}

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

  describe('formulário', () => {
    it('no cadastro, só o nome é editável e o código aparece somente para leitura', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      expect(within(dialog).getByLabelText('Nome da disciplina:')).not.toHaveAttribute('readonly');
      const code = within(dialog).getByLabelText('Código:');
      expect(code).toHaveAttribute('readonly');
      expect(code).toHaveAttribute('aria-readonly', 'true');
      expect(code).toHaveValue('');
      expect(code).toHaveAttribute('placeholder', 'Gerado automaticamente ao salvar');
      expect(code).toHaveAccessibleDescription(
        'O código é definido pelo sistema e não pode ser alterado.',
      );
      await user.type(code, 'DIR999');
      expect(code).toHaveValue('');
    });

    it('exige o nome e foca o campo', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await submit(user, dialog);
      expect(within(dialog).getByText('Informe o nome da disciplina.')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Nome da disciplina:')).toHaveFocus();
      expect(within(dialog).queryByText('Informe o código.')).not.toBeInTheDocument();
    });

    it('valida o tamanho mínimo e atualiza a mensagem ao digitar', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fillName(user, dialog, 'Ab');
      await submit(user, dialog);
      expect(within(dialog).getByText(/pelo menos 3/)).toBeInTheDocument();
      await user.type(within(dialog).getByLabelText('Nome da disciplina:'), 'c');
      expect(within(dialog).queryByText(/pelo menos 3/)).not.toBeInTheDocument();
    });
  });

  describe('geração automática do código', () => {
    it('gera DIR502 (maior código existente + 1) e informa o código definitivo', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fillName(user, dialog, '  Direito   Digital ');
      await submit(user, dialog);
      expect(
        await screen.findByText('Disciplina Direito Digital cadastrada com o código DIR502.'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const row = within(rowOf('Direito Digital'));
      expect(row.getByText('DIR502')).toBeInTheDocument();
      expect(row.getByText('Ativo')).toBeInTheDocument();
      expect(stored().find((s) => s.code === 'DIR502')).toMatchObject({
        name: 'Direito Digital',
        status: 'active',
      });
    });

    it('gera códigos sequenciais em cadastros seguidos', async () => {
      const { user } = await setup();
      await createSubject(user, 'Direito Digital');
      await createSubject(user, 'Direito Ambiental');
      expect(within(rowOf('Direito Digital')).getByText('DIR502')).toBeInTheDocument();
      expect(within(rowOf('Direito Ambiental')).getByText('DIR503')).toBeInTheDocument();
    });

    it('considera disciplinas inativas e não reaproveita números vagos', async () => {
      // Maior código pertence a uma disciplina inativa; há números vagos (DIR104, DIR204...).
      localStorage.setItem(
        SUBJECTS_STORAGE_KEY,
        JSON.stringify([
          { id: 'a', name: 'Direito Civil I', code: 'DIR201', status: 'active' },
          { id: 'b', name: 'Direito Romano', code: 'DIR710', status: 'inactive' },
        ]),
      );
      const { user } = await setup();
      await createSubject(user, 'Direito Digital');
      expect(within(rowOf('Direito Digital')).getByText('DIR711')).toBeInTheDocument();
    });

    it('preserva códigos fora do padrão e não os repete', async () => {
      localStorage.setItem(
        SUBJECTS_STORAGE_KEY,
        JSON.stringify([
          ...subjectsSeed,
          { id: 'x', name: 'Direito Digital', code: 'DIR-601', status: 'active' },
        ]),
      );
      const { user } = await setup();
      await createSubject(user, 'Direito Ambiental');
      expect(within(rowOf('Direito Ambiental')).getByText('DIR502')).toBeInTheDocument();
      expect(within(rowOf('Direito Digital')).getByText('DIR-601')).toBeInTheDocument();
    });

    it('não altera os códigos dos 12 registros fictícios', async () => {
      const { user } = await setup();
      await createSubject(user, 'Direito Digital');
      const seedCodes = Object.fromEntries(subjectsSeed.map((s) => [s.id, s.code]));
      for (const subject of stored().filter((s) => s.id in seedCodes)) {
        expect(subject.code).toBe(seedCodes[subject.id]);
      }
    });
  });

  describe('duplicidade', () => {
    it('recusa nome repetido sem diferenciar acentos, maiúsculas e espaços, inclusive de inativa', async () => {
      const { user } = await setup();
      const dialog = await openCreate(user);
      await fillName(user, dialog, 'etica  PROFISSIONAL');
      await submit(user, dialog);
      expect(
        within(dialog).getByText('Já existe a disciplina “Ética Profissional” (código DIR501).'),
      ).toBeInTheDocument();
      expect(bodyRows()).toHaveLength(subjectsSeed.length);
    });

    it('na edição, recusa o nome de outra disciplina mas aceita o próprio', async () => {
      const { user } = await setup();
      const dialog = await openEdit(user, 'Direito Penal I');
      await fillName(user, dialog, 'Direito Civil I');
      await submit(user, dialog, 'SALVAR');
      expect(
        within(dialog).getByText(/Já existe a disciplina “Direito Civil I”/),
      ).toBeInTheDocument();
      await fillName(user, dialog, 'Direito Penal I');
      await submit(user, dialog, 'SALVAR');
      expect(await screen.findByText('Dados de Direito Penal I atualizados.')).toBeInTheDocument();
    });
  });

  describe('edição', () => {
    it('mostra o código atual somente para leitura e o preserva ao mudar o nome', async () => {
      const { user } = await setup();
      const dialog = await openEdit(user, 'Direito Empresarial');
      expect(within(dialog).getByLabelText('Nome da disciplina:')).toHaveValue(
        'Direito Empresarial',
      );
      const code = within(dialog).getByLabelText('Código:');
      expect(code).toHaveValue('DIR303');
      expect(code).toHaveAttribute('readonly');
      await user.type(code, '9');
      expect(code).toHaveValue('DIR303');

      await fillName(user, dialog, 'Direito Empresarial I');
      await submit(user, dialog, 'SALVAR');
      expect(
        await screen.findByText('Dados de Direito Empresarial I atualizados.'),
      ).toBeInTheDocument();
      expect(within(rowOf('Direito Empresarial I')).getByText('DIR303')).toBeInTheDocument();
      expect(screen.queryByText('Direito Empresarial')).not.toBeInTheDocument();
      expect(bodyRows()).toHaveLength(subjectsSeed.length);
      expect(stored().find((s) => s.id === 's09')).toEqual({
        id: 's09',
        name: 'Direito Empresarial I',
        code: 'DIR303',
        status: 'active',
      });
    });
  });

  describe('ativação e inativação', () => {
    it('inativa e reativa, persistindo o status e mantendo o código', async () => {
      const { user } = await setup();
      await user.click(screen.getByRole('button', { name: 'Opções de Direito Penal I' }));
      await user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
      expect(await screen.findByText('Direito Penal I inativada.')).toBeInTheDocument();
      expect(within(rowOf('Direito Penal I')).getByText('Inativo')).toBeInTheDocument();
      expect(stored().find((s) => s.id === 's05')).toMatchObject({
        status: 'inactive',
        code: 'DIR202',
      });

      await user.click(screen.getByRole('button', { name: 'Opções de Direito Penal I' }));
      await user.click(screen.getByRole('menuitem', { name: 'Ativar' }));
      expect(await screen.findByText('Direito Penal I ativada.')).toBeInTheDocument();
      expect(stored().find((s) => s.id === 's05')?.status).toBe('active');
    });
  });

  describe('persistência', () => {
    it('mantém cadastros, códigos gerados e status ao recarregar e continua a sequência', async () => {
      const first = await setup();
      await createSubject(first.user, 'Direito Ambiental');
      await first.user.click(
        screen.getByRole('button', { name: 'Opções de Teoria Geral do Estado' }),
      );
      await first.user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
      await screen.findByText('Teoria Geral do Estado inativada.');
      first.unmount();

      const second = await setup();
      expect(bodyRows()).toHaveLength(subjectsSeed.length + 1);
      expect(within(rowOf('Direito Ambiental')).getByText('DIR502')).toBeInTheDocument();
      expect(within(rowOf('Teoria Geral do Estado')).getByText('Inativo')).toBeInTheDocument();

      await createSubject(second.user, 'Direito Digital');
      expect(within(rowOf('Direito Digital')).getByText('DIR503')).toBeInTheDocument();
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
