import type { AccountInput } from './types';
import { isValidPhone } from '../../utils/phone';

export type AccountFormErrors = Partial<Record<keyof AccountInput, string>>;

export function validateAccount(values: AccountInput): AccountFormErrors {
  const name = values.name.trim();
  if (!name) return { name: 'Informe o nome completo.' };
  if (name.length < 3) return { name: 'O nome deve ter pelo menos 3 caracteres.' };
  if (name.length > 100) return { name: 'O nome deve ter no máximo 100 caracteres.' };
  const errors: AccountFormErrors = {};
  if (
    values.email !== undefined &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.length > 254)
  )
    errors.email = 'Informe um e-mail válido.';
  if (values.phone && !isValidPhone(values.phone))
    errors.phone = 'Informe um telefone com DDD, de 10 ou 11 dígitos.';
  return errors;
}
