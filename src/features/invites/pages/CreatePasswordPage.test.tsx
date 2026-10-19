import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import { teachersSeed } from '../../../mocks/teachers';
import { SESSION_KEY } from '../../auth/session/authContext';
import { teacherService } from '../../teachers/services/teacherService';
import { completeInvite, getOrCreateInvite, lookupInvite } from '../services/inviteService';
import { accountActivationGateway } from '../services/accountActivationGateway';

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
      expect(screen.queryByText(/demonstração/i)).not.toBeInTheDocument();
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

  describe('criação de senha sem serviço de autenticação integrado', () => {
    it('não mostra sucesso, informa a falha e mantém o convite pendente', async () => {
      const { user, submit, password, confirmation, token } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), SECRET);
      await submit();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Não foi possível criar a senha no momento.');
      expect(alert).toHaveTextContent('O convite continua válido');
      expect(screen.queryByText('Senha criada com sucesso!')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ir para o login' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Criar senha' })).toBeEnabled();
      expect(await lookupInvite(token)).toMatchObject({ status: 'valid' });
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('após recarregar, o convite continua disponível para nova tentativa', async () => {
      const first = await openInvite();
      await first.user.type(first.password(), SECRET);
      await first.user.type(first.confirmation(), SECRET);
      await first.submit();
      await screen.findByRole('alert');
      first.unmount();

      renderApp(`/convite/${first.token}`);
      expect(await screen.findByText(/Crie sua senha de acesso/)).toBeInTheDocument();
      expect(screen.getByLabelText('Senha:')).toBeInTheDocument();
    });
  });

  describe('falha ao persistir a senha', () => {
    afterEach(() => vi.restoreAllMocks());

    it('erro do serviço de ativação não é tratado como sucesso nem consome o convite', async () => {
      vi.spyOn(accountActivationGateway, 'activateTeacherAccount').mockRejectedValue(
        new Error('falha ao gravar'),
      );
      const { user, submit, password, confirmation, token } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), SECRET);
      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível criar a senha no momento.',
      );
      expect(screen.queryByText('Senha criada com sucesso!')).not.toBeInTheDocument();
      expect(await lookupInvite(token)).toMatchObject({ status: 'valid' });
    });
  });

  describe('sucesso (serviço de ativação concluído)', () => {
    afterEach(() => vi.restoreAllMocks());

    function activationSucceeds() {
      return vi.spyOn(accountActivationGateway, 'activateTeacherAccount').mockResolvedValue();
    }

    it('só confirma depois da ativação, consome o convite e leva ao login', async () => {
      let finishActivation: () => void = () => {};
      const activate = vi
        .spyOn(accountActivationGateway, 'activateTeacherAccount')
        .mockImplementation(() => new Promise<void>((resolve) => (finishActivation = resolve)));
      const { user, submit, password, confirmation, token, router } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), SECRET);
      await submit();

      // Enquanto a ativação não termina: nada de sucesso e convite ainda pendente.
      expect(screen.getByRole('button', { name: 'Criando…' })).toBeDisabled();
      expect(screen.queryByText('Senha criada com sucesso!')).not.toBeInTheDocument();
      expect(await lookupInvite(token)).toMatchObject({ status: 'valid' });
      expect(activate).toHaveBeenCalledWith(
        expect.objectContaining({ token, teacherId: 't01', email: ana.email, password: SECRET }),
      );

      finishActivation();
      const status = await screen.findByRole('status');
      await waitFor(() => expect(status).toHaveTextContent('Senha criada com sucesso!'));
      expect(screen.queryByLabelText('Senha:')).not.toBeInTheDocument();
      const goToLogin = screen.getByRole('button', { name: 'Ir para o login' });
      await waitFor(() => expect(goToLogin).toHaveFocus());
      expect(await lookupInvite(token)).toEqual({ status: 'used' });

      // A senha não aparece em nenhum armazenamento nem na URL.
      for (const storage of [localStorage, sessionStorage]) {
        for (let i = 0; i < storage.length; i += 1) {
          expect(storage.getItem(storage.key(i)!)).not.toContain(SECRET);
        }
      }
      expect(router.state.location.pathname).not.toContain(SECRET);

      await user.click(goToLogin);
      expect(router.state.location.pathname).toBe('/login');
    });

    it('não cria sessão: as telas internas continuam bloqueadas', async () => {
      activationSucceeds();
      const { user, submit, password, confirmation, router } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), SECRET);
      await submit();
      await screen.findByRole('button', { name: 'Ir para o login' });
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
      await router.navigate('/professores');
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    });

    it('o mesmo link não pode ser usado de novo, inclusive após recarregar', async () => {
      activationSucceeds();
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

    it('se o professor for inativado durante o preenchimento, não conclui', async () => {
      const activate = activationSucceeds();
      const { user, submit, password, confirmation } = await openInvite();
      await user.type(password(), SECRET);
      await user.type(confirmation(), SECRET);
      await teacherService.update('t01', { status: 'inactive' });
      await submit();
      expect(await screen.findByText(/não está mais disponível/)).toBeInTheDocument();
      expect(activate).not.toHaveBeenCalled();
      expect(screen.queryByText('Senha criada com sucesso!')).not.toBeInTheDocument();
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

    it.each([
      ['com e-mail divergente', { email: 'outro@profly.test' }],
      ['inativo', { status: 'inactive' as const }],
    ])('convite de professor %s mostra que não está disponível', async (_, changes) => {
      const invite = await getOrCreateInvite(ana);
      await teacherService.update('t01', changes);
      renderApp(`/convite/${invite.token}`);
      expect(await screen.findByRole('alert')).toHaveTextContent(/não está mais disponível/);
      expect(screen.queryByRole('button', { name: 'Criar senha' })).not.toBeInTheDocument();
    });

    it('convite de professor inexistente mostra que não está disponível', async () => {
      await teacherService.list(); // grava os professores fictícios
      const invite = await getOrCreateInvite(ana);
      const remaining = JSON.parse(localStorage.getItem('profly:teachers')!).filter(
        (teacher: { id: string }) => teacher.id !== 't01',
      );
      localStorage.setItem('profly:teachers', JSON.stringify(remaining));
      renderApp(`/convite/${invite.token}`);
      expect(await screen.findByRole('alert')).toHaveTextContent(/não está mais disponível/);
    });

    it('convite já utilizado mostra a mensagem própria', async () => {
      vi.spyOn(accountActivationGateway, 'activateTeacherAccount').mockResolvedValueOnce();
      const invite = await getOrCreateInvite(ana);
      await completeInvite(invite.token, SECRET);
      renderApp(`/convite/${invite.token}`);
      expect(await screen.findByRole('alert')).toHaveTextContent('Este convite já foi utilizado.');
      vi.restoreAllMocks();
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
