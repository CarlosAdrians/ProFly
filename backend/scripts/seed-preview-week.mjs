// Explicit synthetic-preview operation. Never loads .env or writes directly to MongoDB.
import { randomUUID } from 'node:crypto';
if (process.env.PROFLY_SEED_PREVIEW_WEEK !== '1')
  throw new Error('Opt-in de previa sintetica obrigatorio.');
const base = process.env.PROFLY_PREVIEW_API ?? 'http://127.0.0.1:3337';
if (!['http://127.0.0.1:3334', 'http://127.0.0.1:3337'].includes(base))
  throw new Error('Somente a previa local isolada pode ser preenchida.');
const password = process.env.PROFLY_PREVIEW_PASSWORD;
if (!password) throw new Error('Informe a senha ficticia no ambiente do processo.');
async function call(path, actor, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      ...(actor ? { Cookie: actor.cookie, 'X-CSRF-Token': actor.csrf } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${value.error?.code ?? 'HTTP_ERROR'}`);
  return value;
}
const policy = await call('/catalog/privacy');
if (policy.healthUploads !== 'SYNTHETIC_ONLY' || policy.approved)
  throw new Error('O destino nao esta identificado como teste sintetico.');
async function login(email, role) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  if (
    !response.ok ||
    !result.user.roles.includes(role) ||
    !result.user.email.endsWith('@profly.test')
  )
    throw new Error('Identidade sintetica indisponivel.');
  return {
    cookie: response.headers.getSetCookie()[0].split(';')[0],
    csrf: result.csrfToken,
    user: result.user,
  };
}
const admin = await login('admin.ui@profly.test', 'admin');
const coordinator = await login('coordenacao.ui@profly.test', 'coordinator');
const teacher = await login('docente.ui@profly.test', 'teacher');
const course = (await call('/courses', coordinator)).items.find(
  (c) => c.code === 'DIR-UI' && c.roles.includes('coordinator'),
);
if (!course) throw new Error('Curso de teste sob esta coordenacao indisponivel.');
const root = `/courses/${course.id}`;
const day = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Fortaleza',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const monday = new Date(`${day}T12:00:00Z`);
const weekday = monday.getUTCDay() || 7;
monday.setUTCDate(monday.getUTCDate() + (weekday === 1 ? 7 : 8 - weekday));
const from = monday.toISOString().slice(0, 10);
const add = (n) => {
  const d = new Date(`${from}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const until = add(6),
  prefix = `VIS-${from.replaceAll('-', '')}`;
const specs = [
  { offset: 0, weekday: 1, startsAt: '08:00', endsAt: '08:50', subject: 0 },
  { offset: 0, weekday: 1, startsAt: '14:00', endsAt: '14:50', subject: 1 },
  { offset: 1, weekday: 2, startsAt: '09:00', endsAt: '09:50', subject: 2 },
  { offset: 3, weekday: 4, startsAt: '14:00', endsAt: '14:50', subject: 0 },
  { offset: 4, weekday: 5, startsAt: '15:00', endsAt: '15:50', subject: 1 },
];
let periods = (await call('/admin/periods?limit=100', admin)).items;
let period = periods.find((p) => p.code === prefix);
if (!period)
  period = await call('/admin/periods', admin, {
    code: prefix,
    name: `Semana visual ${from}`,
    active: true,
    startsOn: from,
    endsOn: until,
    timeZone: 'America/Fortaleza',
    calendarStatus: 'REVIEWED',
    blocks: specs.map((s) => ({
      weekday: s.weekday,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      shift: s.startsAt < '12:00' ? 'MORNING' : 'AFTERNOON',
    })),
  });
const subjects = (await call(`${root}/subjects?limit=100`, coordinator)).items;
const civil = subjects.find((s) => s.code === 'CIV-UI');
if (!civil?.criteria || civil.criteria.status !== 'REVIEWED')
  throw new Error('Criterios sinteticos de referencia indisponiveis.');
const chosen = [civil];
for (const [code, name] of [
  ['VIS-CIV2', 'Direito Civil II'],
  ['VIS-CONTR', 'Pratica Contratual'],
]) {
  chosen.push(
    subjects.find((s) => s.code === code) ??
      (await call(`${root}/subjects`, coordinator, {
        code,
        name,
        active: true,
        criteria: civil.criteria,
      })),
  );
}
const groups = (await call(`${root}/groups?limit=100`, coordinator)).items;
const group =
  groups.find((g) => g.code === prefix) ??
  (await call(`${root}/groups`, coordinator, {
    code: prefix,
    name: 'Direito · Turma visual',
    active: true,
    periodId: period.id,
  }));
let profile = await call('/me/profile', teacher);
const existing = profile.data.availability?.windows ?? [];
const additions = specs
  .filter(
    (s) =>
      !existing.some(
        (w) =>
          w.weekday === s.weekday &&
          w.startsAt <= s.startsAt &&
          w.endsAt >= s.endsAt &&
          w.validFrom <= from &&
          w.validUntil >= add(4),
      ),
  )
  .map((s) => ({
    id: randomUUID(),
    weekday: s.weekday,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    validFrom: from,
    validUntil: add(4),
  }));
if (additions.length)
  profile = await call(
    '/me/profile',
    teacher,
    {
      expectedVersion: profile.version,
      data: {
        ...profile.data,
        availability: {
          status: 'PROVIDED',
          timeZone: 'America/Fortaleza',
          windows: [...existing, ...additions],
        },
      },
    },
    'PUT',
  );
const old = (await call('/me/applications', teacher)).items.find((a) => a.courseId === course.id);
const subjectIds = [...new Set([...(old?.subjectIds ?? []), ...chosen.map((s) => s.id)])];
if (
  old?.profileVersion !== profile.version ||
  old.status !== 'APPROVED' ||
  subjectIds.length !== old.subjectIds.length
) {
  const request = await call(`/me/applications/${course.id}`, teacher, {
    expectedVersion: old?.version ?? 0,
    profileVersion: profile.version,
    subjectIds,
  });
  await call(`${root}/applications/${request.id}/review`, coordinator, {
    expectedVersion: request.version,
    profileVersion: profile.version,
    decision: 'APPROVED',
    reason:
      'Cenario visual ficticio solicitado para conferencia do calendario; sem homologacao institucional.',
    items: [
      ...profile.data.education,
      ...profile.data.knowledge,
      ...(profile.data.teaching?.entries ?? []),
      ...(profile.data.professional?.entries ?? []),
    ].map((i) => ({ id: i.id, status: 'CONFIRMED' })),
  });
}
const offerings = (await call(`${root}/offerings?limit=100`, coordinator)).items;
let planning = await call(`${root}/planning`, coordinator);
const allocated = [];
for (let i = 0; i < chosen.length; i++) {
  const meetings = specs
    .filter((s) => s.subject === i)
    .map((s) => ({
      id: randomUUID(),
      weekday: s.weekday,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      validFrom: from,
      validUntil: add(4),
    }));
  const code = `${prefix}-${i}`;
  const offering =
    offerings.find((o) => o.code === code) ??
    (await call(`${root}/offerings`, coordinator, {
      code,
      name: `${chosen[i].name} · Semana visual`,
      active: true,
      periodId: period.id,
      groupId: group.id,
      subjectId: chosen[i].id,
      meetings,
    }));
  const allocation =
    planning.allocations.find(
      (a) => a.offeringId === offering.id && a.teacherId === teacher.user.id,
    ) ??
    (await call(`${root}/allocations`, coordinator, {
      offeringId: offering.id,
      teacherId: teacher.user.id,
      meetings: offering.meetings,
    }));
  allocated.push(allocation.id);
}
planning = await call(`${root}/planning`, coordinator);
if (planning.allocations.some((a) => a.periodId === period.id && !allocated.includes(a.id)))
  throw new Error(
    'Ha outro rascunho no periodo; publicacao interrompida para preservar planejamento.',
  );
const before = await call(`/me/schedule?from=${from}&until=${until}`, teacher);
const own = (list) => list.items.filter((o) => allocated.includes(o.allocationId));
if (own(before).length !== 5) {
  const plan = planning.plans.find((p) => p.periodId === period.id);
  await call(`${root}/periods/${period.id}/publish`, coordinator, {
    expectedVersion: plan.version,
  });
}
const schedule = await call(`/me/schedule?from=${from}&until=${until}`, teacher);
if (own(schedule).length !== 5) throw new Error('Quantidade publicada inesperada.');
console.log(
  JSON.stringify(
    {
      syntheticOnly: true,
      teacher: teacher.user.email,
      from,
      until,
      classes: own(schedule).map((o) => ({
        date: o.date,
        subject: o.subjectName,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        status: o.status,
      })),
      preservedPriorAvailability: existing.length,
      addedAvailability: additions.length,
      published: true,
    },
    null,
    2,
  ),
);

// Close only the three temporary sessions created by this script. Browser sessions remain valid.
await Promise.allSettled(
  [admin, coordinator, teacher].map((actor) => call('/auth/logout', actor, {})),
);
