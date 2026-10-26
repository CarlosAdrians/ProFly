import { normalizeForSearch } from '../../utils/text';
import type { Subject } from './types';

export interface SubjectFormValues {
  name: string;
}

export type SubjectFormErrors = Partial<Record<keyof SubjectFormValues, string>>;

/** Forma canônica do nome para comparar duplicidade (sem acentos, maiúsculas ou espaços extras). */
export function normalizeSubjectName(value: string): string {
  return normalizeForSearch(value).replace(/\s+/g, ' ');
}

/**
 * Valida o nome informado. Não podem existir duas disciplinas (ativas ou inativas)
 * com o mesmo nome normalizado. O código é gerado pelo sistema e não é validado aqui.
 */
export function validateSubject(
  values: SubjectFormValues,
  others: Pick<Subject, 'name' | 'code'>[],
): SubjectFormErrors {
  const name = values.name.trim();
  if (!name) return { name: 'Informe o nome da disciplina.' };
  if (name.length < 3) return { name: 'O nome deve ter pelo menos 3 caracteres.' };
  if (name.length > 100) return { name: 'O nome deve ter no máximo 100 caracteres.' };

  const normalized = normalizeSubjectName(name);
  const same = others.find((other) => normalizeSubjectName(other.name) === normalized);
  if (same) return { name: `Já existe a disciplina “${same.name}” (código ${same.code}).` };

  return {};
}
