import { normalizeForSearch } from '../../utils/text';
import type { Subject } from './types';

export interface SubjectFormValues {
  name: string;
  code: string;
}

export type SubjectFormErrors = Partial<Record<keyof SubjectFormValues, string>>;

/** Código: 2 a 20 caracteres, letras sem acento, números, ponto ou hífen. */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9.-]{1,19}$/;

/** Forma canônica do código: sem espaços nas pontas e em maiúsculas. */
export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

/** Forma canônica do nome para comparar duplicidade (sem acentos, maiúsculas ou espaços extras). */
export function normalizeSubjectName(value: string): string {
  return normalizeForSearch(value).replace(/\s+/g, ' ');
}

/**
 * Regra de duplicidade: não podem existir duas disciplinas (ativas ou inativas)
 * com o mesmo código ou com o mesmo nome normalizado.
 */
export function validateSubject(
  values: SubjectFormValues,
  others: Pick<Subject, 'name' | 'code'>[],
): SubjectFormErrors {
  const errors: SubjectFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Informe o nome da disciplina.';
  else if (name.length < 3) errors.name = 'O nome deve ter pelo menos 3 caracteres.';
  else if (name.length > 100) errors.name = 'O nome deve ter no máximo 100 caracteres.';
  else {
    const normalized = normalizeSubjectName(name);
    const same = others.find((other) => normalizeSubjectName(other.name) === normalized);
    if (same) errors.name = `Já existe a disciplina “${same.name}” (código ${same.code}).`;
  }

  const code = normalizeCode(values.code);
  if (!code) errors.code = 'Informe o código.';
  else if (!CODE_PATTERN.test(code))
    errors.code = 'Use de 2 a 20 caracteres: letras, números, ponto ou hífen.';
  else {
    const same = others.find((other) => normalizeCode(other.code) === code);
    if (same) errors.code = `O código ${code} já pertence a “${same.name}”.`;
  }

  return errors;
}
