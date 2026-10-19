import type { AccountInput } from './types';

export type AccountFormErrors = Partial<Record<keyof AccountInput, string>>;

export function validateAccount(values: AccountInput): AccountFormErrors {
  const name = values.name.trim();
  if (!name) return { name: 'Informe o nome completo.' };
  if (name.length < 3) return { name: 'O nome deve ter pelo menos 3 caracteres.' };
  if (name.length > 100) return { name: 'O nome deve ter no máximo 100 caracteres.' };
  return {};
}
