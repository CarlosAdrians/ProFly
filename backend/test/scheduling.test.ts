import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { evaluate, type EvaluationInput } from '../src/scheduling/engine.js';
import { expand, overlaps, unionMinutes } from '../src/scheduling/temporal.js';
import { criteriaInput, periodInput } from '../src/academics/contracts.js';
import { entity } from '../src/shared/model.js';
import type { Occurrence } from '../src/scheduling/models.js';
const teacherId = randomUUID(),
  offeringId = randomUUID(),
  competencyId = randomUUID(),
  educationId = randomUUID(),
  knowledgeId = randomUUID();
const meeting = {
  id: randomUUID(),
  weekday: 1,
  startsAt: '18:30',
  endsAt: '19:20',
  validFrom: '2030-01-07',
  validUntil: '2030-01-14',
};
function fixture(): EvaluationInput {
  const criteria = criteriaInput.parse({
    status: 'REVIEWED',
    mandatoryKnowledge: [{ competencyId, minLevel: 3 }],
    desiredKnowledge: [{ competencyId, weight: 1, targetLevel: 4 }],
    minimumEducation: null,
    relevantCompetencyIds: [competencyId],
    minimumTeachingSemesters: 0,
    minimumProfessionalMonths: 0,
    score: {
      knowledgeWeight: 60,
      teachingWeight: 25,
      professionalWeight: 15,
      teachingCapSemesters: 4,
      professionalCapMonths: 24,
    },
  });
  const period = periodInput.parse({
    code: 'TEST',
    name: 'Periodo teste',
    active: true,
    startsOn: '2030-01-01',
    endsOn: '2030-03-31',
    timeZone: 'America/Fortaleza',
    calendarStatus: 'REVIEWED',
    blocks: [{ weekday: 1, startsAt: '18:30', endsAt: '19:20', shift: 'NIGHT' }],
  });
  const experience = (id: string, units: number) => ({
    id,
    organization: 'Instituicao teste',
    activity: 'Atividade pertinente',
    competencyIds: [competencyId],
    startsOn: '2020-01-01',
    endsOn: '2022-01-01',
    completedUnits: units,
  });
  const teaching = experience(randomUUID(), 2),
    professional = experience(randomUUID(), 24);
  return {
    teacherId,
    offeringId,
    profileVersion: 1,
    rulesVersion: 1,
    criteria,
    period,
    profile: {
      education: [
        {
          id: educationId,
          level: 'MASTER',
          field: 'Direito',
          institution: 'Instituicao teste',
          completedYear: 2020,
        },
      ],
      knowledge: [{ id: knowledgeId, competencyId, level: 3 }],
      teaching: { status: 'PROVIDED', entries: [teaching] },
      professional: { status: 'PROVIDED', entries: [professional] },
      availability: {
        status: 'PROVIDED',
        timeZone: period.timeZone,
        windows: [{ ...meeting, startsAt: '18:00', endsAt: '20:00' }],
      },
    },
    review: {
      ...entity(),
      teacherId,
      courseId: randomUUID(),
      applicationId: randomUUID(),
      reviewerId: randomUUID(),
      profileVersion: 1,
      subjectIds: [randomUUID()],
      items: [educationId, knowledgeId, teaching.id, professional.id].map((id) => ({
        id,
        status: 'CONFIRMED',
      })),
      experienceDeclarations: { teaching: 'PROVIDED', professional: 'PROVIDED' },
    },
    member: true,
    slots: expand([meeting], period.timeZone),
    occupied: [],
    workload: {
      ...entity(teacherId),
      teacherId,
      weeklyMinutes: 50,
      validFrom: period.startsOn,
      validUntil: period.endsOn,
      timeZone: period.timeZone,
    },
    absences: [],
    history: [],
  };
}

test('CASE-020/021/022/024: fronteiras, todos os encontros, fuso e carga semanal', () => {
  const input = fixture(),
    first = input.slots[0]!;
  assert.equal(first.startsAt, '2030-01-07T21:30:00.000Z');
  assert.equal(
    overlaps(first, { startsAt: first.endsAt, endsAt: '2030-01-07T23:30:00.000Z' }),
    false,
  );
  assert.equal(
    overlaps(first, { startsAt: '2030-01-07T22:00:00.000Z', endsAt: '2030-01-07T23:30:00.000Z' }),
    true,
  );
  assert.equal(evaluate(input).eligibility, 'ELIGIBLE');
  input.workload!.weeklyMinutes = 49;
  assert.equal(evaluate(input).eligibility, 'INELIGIBLE');
  input.workload!.weeklyMinutes = 50;
  input.profile!.availability!.windows[0]!.validUntil = '2030-01-07';
  assert.equal(evaluate(input).eligibility, 'INELIGIBLE');
  assert.equal(unionMinutes([first, first], input.period.timeZone)[0]!.minutes, 50);
  assert.throws(
    () =>
      expand(
        [
          {
            ...meeting,
            weekday: 7,
            validFrom: '2030-03-10',
            validUntil: '2030-03-10',
            startsAt: '02:15',
            endsAt: '03:00',
          },
        ],
        'America/New_York',
      ),
    /inexistente/,
  );
});

