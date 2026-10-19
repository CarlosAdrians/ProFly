import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';

function setup() {
  const user = userEvent.setup();
  const view = renderApp('/esqueceu-senha');
  return {
    user,
    ...view,
    email: () => screen.getByLabelText('E-mail:'),
    submit: () => user.click(screen.getByRole('button', { name: 'Enviar' })),
  };
}

describe('ForgotPasswordPage', () => {
  it('exibe os elementos do protótipo', () => {
    setup();
    expect(screen.getByText('Não entre em pânico, estamos aqui para ajudar.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('valida e-mail vazio e inválido', async () => {
    const { user, submit, email } = setup();
    await submit();
    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(email()).toHaveFocus();
    await user.type(email(), 'nao-e-email');
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('mostra o retorno após o envio', async () => {
    const { user, submit, email } = setup();
    await user.type(email(), 'professor@profly.test');
    await submit();
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(
      await screen.findByText(/receberá as instruções para redefinir a senha\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/simula/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('professor@profly.test');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });

  it('volta para o login', async () => {
    const { user, router } = setup();
    await user.click(screen.getByRole('link', { name: 'Voltar ao login' }));
    expect(router.state.location.pathname).toBe('/login');
  });
});
