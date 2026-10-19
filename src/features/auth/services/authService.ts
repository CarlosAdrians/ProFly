import { demoCoordinator } from '../../../mocks/coordinator';
import { simulateLatency } from '../../../services/storage';
import type { Session } from '../session/types';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('E-mail ou senha inválidos.');
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Autenticação simulada: compara com o coordenador fictício.
 * ATENÇÃO: apenas demonstrativa e NÃO segura para produção — a credencial fica no
 * código do navegador e a sessão não é assinada. Substituir pela autenticação do
 * back-end quando ela existir.
 */
export async function authenticate(email: string, password: string): Promise<Session> {
  await simulateLatency();
  const sameEmail = email.trim().toLowerCase() === demoCoordinator.email;
  if (!sameEmail || password !== demoCoordinator.password) {
    throw new InvalidCredentialsError();
  }
  return {
    name: demoCoordinator.name,
    email: demoCoordinator.email,
    startedAt: new Date().toISOString(),
  };
}

/** Recuperação de senha simulada: nenhum e-mail é enviado. */
export async function requestPasswordReset(email: string): Promise<void> {
  void email;
  await simulateLatency();
}
