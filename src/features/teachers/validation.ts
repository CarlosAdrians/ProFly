import { validateEmail } from '../auth/validation';
import { isValidPhone } from '../../utils/phone';
import type { Teacher } from './types';

export interface TeacherFormValues {
  name: string;
  email: string;
  phone: string;
  area: string;
  weeklyHours: string;
}

export type TeacherFormErrors = Partial<Record<keyof TeacherFormValues, string>>;

/** Limite físico de horas em uma semana; o limite institucional ainda não foi definido. */
export const MAX_WEEKLY_HOURS = 168;

export function validateTeacher(
  values: TeacherFormValues,
  others: Pick<Teacher, 'email'>[],
): TeacherFormErrors {
  const errors: TeacherFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Informe o nome completo.';
  else if (name.length < 3) errors.name = 'O nome deve ter pelo menos 3 caracteres.';

  errors.email = validateEmail(values.email);
  if (
    !errors.email &&
    others.some((other) => other.email.toLowerCase() === values.email.trim().toLowerCase())
  ) {
    errors.email = 'Já existe um professor com este e-mail.';
  }

  if (!values.phone.trim()) errors.phone = 'Informe o contato.';
  else if (!isValidPhone(values.phone)) errors.phone = 'Informe um telefone válido com DDD.';

  if (!values.area.trim()) errors.area = 'Informe a área de atuação.';

  const hours = values.weeklyHours.trim();
  if (!hours) errors.weeklyHours = 'Informe a carga horária.';
  else if (!/^\d+$/.test(hours) || Number(hours) < 1 || Number(hours) > MAX_WEEKLY_HOURS)
    errors.weeklyHours = `Informe um número inteiro de horas entre 1 e ${MAX_WEEKLY_HOURS}.`;

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
