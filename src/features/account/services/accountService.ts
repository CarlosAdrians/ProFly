import { demoCoordinator } from '../../../mocks/coordinator';
import { readJson, simulateLatency, writeJson } from '../../../services/storage';
import type { Account, AccountInput } from '../types';

export const ACCOUNT_STORAGE_KEY = 'profly:account';

/** Alterações feitas pelo usuário, associadas ao e-mail de acesso. */
interface StoredAccount {
  email: string;
  name: string;
}

interface SessionIdentity {
  name: string;
  email: string;
}

function readStored(email: string): StoredAccount | null {
  const stored = readJson<StoredAccount>(localStorage, ACCOUNT_STORAGE_KEY);
  const valid =
    stored && stored.email === email && typeof stored.name === 'string' && stored.name.trim();
  return valid ? stored : null;
}

function roleFor(email: string): string | undefined {
  return email === demoCoordinator.email ? demoCoordinator.role : undefined;
}

/**
 * Dados da conta do usuário autenticado: parte da sessão demonstrativa e aplica
 * as alterações salvas no navegador. Substituir por chamadas à API no futuro.
 */
export async function getAccount(session: SessionIdentity): Promise<Account> {
  const stored = readStored(session.email);
  return {
    name: stored?.name ?? session.name,
    email: session.email,
    role: roleFor(session.email),
  };
}

/** Salvamento simulado: grava apenas os campos editáveis no localStorage. */
export async function updateAccount(email: string, input: AccountInput): Promise<Account> {
  await simulateLatency(300);
  writeJson(localStorage, ACCOUNT_STORAGE_KEY, { email, name: input.name });
  return { name: input.name, email, role: roleFor(email) };
}
