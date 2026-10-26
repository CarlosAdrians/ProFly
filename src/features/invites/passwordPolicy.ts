/**
 * Política de senha proposta para o projeto (validação de interface).
 * Deve ser confirmada e aplicada também pelo back-end.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export const passwordPolicyHint = `Use de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres, com pelo menos uma letra e um número.`;

export interface NewPasswordValues {
  password: string;
  confirmation: string;
}

export type NewPasswordErrors = Partial<Record<keyof NewPasswordValues, string>>;

export function validateNewPassword({
  password,
  confirmation,
}: NewPasswordValues): NewPasswordErrors {
  const errors: NewPasswordErrors = {};

  if (!password) errors.password = 'Informe a senha.';
  else if (password.length < PASSWORD_MIN_LENGTH)
    errors.password = `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  else if (password.length > PASSWORD_MAX_LENGTH)
    errors.password = `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  else if (!/\p{L}/u.test(password) || !/\d/.test(password))
    errors.password = 'A senha deve conter pelo menos uma letra e um número.';

  if (!confirmation) errors.confirmation = 'Confirme a senha.';
  else if (password && confirmation !== password) errors.confirmation = 'As senhas não coincidem.';

  return errors;
}
