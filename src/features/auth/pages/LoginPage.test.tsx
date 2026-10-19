import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import { demoCoordinator } from '../../../mocks/coordinator';
import { SESSION_KEY } from '../session/authContext';

function setup() {
  const user = userEvent.setup();
  const view = renderApp('/login');
  return {
    user,
    ...view,
    email: () => screen.getByLabelText('E-mail:'),
    password: () => screen.getByLabelText('Senha:'),
    submit: () => user.click(screen.getByRole('button', { name: 'Login' })),
  };
}

describe('LoginPage', () => {
  it('exibe os elementos do protótipo', () => {
    setup();
    expect(screen.getByRole('img', { name: 'UNIFACISA Centro Universitário' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail:')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Senha:')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Esqueceu senha' })).toHaveAttribute(
      'href',
      '/esqueceu-senha',
    );
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('valida campos vazios e foca o primeiro inválido', async () => {
    const { submit, email } = setup();
    await submit();
    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(email()).toHaveFocus();
  });

  it('valida o formato do e-mail e atualiza a mensagem ao digitar', async () => {
    const { user, submit, email } = setup();
    await user.type(email(), 'coordenacao');
    await submit();
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    await user.type(email(), '@profly.test');
    expect(screen.queryByText('Informe um e-mail válido.')).not.toBeInTheDocument();
  });

  it('mostra e oculta a senha', async () => {
    const { user, password } = setup();
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(password()).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(password()).toHaveAttribute('type', 'password');
  });

  it('recusa credenciais inválidas sem criar sessão', async () => {
    const { user, submit, email, password, router } = setup();
    await user.type(email(), demoCoordinator.email);
    await user.type(password(), 'senha-errada');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(router.state.location.pathname).toBe('/login');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('entra com as credenciais de demonstração e vai para /professores', async () => {
    const { user, submit, email, password, router } = setup();
    await user.type(email(), demoCoordinator.email);
    await user.type(password(), demoCoordinator.password);
    await submit();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Professores' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/professores');
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toMatchObject({
      email: demoCoordinator.email,
      name: demoCoordinator.name,
    });
  });

  it('desabilita o botão enquanto entra', async () => {
    const { user, submit, email, password } = setup();
    await user.type(email(), demoCoordinator.email);
    await user.type(password(), demoCoordinator.password);
    await submit();
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  });

  describe('link Cadastrar?', () => {
    const expectedMessage =
      'Olá! Sou professor e gostaria de solicitar meu cadastro no ProFly para ter acesso ao sistema. Como posso prosseguir?';

    function registerLink() {
      return screen.getByRole('link', { name: /^Cadastrar\?/ });
    }

    it('aparece logo abaixo do logo, antes do formulário', () => {
      setup();
      const logo = screen.getByRole('img', { name: 'UNIFACISA Centro Universitário' });
      const link = registerLink();
      const email = screen.getByLabelText('E-mail:');
      expect(logo.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(link.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(link).toHaveTextContent(/^Cadastrar\?/);
    });

    it('tem nome acessível que explica o destino', () => {
      setup();
      expect(registerLink()).toHaveAccessibleName(
        'Cadastrar? (solicitar acesso ao coordenador pelo WhatsApp; abre em nova aba)',
      );
    });

    it('abre o WhatsApp do coordenador com a mensagem pré-preenchida', () => {
      setup();
      const url = new URL(registerLink().getAttribute('href')!);
      expect(url.origin).toBe('https://wa.me');
      expect(url.pathname).toBe('/5583986693221');
      expect(url.searchParams.get('text')).toBe(expectedMessage);
      expect(registerLink().getAttribute('href')).toBe(
        `https://wa.me/5583986693221?text=${encodeURIComponent(expectedMessage)}`,
      );
    });

    it('abre em nova aba com segurança', () => {
      setup();
      expect(registerLink()).toHaveAttribute('target', '_blank');
      expect(registerLink()).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('é alcançável pelo teclado antes dos campos de login', async () => {
      const { user } = setup();
      await user.tab();
      expect(registerLink()).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText('E-mail:')).toHaveFocus();
    });

    it('não altera o login nem o link de recuperação de senha', () => {
      setup();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Esqueceu senha' })).toHaveAttribute(
        'href',
        '/esqueceu-senha',
      );
    });
  });

  it('navega para Esqueceu senha', async () => {
    const { user, router } = setup();
    await user.click(screen.getByRole('link', { name: 'Esqueceu senha' }));
    expect(router.state.location.pathname).toBe('/esqueceu-senha');
  });
});
