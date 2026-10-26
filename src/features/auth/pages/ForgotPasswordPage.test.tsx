import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../test/renderApp';
import * as authService from '../services/authService';
import { vi } from 'vitest';

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
    expect(screen.getByRole('heading', { name: 'Recuperar senha', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
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
    expect(await screen.findByText(/Nenhuma mensagem foi enviada/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/ainda não está disponível/);
    expect(screen.getByLabelText('E-mail:')).toHaveValue('professor@profly.test');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });

  it('volta para o login', async () => {
    const { user, router } = setup();
    await user.click(screen.getByRole('link', { name: 'Voltar ao login' }));
    expect(router.state.location.pathname).toBe('/login');
  });
  it('trata falha do servico, preserva o e-mail e permite tentar novamente', async () => {
    const failure = vi
      .spyOn(authService, 'requestPasswordReset')
      .mockRejectedValueOnce(new Error('offline'));
    const { user, email, submit } = setup();
    await user.type(email(), 'professor@profly.test');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível solicitar');
    expect(email()).toHaveValue('professor@profly.test');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    failure.mockRestore();
  });
});
