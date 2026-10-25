import type { Criteria, PeriodData } from '../academics/contracts.js';
import type { ProfileData } from '../teachers/contracts.js';
import type { Review } from '../teachers/models.js';
import type { Absence, Occurrence, Slot, Workload } from './models.js';
import { localParts, minutes, overlaps, unionMinutes } from './temporal.js';

export interface Check {
  id: string;
  state: 'PASS' | 'FAIL' | 'PENDING' | 'CONFIGURATION_PENDING';
  reason: string;
  yes: string;
  no: string;
}
export interface EvaluationInput {
  teacherId: string;
  offeringId: string;
  profileVersion: number | null;
  rulesVersion: number | null;
  criteria: Criteria | null;
  period: PeriodData;
  profile: ProfileData | null;
  review: Review | null;
  member: boolean;
  slots: Slot[];
  occupied: Slot[];
  reservedLoad?: Slot[];
  workload: Workload | null;
  absences: Absence[];
  history: Occurrence[];
}
const educationRank = ['BACHELOR', 'SPECIALIZATION', 'MASTER', 'DOCTORATE', 'POSTDOCTORATE'];
const round = (n: number) => Math.round(n * 10000) / 10000;
export function evaluate(input: EvaluationInput) {
  const checks: Check[] = [];
  const add = (id: string, state: Check['state'], reason: string) =>
    checks.push({
      id,
      state,
      reason,
      yes: 'seguir',
      no: state === 'FAIL' ? 'impedido' : 'aguardar',
    });
  const confirmed = new Set(
    input.review?.items.filter((i) => i.status === 'CONFIRMED').map((i) => i.id),
  );
  const rejected = new Set(
    input.review?.items.filter((i) => i.status === 'REJECTED').map((i) => i.id),
  );
  const profile = input.profile;
  add(
    'membership',
    input.member ? 'PASS' : 'FAIL',
    input.member ? 'Vinculo aprovado no curso.' : 'Vinculo nao aprovado no curso.',
  );
  const criteria = input.criteria;
  add(
    'rules',
    !criteria || criteria.status !== 'REVIEWED' ? 'CONFIGURATION_PENDING' : 'PASS',
    criteria?.status === 'REVIEWED'
      ? 'Ficha revisada pela coordenacao.'
      : 'Ficha de criterios aguardando revisao.',
  );
  add(
    'calendar',
    input.period.calendarStatus === 'REVIEWED' && input.slots.length
      ? 'PASS'
      : 'CONFIGURATION_PENDING',
    'Grade revisada e todos os encontros definidos.',
  );
  if (!profile || !input.review)
    add('profile', 'PENDING', 'Perfil atual precisa ser analisado neste curso.');
  if (criteria?.minimumEducation) {
    const required = criteria.minimumEducation;
    const relevant =
      profile?.education?.filter(
        (e) =>
          educationRank.indexOf(e.level) >= educationRank.indexOf(required.level) &&
          (!required.field ||
            e.field.toLocaleLowerCase('pt-BR') === required.field.toLocaleLowerCase('pt-BR')),
      ) ?? [];
    add(
      'education',
      relevant.some((e) => confirmed.has(e.id))
        ? 'PASS'
        : relevant.length && relevant.every((e) => rejected.has(e.id))
          ? 'FAIL'
          : 'PENDING',
      'Formacao minima confirmada para a disciplina.',
    );
  }
  const knowledgeValue = (competencyId: string): number | null => {
    const item = profile?.knowledge?.find((k) => k.competencyId === competencyId);
    return item && confirmed.has(item.id) ? item.level : item && rejected.has(item.id) ? 0 : null;
  };
  for (const item of criteria?.mandatoryKnowledge ?? []) {
    const value = knowledgeValue(item.competencyId);
    add(
      `knowledge:${item.competencyId}`,
      value === null ? 'PENDING' : value >= item.minLevel ? 'PASS' : 'FAIL',
      value === null
        ? 'Conhecimento obrigatorio sem confirmacao.'
        : `Nivel confirmado ${value}; minimo ${item.minLevel}.`,
    );
  }
  const history = input.history.filter((h) => h.status === 'COMPLETED');
  const experience = (key: 'teaching' | 'professional'): number | null => {
    const section = profile?.[key];
    if (
      !section ||
      section.status === 'UNKNOWN' ||
      !input.review ||
      input.review.experienceDeclarations[key] !== section.status
    )
      return null;
    if (section.status === 'NONE' && (key === 'professional' || !history.length)) return 0;
    const relevant = section.entries.filter((e) =>
      e.competencyIds.some((c) => criteria?.relevantCompetencyIds.includes(c)),
    );
    if (relevant.some((e) => !confirmed.has(e.id) && !rejected.has(e.id))) return null;
    const entries = relevant
      .filter((e) => confirmed.has(e.id))
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
    // Overlapping declarations need consolidation by the reviewer; never add duplicated periods.
    if (
      entries.some((a, i) =>
        entries
          .slice(i + 1)
          .some(
            (b) =>
              a.startsOn <= (b.endsOn ?? '9999-12-31') && b.startsOn <= (a.endsOn ?? '9999-12-31'),
          ),
      )
    )
      return null;
    let units = entries.reduce((sum, e) => sum + e.completedUnits, 0);
    if (key === 'teaching') {
      const unique = new Map(
        history
          .filter(
            (h) =>
              !entries.some(
                (e) => e.startsOn <= h.date && (e.endsOn === null || e.endsOn >= h.date),
              ),
          )
          .map((h) => [`${h.startsAt}:${h.endsAt}`, h]),
      );
      if (unique.size) {
        if (!criteria?.score.confirmedMinutesPerTeachingSemester) return null;
        units +=
          [...unique.values()].reduce((sum, h) => sum + h.minutes, 0) /
          criteria.score.confirmedMinutesPerTeachingSemester;
      }
    }
    return units;
  };
  const teaching = experience('teaching'),
    professional = experience('professional');
  for (const [key, value, minimum] of [
    ['teaching', teaching, criteria?.minimumTeachingSemesters],
    ['professional', professional, criteria?.minimumProfessionalMonths],
  ] as const)
    if (minimum && minimum > 0)
      add(
        key,
        value === null ? 'PENDING' : value >= minimum ? 'PASS' : 'FAIL',
        `Experiencia pertinente minima: ${minimum}.`,
      );
  if (!profile?.availability || profile.availability.status === 'UNKNOWN')
    add('availability', 'PENDING', 'Disponibilidade nao informada.');
  else {
    const availability = profile.availability;
    const covered = input.slots.every((slot) => {
      const start = localParts(new Date(slot.startsAt), availability.timeZone);
      const end = localParts(new Date(slot.endsAt), availability.timeZone);
      const weekday = new Date(`${start.date}T12:00:00Z`).getUTCDay() || 7;
      // Adjacent windows may jointly cover a block, without allowing gaps.
      const windows = availability.windows
        .filter(
          (w) => w.weekday === weekday && w.validFrom <= start.date && w.validUntil >= start.date,
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      let cursor = minutes(start.time);
      for (const w of windows)
        if (minutes(w.startsAt) <= cursor && minutes(w.endsAt) > cursor) cursor = minutes(w.endsAt);
      return start.date === end.date && cursor >= minutes(end.time);
    });
    add(
      'availability',
      covered && availability.status === 'PROVIDED' ? 'PASS' : 'FAIL',
      'Cobertura de todos os encontros na disponibilidade declarada.',
    );
  }
  add(
    'conflicts',
    input.slots.some((s) => input.occupied.some((o) => overlaps(s, o))) ? 'FAIL' : 'PASS',
    'Compromissos em todos os cursos, incluindo reservas de rascunho.',
  );
  for (const absence of input.absences) {
    if (!input.slots.some((slot) => slot.date >= absence.startsOn && slot.date <= absence.endsOn))
      continue;
    const decisions = Object.values(absence.decisions);
    if (decisions.some((d) => d.status === 'ACCEPTED'))
      add(`absence:${absence._id}`, 'FAIL', 'Indisponibilidade temporaria aplicavel.');
    else if (decisions.some((d) => d.status === 'SUBMITTED'))
      add(`absence:${absence._id}`, 'PENDING', 'Indisponibilidade temporaria em analise.');
  }
  const limit = input.workload;
  if (
    !limit ||
    input.slots.some((s) => {
      const d = localParts(new Date(s.startsAt), limit.timeZone).date;
      return d < limit.validFrom || d > limit.validUntil;
    })
  )
    add('workload', 'CONFIGURATION_PENDING', 'Limite institucional vigente nao configurado.');
  else
    add(
      'workload',
      unionMinutes(
        [...(input.reservedLoad ?? input.occupied), ...input.slots],
        limit.timeZone,
      ).some((w) => w.minutes > limit.weeklyMinutes)
        ? 'FAIL'
        : 'PASS',
      `Limite semanal institucional: ${limit.weeklyMinutes} minutos.`,
    );
  const eligibility = checks.some((c) => c.state === 'FAIL')
    ? 'INELIGIBLE'
    : checks.some((c) => c.state === 'CONFIGURATION_PENDING')
      ? 'CONFIGURATION_PENDING'
      : checks.some((c) => c.state === 'PENDING')
        ? 'PENDING'
        : 'ELIGIBLE';
  const factors: { id: string; weight: number; ratio: number | null; points: number | null }[] = [];
  if (criteria) {
    const weightSum = criteria.desiredKnowledge.reduce((n, i) => n + i.weight, 0);
    const values = criteria.desiredKnowledge.map((i) => ({
      value: knowledgeValue(i.competencyId),
      ...i,
    }));
    const knowledge = values.some((i) => i.value === null)
      ? null
      : weightSum
        ? values.reduce((sum, i) => sum + i.weight * Math.min(i.value! / i.targetLevel, 1), 0) /
          weightSum
        : 0;
    for (const [id, weight, ratio] of [
      ['knowledge', criteria.score.knowledgeWeight, knowledge],
      [
        'teaching',
        criteria.score.teachingWeight,
        teaching === null ? null : Math.min(teaching / criteria.score.teachingCapSemesters, 1),
      ],
      [
        'professional',
        criteria.score.professionalWeight,
        professional === null
          ? null
          : Math.min(professional / criteria.score.professionalCapMonths, 1),
      ],
    ] as const)
      factors.push({
        id,
        weight,
        ratio: weight === 0 ? 0 : ratio,
        points: weight === 0 ? 0 : ratio === null ? null : round(weight * ratio),
      });
  }
  // A temporary absence affects eligibility, never the academic factors.
  const scoreState = !criteria
    ? 'NOT_APPLICABLE'
    : factors.some((f) => f.points === null)
      ? 'PENDING'
      : 'CALCULATED';
  return {
    teacherId: input.teacherId,
    offeringId: input.offeringId,
    evaluatedAt: new Date().toISOString(),
    profileVersion: input.profileVersion,
    rulesVersion: input.rulesVersion,
    policy: 'PROPOSAL_CONFIGURABLE',
    eligibility,
    checks,
    pending: checks
      .filter((c) => c.state === 'PENDING' || c.state === 'CONFIGURATION_PENDING')
      .map((c) => c.id),
    score: {
      state: scoreState,
      value: scoreState === 'CALCULATED' ? round(factors.reduce((n, f) => n + f.points!, 0)) : null,
      factors,
    },
    history: {
      confirmedCount: history.length,
      confirmedMinutes: history.reduce((n, h) => n + h.minutes, 0),
    },
  };
}
