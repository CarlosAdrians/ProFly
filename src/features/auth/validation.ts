const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Informe o e-mail.';
  if (!EMAIL_PATTERN.test(email)) return 'Informe um e-mail válido.';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Informe a senha.';
  return undefined;
}
