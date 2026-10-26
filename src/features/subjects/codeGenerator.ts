/**
 * Geração automática do código das disciplinas.
 *
 * Formato: prefixo + número com pelo menos 3 dígitos (ex.: DIR502), compatível com os
 * códigos existentes. O número é o maior já usado + 1; números vagos não são reaproveitados.
 * Os dígitos não têm significado institucional definido (ex.: período).
 */
export const SUBJECT_CODE_PREFIX = 'DIR';
const MIN_DIGITS = 3;

/**
 * Calcula o próximo código livre considerando todos os códigos existentes
 * (disciplinas ativas e inativas). Códigos fora do formato são ignorados na
 * contagem, mas nunca são repetidos.
 */
export function nextSubjectCode(existingCodes: string[], prefix = SUBJECT_CODE_PREFIX): string {
  const used = new Set(existingCodes.map((code) => code.trim().toUpperCase()));
  const pattern = new RegExp(`^${prefix}(\\d+)$`);

  let highest = 0;
  for (const code of used) {
    const match = pattern.exec(code);
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  let number = highest + 1;
  let candidate = `${prefix}${String(number).padStart(MIN_DIGITS, '0')}`;
  while (used.has(candidate)) {
    number += 1;
    candidate = `${prefix}${String(number).padStart(MIN_DIGITS, '0')}`;
  }
  return candidate;
}
