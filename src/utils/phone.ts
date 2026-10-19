/** Mantém apenas os dígitos de um telefone. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Telefone brasileiro com DDD: 10 (fixo) ou 11 (celular) dígitos. */
export function isValidPhone(value: string): boolean {
  const digits = phoneDigits(value);
  return digits.length === 10 || (digits.length === 11 && digits[2] === '9');
}

/** Formata para exibição: (83) 98669-3221 ou (83) 3333-4444. */
export function formatPhone(value: string): string {
  const d = phoneDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  const ddd = `(${d.slice(0, 2)}) `;
  const rest = d.slice(2);
  if (rest.length <= 4) return ddd + rest;
  const split = d.length === 11 ? 5 : 4;
  return `${ddd}${rest.slice(0, split)}-${rest.slice(split)}`;
}
