import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import { demoCoordinator } from '../../../mocks/coordinator';
import { SESSION_KEY } from '../../auth/session/authContext';
import { TEACHERS_STORAGE_KEY } from '../../teachers/services/teacherService';
import { SUBJECTS_STORAGE_KEY } from '../../subjects/services/subjectService';
import { ACCOUNT_STORAGE_KEY } from '../services/accountService';

type User = ReturnType<typeof userEvent.setup>;

async function setup() {
  const user = userEvent.setup();
  const view = renderApp('/conta', { authenticated: true });
  await screen.findByText(demoCoordinator.email);
  return { user, ...view };
}

function section() {
  return screen.getByRole('region', { name: /Dados cadastrais/ });
}

function valueOf(term: string) {
  const dt = within(section()).getByText(term, { selector: 'dt' });
  return dt.nextElementSibling?.textContent;
}

async function startEditing(user: User) {
  await user.click(screen.getByRole('button', { name: 'Editar dados' }));
  return screen.getByRole('region', { name: 'Editar dados cadastrais' });
}

describe('Conta', () => {
  describe('visualizar dados cadastrais', () => {
    it('exibe nome, e-mail de acesso e perfil do usuário autenticado', async () => {
      await setup();
      expect(screen.getByRole('heading', { level: 1, name: 'Conta' })).toBeInTheDocument();
      expect(valueOf('Nome completo')).toBe(demoCoordinator.name);
      expect(valueOf('E-mail de acesso')).toBe(demoCoordinator.email);
      expect(valueOf('Perfil')).toBe('Coordenador');
    });

    it('não exibe senha nem campos de senha', async () => {
      await setup();
      expect(screen.queryByText(/senha/i)).not.toBeInTheDocument();
      expect(document.querySelector('input[type="password"]')).toBeNull();
      expect(screen.queryByText(demoCoordinator.password)).not.toBeInTheDocument();
    });
  });

  describe('editar informações', () => {
    it('entra no modo de edição com o nome editável e os demais campos somente leitura', async () => {
      const { user } = await setup();
      const form = await startEditing(user);
      const name = within(form).getByLabelText('Nome completo:');
      expect(name).toHaveValue(demoCoordinator.name);
      expect(name).not.toHaveAttribute('readonly');
      expect(name).toHaveFocus();
      expect(within(form).getByLabelText('E-mail de acesso:')).toHaveAttribute('readonly');
      expect(within(form).getByLabelText('E-mail de acesso:')).toHaveValue(demoCoordinator.email);
      expect(within(form).getByLabelText('Perfil:')).toHaveAttribute('readonly');
      expect(within(form).getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
      expect(within(form).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Editar dados' })).not.toBeInTheDocument();
    });

    it('salva dados válidos, mostra confirmação e volta ao modo de visualização', async () => {
      const { user } = await setup();
      const form = await startEditing(user);
      const name = within(form).getByLabelText('Nome completo:');
      await user.clear(name);
      await user.type(name, '  Felipe   Araujo Lima ');
      await user.click(within(form).getByRole('button', { name: 'Salvar alterações' }));

      expect(await screen.findByText('Dados atualizados com sucesso.')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Dados atualizados com sucesso.');
      expect(valueOf('Nome completo')).toBe('Felipe Araujo Lima');
      expect(screen.getByRole('button', { name: 'Editar dados' })).toHaveFocus();
    });

    it('cancelar descarta as alterações não salvas', async () => {
      const { user } = await setup();
      const form = await startEditing(user);
      const name = within(form).getByLabelText('Nome completo:');
      await user.clear(name);
      await user.type(name, 'Nome Descartado');
      await user.click(within(form).getByRole('button', { name: 'Cancelar' }));

      expect(valueOf('Nome completo')).toBe(demoCoordinator.name);
      expect(screen.queryByText('Nome Descartado')).not.toBeInTheDocument();
      expect(localStorage.getItem(ACCOUNT_STORAGE_KEY)).toBeNull();
      // Ao editar de novo, o formulário parte dos dados salvos.
      const again = await startEditing(user);
      expect(within(again).getByLabelText('Nome completo:')).toHaveValue(demoCoordinator.name);
    });
  });

  describe('dados inválidos', () => {
    it('indica o erro junto ao campo e não salva', async () => {
      const { user } = await setup();
      const form = await startEditing(user);
      const name = within(form).getByLabelText('Nome completo:');
      await user.clear(name);
      await user.click(within(form).getByRole('button', { name: 'Salvar alterações' }));

      expect(within(form).getByText('Informe o nome completo.')).toBeInTheDocument();
      expect(name).toHaveAttribute('aria-invalid', 'true');
      expect(name).toHaveAccessibleDescription('Informe o nome completo.');
      expect(name).toHaveFocus();
      expect(localStorage.getItem(ACCOUNT_STORAGE_KEY)).toBeNull();
      expect(screen.getByRole('region', { name: 'Editar dados cadastrais' })).toBeInTheDocument();

      await user.type(name, 'Fe');
      expect(within(form).getByText(/pelo menos 3/)).toBeInTheDocument();
      await user.type(name, 'lipe');
      expect(within(form).queryByText(/pelo menos 3/)).not.toBeInTheDocument();
    });
  });

  describe('persistência local', () => {
    it('mantém o nome atualizado ao recarregar a tela', async () => {
      const first = await setup();
      const form = await startEditing(first.user);
      const name = within(form).getByLabelText('Nome completo:');
      await first.user.clear(name);
      await first.user.type(name, 'Felipe A. Araujo');
      await first.user.click(within(form).getByRole('button', { name: 'Salvar alterações' }));
      await screen.findByText('Dados atualizados com sucesso.');
      expect(JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY)!)).toEqual({
        email: demoCoordinator.email,
        name: 'Felipe A. Araujo',
      });
      first.unmount();

      await setup();
      expect(valueOf('Nome completo')).toBe('Felipe A. Araujo');
    });

    it('mantém a sessão consistente com o nome salvo, inclusive após sair e entrar', async () => {
      const { user } = await setup();
      const form = await startEditing(user);
      const name = within(form).getByLabelText('Nome completo:');
      await user.clear(name);
      await user.type(name, 'Felipe Araujo Lima');
      await user.click(within(form).getByRole('button', { name: 'Salvar alterações' }));
      await screen.findByText('Dados atualizados com sucesso.');
      expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!).name).toBe('Felipe Araujo Lima');

      await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
      await user.type(screen.getByLabelText('E-mail:'), demoCoordinator.email);
      await user.type(screen.getByLabelText('Senha:'), demoCoordinator.password);
      await user.click(screen.getByRole('button', { name: 'Login' }));
      await screen.findByRole('heading', { level: 1, name: 'Professores' });
      expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!).name).toBe('Felipe Araujo Lima');

      await user.click(screen.getByRole('link', { name: 'Conta' }));
      await screen.findByText(demoCoordinator.email);
      expect(valueOf('Nome completo')).toBe('Felipe Araujo Lima');
    });

    it('ignora dados salvos corrompidos', async () => {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, '{corrompido');
      await setup();
      expect(valueOf('Nome completo')).toBe(demoCoordinator.name);
    });
  });

  describe('sair da conta', () => {
    it('encerra a sessão, volta ao login e preserva os dados locais', async () => {
      localStorage.setItem(
        ACCOUNT_STORAGE_KEY,
        JSON.stringify({ email: demoCoordinator.email, name: 'Felipe Salvo' }),
      );
      // Gera os dados de professores e disciplinas visitando as telas.
      const { user, router } = await setup();
      await user.click(screen.getByRole('link', { name: 'Professores' }));
      await screen.findByText('Ana Beatriz Lima');
      await user.click(screen.getByRole('link', { name: 'Disciplinas' }));
      await screen.findByText('Direito Civil I');
      await user.click(screen.getByRole('link', { name: 'Conta' }));
      await screen.findByText(demoCoordinator.email);
      const teachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
      const subjects = localStorage.getItem(SUBJECTS_STORAGE_KEY);
      const account = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      expect(teachers && subjects && account).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Sair da conta' }));

      expect(router.state.location.pathname).toBe('/login');
      expect(
        screen.getByRole('heading', { level: 1, name: 'Acesso ao ProFly' }),
      ).toBeInTheDocument();
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(TEACHERS_STORAGE_KEY)).toBe(teachers);
      expect(localStorage.getItem(SUBJECTS_STORAGE_KEY)).toBe(subjects);
      expect(localStorage.getItem(ACCOUNT_STORAGE_KEY)).toBe(account);
    });

    it.each(['/conta', '/professores', '/disciplinas'])(
      'após sair, acessar %s redireciona para o login',
      async (path) => {
        const { user, router } = await setup();
        await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
        await router.navigate(path);
        await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
        expect(
          screen.queryByRole('navigation', { name: 'Navegação principal' }),
        ).not.toBeInTheDocument();
      },
    );

    it('permite entrar novamente após sair', async () => {
      const { user, router } = await setup();
      await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
      await user.type(screen.getByLabelText('E-mail:'), demoCoordinator.email);
      await user.type(screen.getByLabelText('Senha:'), demoCoordinator.password);
      await user.click(screen.getByRole('button', { name: 'Login' }));
      await screen.findByRole('heading', { level: 1, name: 'Professores' });
      expect(router.state.location.pathname).toBe('/professores');
    });
  });
});
