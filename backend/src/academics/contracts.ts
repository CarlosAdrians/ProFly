import { z } from 'zod';
import { id, name } from '../shared/http.js';
import { date, time } from '../shared/temporal.js';

const code = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .transform((value) => value.toUpperCase());
const base = { code, name, active: z.boolean() };
const unique = (items: { competencyId: string }[]) =>
  new Set(items.map((item) => item.competencyId)).size === items.length;
const competencyIds = z
  .array(id)
  .max(100)
  .refine((items) => new Set(items).size === items.length);
export const competencyInput = z.strictObject(base);
const education = z.strictObject({
  level: z.enum(['BACHELOR', 'SPECIALIZATION', 'MASTER', 'DOCTORATE', 'POSTDOCTORATE']),
  field: name.nullable(),
});
export const criteriaInput = z
  .strictObject({
    status: z.enum(['DRAFT', 'REVIEWED']),
    mandatoryKnowledge: z
      .array(z.strictObject({ competencyId: id, minLevel: z.number().int().min(1).max(5) }))
      .max(100)
      .refine(unique),
    desiredKnowledge: z
      .array(
        z.strictObject({
          competencyId: id,
          weight: z.number().finite().positive().max(100),
          targetLevel: z.number().int().min(1).max(5).default(3),
        }),
      )
      .max(100)
      .refine(unique),
    minimumEducation: education.nullable(),
    relevantCompetencyIds: competencyIds,
    minimumTeachingSemesters: z.number().int().min(0).max(80),
    minimumProfessionalMonths: z.number().int().min(0).max(1200),
    score: z.strictObject({
      knowledgeWeight: z.number().finite().min(0).max(100),
      teachingWeight: z.number().finite().min(0).max(100),
      professionalWeight: z.number().finite().min(0).max(100),
      teachingCapSemesters: z.number().int().min(1).max(80),
      professionalCapMonths: z.number().int().min(1).max(1200),
      confirmedMinutesPerTeachingSemester: z
        .number()
        .int()
        .min(1)
        .max(100000)
        .nullable()
        .default(null),
    }),
  })
  .superRefine((value, context) => {
    if (
      Math.abs(
        value.score.knowledgeWeight +
          value.score.teachingWeight +
          value.score.professionalWeight -
          100,
      ) > 0.000001
    )
      context.addIssue({ code: 'custom', path: ['score'], message: 'Pesos devem somar 100.' });
    if (value.score.knowledgeWeight > 0 && !value.desiredKnowledge.length)
      context.addIssue({
        code: 'custom',
        path: ['desiredKnowledge'],
        message: 'Peso de conhecimento exige criterios desejaveis.',
      });
    if (
      (value.score.teachingWeight > 0 ||
        value.score.professionalWeight > 0 ||
        value.minimumTeachingSemesters > 0 ||
        value.minimumProfessionalMonths > 0) &&
      !value.relevantCompetencyIds.length
    )
      context.addIssue({
        code: 'custom',
        path: ['relevantCompetencyIds'],
        message: 'Defina a pertinencia da experiencia.',
      });
  });
export const subjectInput = z.strictObject({ ...base, criteria: criteriaInput.nullable() });
const block = z
  .strictObject({
    weekday: z.number().int().min(1).max(7),
    startsAt: time,
    endsAt: time,
    shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']),
  })
  .refine((item) => item.startsAt < item.endsAt);
export const periodInput = z
  .strictObject({
    ...base,
    startsOn: date,
    endsOn: date,
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
      }),
    calendarStatus: z.enum(['DRAFT', 'REVIEWED']),
    blocks: z.array(block).max(100),
  })
  .superRefine((value, context) => {
    if (value.startsOn > value.endsOn)
      context.addIssue({ code: 'custom', path: ['endsOn'], message: 'Vigencia invalida.' });
    for (let i = 0; i < value.blocks.length; i++)
      for (const other of value.blocks.slice(i + 1)) {
        const current = value.blocks[i]!;
        if (
          current.weekday === other.weekday &&
          current.startsAt < other.endsAt &&
          other.startsAt < current.endsAt
        )
          context.addIssue({ code: 'custom', path: ['blocks', i], message: 'Blocos sobrepostos.' });
      }
    if (value.calendarStatus === 'REVIEWED' && !value.blocks.length)
      context.addIssue({
        code: 'custom',
        path: ['blocks'],
        message: 'Grade revisada exige blocos.',
      });
  });
export const groupInput = z.strictObject({ ...base, periodId: id });
const meeting = z
  .strictObject({
    id,
    weekday: z.number().int().min(1).max(7),
    startsAt: time,
    endsAt: time,
    validFrom: date,
    validUntil: date,
  })
  .refine((item) => item.startsAt < item.endsAt && item.validFrom <= item.validUntil);
export const offeringInput = z
  .strictObject({
    ...base,
    periodId: id,
    subjectId: id,
    groupId: id,
    meetings: z.array(meeting).max(100),
  })
  .superRefine((value, context) => {
    if (new Set(value.meetings.map((item) => item.id)).size !== value.meetings.length)
      context.addIssue({
        code: 'custom',
        path: ['meetings'],
        message: 'Identificador de encontro repetido.',
      });
    for (let i = 0; i < value.meetings.length; i++)
      for (const other of value.meetings.slice(i + 1)) {
        const current = value.meetings[i]!;
        if (
          current.weekday === other.weekday &&
          current.validFrom <= other.validUntil &&
          other.validFrom <= current.validUntil &&
          current.startsAt < other.endsAt &&
          other.startsAt < current.endsAt
        )
          context.addIssue({
            code: 'custom',
            path: ['meetings', i],
            message: 'Encontros sobrepostos.',
          });
      }
  });
export type Criteria = z.infer<typeof criteriaInput>;
export type PeriodData = z.infer<typeof periodInput>;
export type SubjectData = z.infer<typeof subjectInput>;
export type OfferingData = z.infer<typeof offeringInput>;
