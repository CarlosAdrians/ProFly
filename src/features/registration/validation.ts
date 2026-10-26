import { validateNewPassword } from '../invites/passwordPolicy';
import { isValidPhone } from '../../utils/phone';
import { courses, degreeOptions, knowledgeOptions } from './catalog';
import type { RegistrationData } from './model';
export type FieldErrors = Record<string, string>;
export function validateRegistration(
  data: RegistrationData,
  step: number,
  password = '',
  confirmation = '',
  terms = false,
  privacy = false,
): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0) {
    if (data.name.trim().length < 3 || data.name.length > 100)
      errors.name = 'Informe seu nome completo, entre 3 e 100 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || data.email.length > 254)
      errors.email = 'Informe um e-mail válido.';
    if (!isValidPhone(data.phone))
      errors.phone =
        'Informe um DDD brasileiro válido e o número completo. Celular deve começar com 9.';
    Object.assign(errors, validateNewPassword({ password, confirmation }));
  }
  if (step === 1) {
    if (!data.education.length || data.education.length > 10)
      errors.education = 'Informe ao menos uma formação.';
    data.education.forEach((item, index) => {
      const key = `education-${index}`;
      const currentYear = new Date().getFullYear();
      if (!degreeOptions.includes(item.degree))
        errors[`${key}-degree`] = 'Selecione a titulação obtida.';
      if (item.field.trim().length < 3 || item.field.length > 100)
        errors[`${key}-field`] = 'Informe o curso ou área de formação, entre 3 e 100 caracteres.';
      if (item.institution.trim().length < 3 || item.institution.length > 100)
        errors[`${key}-institution`] =
          'Informe o nome ou a sigla da instituição, entre 3 e 100 caracteres.';
      if (!/^\d{4}$/.test(item.year) || +item.year < 1900)
        errors[`${key}-year`] = `Informe um ano com 4 dígitos, entre 1900 e ${currentYear}.`;
      else if (+item.year > currentYear)
        errors[`${key}-year`] =
          `${item.year} ainda não chegou. Informe uma formação já concluída, até ${currentYear}.`;
    });
    if (!data.knowledge.length || data.knowledge.length > 30)
      errors.knowledge = 'Adicione pelo menos um conhecimento.';
    if (
      data.knowledge.some(
        (item) =>
          !knowledgeOptions.includes(item.name) ||
          !Number.isInteger(item.level) ||
          item.level < 1 ||
          item.level > 5,
      ) ||
      new Set(data.knowledge.map((item) => item.name)).size !== data.knowledge.length
    )
      errors.knowledge = 'Confira os conhecimentos e níveis informados.';
    for (const key of ['teaching', 'professional'] as const) {
      const experience = data[key];
      if (experience.status === 'UNKNOWN') errors[key] = 'Informe se você possui essa experiência.';
      if (experience.status === 'PROVIDED') {
        if (experience.organization.trim().length < 3 || experience.organization.length > 100)
          errors[`${key}-organization`] = 'Informe a organização, entre 3 e 100 caracteres.';
        if (experience.activity.trim().length < 3 || experience.activity.length > 100)
          errors[`${key}-activity`] = 'Informe a atividade ou área, entre 3 e 100 caracteres.';
        const limit = key === 'teaching' ? 80 : 1200;
        if (!/^\d+$/.test(experience.units) || +experience.units < 1 || +experience.units > limit)
          errors[`${key}-units`] = `Informe um número inteiro entre 1 e ${limit}.`;
      }
    }
  }
  if (step === 2) {
    if (!data.requests.length) errors.requests = 'Selecione pelo menos um curso e uma disciplina.';
    for (const request of data.requests) {
      const course = courses.find((item) => item.id === request.courseId);
      if (
        !course ||
        !request.subjects.length ||
        request.subjects.some(
          (subject) => !(course.subjects as readonly string[]).includes(subject),
        )
      )
        errors.requests = 'Selecione disciplinas de cada curso solicitado.';
    }
    if (
      data.weeklyHours !== '' &&
      (!/^\d+$/.test(data.weeklyHours) || +data.weeklyHours < 1 || +data.weeklyHours > 168)
    )
      errors.weeklyHours = 'Informe de 1 a 168 horas semanais pretendidas.';
    if (!data.availability.length || data.availability.length > 30)
      errors.availability = 'Adicione ao menos um horário disponível.';
    for (const item of data.availability) {
      if (
        !Number.isInteger(item.weekday) ||
        item.weekday < 0 ||
        item.weekday > 6 ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.end) ||
        item.start >= item.end
      )
        errors.availability = 'Confira os dias e horários. O fim precisa ser posterior ao início.';
      if (
        data.availability.some(
          (other) =>
            item.id !== other.id &&
            item.weekday === other.weekday &&
            item.start < other.end &&
            other.start < item.end,
        )
      )
        errors.availability = 'Há horários disponíveis sobrepostos no mesmo dia.';
    }
  }
  if (step === 3) {
    if (!terms) errors.terms = 'Aceite os Termos de uso para continuar.';
    if (!privacy) errors.privacy = 'Confirme a leitura do Aviso de privacidade.';
  }
  return errors;
}