test('CASE-026/027/028/029: ausencia e falha conhecidas prevalecem; score incompleto nao vira zero', () => {
  const input = fixture();
  input.profile!.professional = undefined;
  let result = evaluate(input);
  assert.equal(result.eligibility, 'ELIGIBLE');
  assert.equal(result.score.state, 'PENDING');
  assert.equal(result.score.value, null);
  input.profile!.knowledge = [];
  result = evaluate(input);
  assert.equal(result.eligibility, 'PENDING');
  input.member = false;
  result = evaluate(input);
  assert.equal(result.eligibility, 'INELIGIBLE');
  assert.ok(result.pending.length);
  input.member = true;
  input.criteria = null;
  result = evaluate(input);
  assert.equal(result.eligibility, 'CONFIGURATION_PENDING');
  assert.equal(result.score.state, 'NOT_APPLICABLE');
});

test('CASE-030/031/032/034: proposta Ana 80 e Bruno 85, fatores, teto e determinismo', () => {
  const input = fixture();
  input.profile!.knowledge![0]!.level = 3;
  input.profile!.teaching!.entries[0]!.completedUnits = 4;
  input.profile!.professional!.entries[0]!.completedUnits = 16;
  const ana = evaluate(input);
  assert.equal(ana.score.value, 80);
  assert.equal(
    ana.score.factors.reduce((n, f) => n + f.points!, 0),
    80,
  );
  input.profile!.knowledge![0]!.level = 4;
  input.profile!.teaching!.entries[0]!.completedUnits = 4;
  input.profile!.professional!.entries[0]!.completedUnits = 0;
  const bruno = evaluate(input);
  assert.equal(bruno.score.value, 85);
  assert.equal(evaluate(input).score.value, bruno.score.value);
  input.profile!.knowledge!.push({ id: randomUUID(), competencyId: randomUUID(), level: 5 });
  assert.equal(evaluate(input).score.value, 85);
  input.profile!.teaching!.entries[0]!.completedUnits = 80;
  assert.equal(evaluate(input).score.value, 85);
});

test('CASE-015/033/035: sobreposicao exige consolidacao; ausencia nao altera fatores', () => {
  const input = fixture(),
    initial = evaluate(input).score;
  input.absences = [
    {
      ...entity(),
      teacherId,
      startsOn: meeting.validFrom,
      endsOn: meeting.validUntil,
      courseIds: [],
      decisions: { test: { status: 'ACCEPTED' } },
    },
  ];
  assert.equal(evaluate(input).eligibility, 'INELIGIBLE');
  assert.deepEqual(evaluate(input).score, initial);
  const extra = { ...input.profile!.teaching!.entries[0]!, id: randomUUID() };
  input.profile!.teaching!.entries.push(extra);
  input.review!.items.push({ id: extra.id, status: 'CONFIRMED' });
  assert.equal(evaluate(input).score.state, 'PENDING');
  input.profile!.teaching = { status: 'NONE', entries: [] };
  input.review!.experienceDeclarations.teaching = 'NONE';
  assert.equal(evaluate(input).score.factors.find((f) => f.id === 'teaching')!.points, 0);
  input.profile!.teaching = { status: 'UNKNOWN', entries: [] };
  assert.equal(evaluate(input).score.factors.find((f) => f.id === 'teaching')!.points, null);
});

test('CASE-047/048: historico completo, equivalencia explicita e deduplicacao de declaracoes', () => {
  const input = fixture();
  input.profile!.teaching = { status: 'NONE', entries: [] };
  input.review!.experienceDeclarations.teaching = 'NONE';
  input.history = Array.from(
    { length: 20 },
    (_, i) =>
      ({
        ...entity(),
        teacherId,
        allocationId: randomUUID(),
        courseId: randomUUID(),
        periodId: randomUUID(),
        subjectId: randomUUID(),
        groupId: randomUUID(),
        startsAt: `2024-01-${String(i + 1).padStart(2, '0')}T21:30:00.000Z`,
        endsAt: `2024-01-${String(i + 1).padStart(2, '0')}T22:20:00.000Z`,
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        minutes: 50,
        courseName: 'Curso teste',
        subjectName: 'Materia teste',
        groupName: 'Turma teste',
        status: 'COMPLETED',
      }) as Occurrence,
  );
  assert.equal(evaluate(input).score.state, 'PENDING');
  input.criteria!.score.confirmedMinutesPerTeachingSemester = 250;
  const result = evaluate(input);
  assert.equal(result.history.confirmedCount, 20);
  assert.equal(result.history.confirmedMinutes, 1000);
  assert.equal(result.score.factors.find((f) => f.id === 'teaching')!.points, 25);
  input.history.push({ ...input.history[0]!, _id: randomUUID() });
  assert.equal(evaluate(input).score.value, result.score.value);
});

