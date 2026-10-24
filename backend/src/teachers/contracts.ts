import { z } from 'zod';
import { id, name } from '../shared/http.js';
import { date, time } from '../shared/temporal.js';

const text = z.string().trim().min(2).max(500);
const ids = z
  .array(id)
  .max(50)
  .refine((items) => new Set(items).size === items.length);
const education = z.strictObject({
  id,
  level: z.enum(['BACHELOR', 'SPECIALIZATION', 'MASTER', 'DOCTORATE', 'POSTDOCTORATE']),
  field: name,
  institution: name,
  completedYear: z.number().int().min(1900).max(new Date().getUTCFullYear()),
});
const knowledge = z.strictObject({
  id,
  competencyId: id,
  level: z.number().int().min(1).max(5),
  evidenceNote: text.optional(),
});
const experience = z
  .strictObject({
    id,
    organization: name,
    activity: name,
    competencyIds: ids.refine((items) => items.length > 0),
    startsOn: date,
    endsOn: date.nullable(),
    completedUnits: z.number().int().min(0).max(1200),
  })
  .refine(
    (item) =>
      item.startsOn <= new Date().toISOString().slice(0, 10) &&
      (item.endsOn === null || item.endsOn <= new Date().toISOString().slice(0, 10)),
    {
      path: ['startsOn'],
      message: 'Experiencia realizada nao pode estar no futuro.',
    },
  )
  .refine((item) => item.endsOn === null || item.startsOn <= item.endsOn, {
    path: ['endsOn'],
    message: 'Fim anterior ao inicio.',
  });
const experienceSection = z
  .strictObject({
    status: z.enum(['UNKNOWN', 'NONE', 'PROVIDED']),
    entries: z.array(experience).max(50),
  })
  .refine((section) => (section.status === 'PROVIDED') === section.entries.length > 0, {
    path: ['entries'],
    message: 'A situacao deve corresponder aos dados declarados.',
  });
const window = z
  .strictObject({
    id,
    weekday: z.number().int().min(1).max(7),
    startsAt: time,
    endsAt: time,
    validFrom: date,
    validUntil: date,
  })
  .refine((item) => item.startsAt < item.endsAt, {
    path: ['endsAt'],
    message: 'Fim deve ser posterior ao inicio, no mesmo dia.',
  })
  .refine((item) => item.validFrom <= item.validUntil, {
    path: ['validUntil'],
    message: 'Vigencia invalida.',
  });
const availability = z
  .strictObject({
    status: z.enum(['UNKNOWN', 'NONE', 'PROVIDED']),
    timeZone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('pt-BR', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Fuso horario invalido.'),
    windows: z.array(window).max(60),
  })
  .superRefine((section, context) => {
    if ((section.status === 'PROVIDED') !== section.windows.length > 0)
      context.addIssue({ code: 'custom', path: ['windows'], message: 'Situacao inconsistente.' });
    for (let i = 0; i < section.windows.length; i++) {
      for (const other of section.windows.slice(i + 1)) {
        const current = section.windows[i]!;
        if (
          current.weekday === other.weekday &&
          current.validFrom <= other.validUntil &&
          other.validFrom <= current.validUntil &&
          current.startsAt < other.endsAt &&
          other.startsAt < current.endsAt
        )
          context.addIssue({
            code: 'custom',
            path: ['windows', i],
            message: 'Janelas sobrepostas.',
          });
      }
    }
  });

export const profileData = z
  .strictObject({
    contact: z
      .strictObject({
        phone: z
          .string()
          .trim()
          .regex(/^\+?[0-9 ()-]{8,25}$/),
      })
      .optional(),
    education: z.array(education).max(20).optional(),
    knowledge: z.array(knowledge).max(100).optional(),
    teaching: experienceSection.optional(),
    professional: experienceSection.optional(),
    availability: availability.optional(),
    desiredWeeklyMinutes: z.number().int().min(0).max(10080).optional(),
  })
  .superRefine((data, context) => {
    const collections = [
      data.education,
      data.knowledge,
      data.teaching?.entries,
      data.professional?.entries,
      data.availability?.windows,
    ];
    const seen = new Set<string>();
    for (const items of collections)
      for (const item of items ?? []) {
        if (seen.has(item.id))
          context.addIssue({ code: 'custom', message: 'Identificador de item repetido.' });
        seen.add(item.id);
      }
    const competencies = data.knowledge?.map((item) => item.competencyId) ?? [];
    if (new Set(competencies).size !== competencies.length)
      context.addIssue({ code: 'custom', path: ['knowledge'], message: 'Competencia repetida.' });
  });
export type ProfileData = z.infer<typeof profileData>;

export function missingFields(data: ProfileData): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  if (!data.contact) fields.contact = ['Informe seu contato.'];
  if (!data.education?.length) fields.education = ['Informe sua formacao.'];
  if (!data.knowledge?.length) fields.knowledge = ['Informe seus conhecimentos.'];
  for (const key of ['teaching', 'professional', 'availability'] as const)
    if (!data[key] || data[key].status === 'UNKNOWN')
      fields[key] = ['Declare os dados ou sua ausencia.'];
  if (!data.desiredWeeklyMinutes) fields.desiredWeeklyMinutes = ['Informe a dedicacao pretendida.'];
  return fields;
}

export const saveProfile = z.strictObject({
  expectedVersion: z.number().int().min(0),
  data: profileData,
});
export const submitApplication = z.strictObject({
  expectedVersion: z.number().int().min(0),
  profileVersion: z.number().int().min(1),
  subjectIds: ids.refine((items) => items.length > 0),
});
const itemDecision = z.strictObject({ id, status: z.enum(['CONFIRMED', 'REJECTED']) });
export const reviewApplication = z.strictObject({
  expectedVersion: z.number().int().min(1),
  profileVersion: z.number().int().min(1),
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']),
  reason: z.string().trim().min(3).max(2000),
  items: z
    .array(itemDecision)
    .max(220)
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length),
});
