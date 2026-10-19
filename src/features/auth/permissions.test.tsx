import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, storeSession } from '../../test/renderApp';
import { demoCoordinator } from '../../mocks/coordinator';
import { teachersSeed } from '../../mocks/teachers';
import { SESSION_KEY } from './session/authContext';
import { getOrCreateInvite, completeInvite } from '../invites/services/inviteService';

const ana = teachersSeed.find((teacher) => teacher.id === 't01')!;

async function login(email: string, password: string) {
  const user = userEvent.setup();
  const view = renderApp('/login');
  await user.type(screen.getByLabelText('E-mail:'), email);
  await user.type(screen.getByLabelText('Senha:'), password);
  await user.click(screen.getByRole('button', { name: 'Login' }));
  return { user, ...view };
}

describe('autenticação e perfis', () => {
  describe('coordenador', () => {
    it('continua entrando com as credenciais atuais, com perfil de coordenador', async () => {
      const { router } = await login(demoCoordinator.email, demoCoordinator.password);
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Professores' }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/professores');
      expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toMatchObject({
        email: demoCoordinator.email,
        role: 'coordinator',
      });
    });

    it('mantém a sessão e o perfil após recarregar a página', async () => {
      const first = await login(demoCoordinator.email, demoCoordinator.password);
      await screen.findByRole('heading', { level: 1, name: 'Professores' });
      first.unmount();

      const { router } = renderApp('/disciplinas');
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Disciplinas' }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/disciplinas');
    });
  });

  describe('professor', () => {
    afterEach(() => vi.restoreAllMocks());

    it('não consegue entrar enquanto o serviço de autenticação não estiver integrado', async () => {
      // Mesmo depois de tentar criar a senha pelo convite, nenhuma credencial existe.
      const invite = await getOrCreateInvite(ana);
      await expect(completeInvite(invite.token, 'Direito2026')).rejects.toThrow();

      const { router } = await login(ana.email, 'Direito2026');
      expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
      expect(router.state.location.pathname).toBe('/login');
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('credenciais inválidas também são recusadas', async () => {
      await login(ana.email, 'senha-errada');
      expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });
  });

  describe('separação de permissões', () => {
    it.each(['/professores', '/disciplinas', '/conta'])(
      'sessão de professor não acessa %s (telas da coordenação)',
      async (path) => {
        storeSession('teacher', ana.email, ana.name);
        const { router } = renderApp(path);
        await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
        // Sem laço de redirecionamento: o formulário de login é exibido.
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
        expect(
          screen.queryByRole('navigation', { name: 'Navegação principal' }),
        ).not.toBeInTheDocument();
      },
    );

    it('sessão antiga sem perfil é descartada', async () => {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          name: demoCoordinator.name,
          email: demoCoordinator.email,
          startedAt: new Date().toISOString(),
        }),
      );
      const { router } = renderApp('/professores');
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    });

    it('sessão com perfil desconhecido é descartada', async () => {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          name: 'X',
          email: 'x@profly.test',
          role: 'admin',
          startedAt: new Date().toISOString(),
        }),
      );
      const { router } = renderApp('/professores');
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    });
  });
});