test('CASE-026/028/031: evidencia recusada permanece pendente, ausencia confirmada e zero conhecido', () => {
  const input = fixture();
  const item = input.review!.items.find((i) => i.id === knowledgeId)!;
  item.status = 'REJECTED';
  let result = evaluate(input);
  assert.equal(result.eligibility, 'PENDING');
  assert.equal(result.score.value, null);
  item.status = 'ABSENT';
  result = evaluate(input);
  assert.equal(result.eligibility, 'INELIGIBLE');
  assert.equal(result.score.factors.find((f) => f.id === 'knowledge')!.points, 0);
  assert.equal(result.tree.find((n) => n.id === `knowledge:${competencyId}`)!.answer, false);
  item.status = 'CONFIRMED';
  input.profile!.knowledge![0]!.level = 4;
  input.profile!.teaching!.entries[0]!.completedUnits = 4;
  input.criteria!.score.knowledgeWeight = 33.33335;
  input.criteria!.score.teachingWeight = 33.33335;
  input.criteria!.score.professionalWeight = 33.3333;
  result = evaluate(input);
  assert.equal(result.score.value, 100);
  assert.ok(result.score.factors.every((f) => Number.isFinite(f.points)));
});

test('CASE-024/026: carga de outra semana nao contamina a proposta e formacao inferior confirmada falha', () => {
  const input = fixture();
  input.occupied = [
    {
      date: '2029-12-03',
      startsAt: '2029-12-03T21:00:00.000Z',
      endsAt: '2029-12-03T23:00:00.000Z',
      minutes: 120,
    },
  ];
  assert.equal(evaluate(input).eligibility, 'ELIGIBLE');
  input.criteria!.minimumEducation = { level: 'DOCTORATE', field: 'Direito' };
  assert.equal(evaluate(input).eligibility, 'INELIGIBLE');
  input.review!.items = input.review!.items.filter((i) => i.id !== educationId);
  assert.equal(evaluate(input).eligibility, 'PENDING');
});

test('CASE-031/034/056: scores calculados permanecem finitos, explicaveis e deterministicos nas fronteiras', () => {
  let calculated = 0;
  for (const level of [3, 4, 5])
    for (const teaching of [0, 1, 4, 1200])
      for (const professional of [0, 1, 24, 1200]) {
        const input = fixture();
        input.profile!.knowledge![0]!.level = level;
        input.profile!.teaching!.entries[0]!.completedUnits = teaching;
        input.profile!.professional!.entries[0]!.completedUnits = professional;
        const result = evaluate(input);
        assert.equal(result.score.state, 'CALCULATED');
        assert.ok(Number.isFinite(result.score.value));
        assert.ok(result.score.value! >= 0 && result.score.value! <= 100);
        assert.ok(
          Math.abs(
            result.score.factors.reduce((sum, factor) => sum + factor.points!, 0) -
              result.score.value!,
          ) < 0.011,
        );
        assert.ok(
          result.score.factors.every(
            (factor) =>
              Number.isFinite(factor.points) &&
              factor.points! >= 0 &&
              factor.points! <= factor.weight,
          ),
        );
        assert.equal(result.profileVersion, input.profileVersion);
        assert.equal(result.rulesVersion, input.rulesVersion);
        assert.equal(result.offeringId, input.offeringId);
        assert.deepEqual(evaluate(input).score, result.score);
        assert.deepEqual(evaluate(input).checks, result.checks);
        calculated++;
      }
  assert.equal(calculated, 48);
});

test('CASE-023/026/027/029: todos os conhecimentos obrigatorios e grade ausente geram caminhos explicitos', () => {
  const input = fixture();
  const second = { id: randomUUID(), competencyId: randomUUID(), level: 4 };
  const third = { id: randomUUID(), competencyId: randomUUID(), level: 1 };
  input.criteria!.mandatoryKnowledge.push(
    { competencyId: second.competencyId, minLevel: 3 },
    { competencyId: third.competencyId, minLevel: 2 },
  );
  input.profile!.knowledge!.push(second, third);
  input.review!.items.push({ id: third.id, status: 'CONFIRMED' });
  let result = evaluate(input);
  assert.equal(result.eligibility, 'INELIGIBLE');
  assert.ok(result.pending.includes(`knowledge:${second.competencyId}`));
  assert.equal(
    result.tree.find((node) => node.id === `knowledge:${second.competencyId}`)!.answer,
    null,
  );
  assert.equal(
    result.tree.find((node) => node.id === `knowledge:${third.competencyId}`)!.answer,
    false,
  );
  assert.equal(result.checks.filter((check) => check.id.startsWith('knowledge:')).length, 3);
  input.review!.items.push({ id: second.id, status: 'CONFIRMED' });
  third.level = 2;
  assert.equal(evaluate(input).eligibility, 'ELIGIBLE');
  input.period.calendarStatus = 'DRAFT';
  result = evaluate(input);
  assert.equal(result.eligibility, 'CONFIGURATION_PENDING');
  assert.ok(result.pending.includes('calendar'));
  input.period.calendarStatus = 'REVIEWED';
  input.slots = [];
  assert.equal(evaluate(input).eligibility, 'CONFIGURATION_PENDING');
});
