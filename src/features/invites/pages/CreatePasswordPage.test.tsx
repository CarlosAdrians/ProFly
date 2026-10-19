import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import { teachersSeed } from '../../../mocks/teachers';
import { SESSION_KEY } from '../../auth/session/authContext';
import { teacherService } from '../../teachers/services/teacherService';
import { getOrCreateInvite, INVITES_STORAGE_KEY, lookupInvite } from '../services/inviteService';

const ana = teachersSeed.find((teacher) => teacher.id === 't01')!;
const SECRET = 'Direito2026';

async function openInvite() {
  const invite = await getOrCreateInvite(ana);
  const user = userEvent.setup();
  const view = renderApp(`/convite/${invite.token}`);
  await screen.findByText(/Crie sua senha de acesso/);
  return {
    user,
    token: invite.token,
    ...view,
    password: () => screen.getByLabelText('Senha:'),
    confirmation: () => screen.getByLabelText('Confirmar senha:'),
    submit: () => user.click(screen.getByRole('button', { name: 'Criar senha' })),
  };
}

describe('Criar senha (convite)', () => {
  describe('convite válido', () => {
    it('identifica o professor e mostra o e-mail para conferência', async () => {
      await openInvite();
      expect(
        screen.getByText(`Olá, ${ana.name}! Crie sua senha de acesso ao ProFly.`),
      ).toBeInTheDocument();
      const email = screen.getByLabelText('E-mail:');
      expect(email).toHaveValue(ana.email);
      expect(email).toHaveAttribute('readonly');
      expect(screen.getByLabelText('Senha:')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText('Confirmar senha:')).toHaveAttribute('type', 'password');
      expect(screen.getByText('Ambiente de demonstração')).toBeInTheDocument();
    });

    it('não expõe dados de outros professores nem cria sessão', async () => {
      await openInvite();
      for (const other of teachersSeed.filter((teacher) => teacher.id !== 't01')) {
        expect(screen.queryByText(new RegExp(other.name))).not.toBeInTheDocument();
      }
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('permite mostrar e ocultar a senha e a confirmação', async () => {
      const { user, password, confirmation } = await openInvite();
      const [togglePassword, toggleConfirmation] = screen.getAllByRole('button', {
        name: 'Mostrar senha',
      });
      await user.click(togglePassword);
      expect(password()).toHaveAttribute('type', 'text');
      await user.click(toggleConfirmation);
      expect(confirmation()).toHaveAttribute('type', 'text');
      await user.click(screen.getAllByRole('button', { name: 'Ocultar senha' })[0]);
      expect(password()).toHaveAttribute('type', 'password');
    });
  });

  describe('validação', () => {
    it('exige senha e confirmação, com mensagens acessíveis e foco no primeiro erro', async () => {
      const { submit, password, confirmation } = await openInvite();
      await submit();
      expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
      expect(screen.getByText('Confirme a senha.')).toBeInTheDocument();
      expect(password()).toHaveAttribute('aria-invalid', 'true');
      expect(password()).toHaveAccessibleDescription(expect.stringContaining('Informe a senha.'));
      expect(confirmation()).toHaveAttribute('aria-invalid', 'true');
      expect(password()).toHaveFocus();
    });

    it('aplica a política de senha e mostra a regra como ajuda', async () => {
      const { user, submit, password, confirmation } = await openInvite();
      expect(password()).toHaveAccessibleDescription(
        expect.stringContaining('pelo menos uma letra e um número'),
      );
      await user.type(password(), 'curta1');
      await user.type(confirmation(), 'curta1');
      await submit();
      expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument();
      await user.clear(password());
      await user.type(password(), 'somenteletras');
      expect(
        screen.getByText('A senha deve conter pelo menos uma letra e um número.'),
      ).toBeInTheDocument();
    });

    it('indica confirmação divergente e não conclui', async () => {
      const { user, submit, password, confirmation, token } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), 'Direito2025');
      await submit();
      expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
      expect(confirmation()).toHaveFocus();
      expect(await lookupInvite(token)).toMatchObject({ status: 'valid' });
      await user.clear(confirmation());
      await user.type(confirmation(), SECRET);
      expect(screen.queryByText('As senhas não coincidem.')).not.toBeInTheDocument();
    });
  });

  describe('sucesso', () => {
    it('confirma sem afirmar ativação real, não guarda a senha e leva ao login', async () => {
      const { user, submit, password, confirmation, token, router } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), SECRET);
      await submit();

      const status = await screen.findByRole('status');
      await waitFor(() => expect(status).toHaveTextContent('Senha criada nesta demonstração.'));
      expect(status).toHaveTextContent(/a senha não foi salva/);
      expect(status).toHaveTextContent(/ainda não foi ativado/);
      expect(screen.queryByLabelText('Senha:')).not.toBeInTheDocument();
      const goToLogin = screen.getByRole('button', { name: 'Ir para o login' });
      expect(goToLogin).toHaveFocus();

      // A senha não aparece em nenhum armazenamento nem na URL.
      for (const storage of [localStorage, sessionStorage]) {
        for (let i = 0; i < storage.length; i += 1) {
          expect(storage.getItem(storage.key(i)!)).not.toContain(SECRET);
        }
      }
      expect(router.state.location.pathname).not.toContain(SECRET);
      expect(await lookupInvite(token)).toEqual({ status: 'used' });
      expect(JSON.parse(localStorage.getItem(INVITES_STORAGE_KEY)!)[0].status).toBe('used');

      await user.click(goToLogin);
      expect(router.state.location.pathname).toBe('/login');
    });

    it('não concede acesso: sem sessão, as telas internas continuam bloqueadas', async () => {
      const { user, submit, password, confirmation, router } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), SECRET);
      await submit();
      await screen.findByRole('button', { name: 'Ir para o login' });
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
      await router.navigate('/professores');
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    });

    it('o mesmo link não pode ser usado de novo', async () => {
      const first = await openInvite();
      await first.user.type(first.password(), SECRET);
      await first.user.type(first.confirmation(), SECRET);
      await first.submit();
      await screen.findByRole('button', { name: 'Ir para o login' });
      first.unmount();

      renderApp(`/convite/${first.token}`);
      expect(await screen.findByText(/Este convite já foi utilizado\./)).toBeInTheDocument();
      expect(screen.queryByLabelText('Senha:')).not.toBeInTheDocument();
    });
  });

  describe('convite inválido', () => {
    it.each([
      ['formato inválido', '/convite/abc'],
      ['desconhecido', `/convite/${'f'.repeat(32)}`],
    ])('link %s mostra erro e não permite concluir', async (_, path) => {
      const { router } = renderApp(path);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Não é possível criar a senha.');
      expect(alert).toHaveTextContent(/inválido ou não corresponde a um convite conhecido/);
      expect(screen.queryByLabelText('Senha:')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Criar senha' })).not.toBeInTheDocument();
      await userEvent.setup().click(screen.getByRole('link', { name: 'Ir para o login' }));
      expect(router.state.location.pathname).toBe('/login');
    });

    it('convite de professor inativado deixa de valer', async () => {
      const invite = await getOrCreateInvite(ana);
      await teacherService.update('t01', { status: 'inactive' });
      renderApp(`/convite/${invite.token}`);
      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText(/não está mais disponível/)).toBeInTheDocument();
      expect(screen.queryByText(ana.email)).not.toBeInTheDocument();
    });
  });
});
