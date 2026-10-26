import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Database } from '../src/database.js';
import { loadConfig } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { IdentityService } from '../src/identity/service.js';
import type { Notifications } from '../src/identity/models.js';
import type { ProfileData } from '../src/teachers/contracts.js';

/** Explicit opt-in only. Never reads .env or connects to an institutional database. */
export async function createUiFixture(
  extraNotifications?: Notifications,
  preview: { https?: boolean } = {},
) {
  if (process.env.PROFLY_RUN_INTEGRATION !== '1')
    throw new Error('UI integration requires PROFLY_RUN_INTEGRATION=1.');
  const replica = await MongoMemoryReplSet.create({
    binary: { downloadDir: path.resolve(import.meta.dirname, '../../../../work/mongodb-binaries') },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ launchTimeout: 60000 }],
  });
  const config = loadConfig({
    NODE_ENV: 'test',
    PRIVACY_HEALTH_UPLOADS_ENABLED: 'true',
    MONGODB_URI: replica.getUri(),
    MONGODB_DATABASE: `profly_ui_${randomUUID().replaceAll('-', '')}_test`,
    ALLOWED_ORIGINS: preview.https
      ? 'https://127.0.0.1:5176,https://localhost:5176'
      : 'http://localhost:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://localhost:5177',
    COOKIE_SECURE: preview.https ? 'true' : 'false',
  });
  const database = new Database(config);
  await database.connect();
  const messages: Parameters<Notifications['send']>[0][] = [];
  const notifications: Notifications = {
    async send(message) {
      messages.push(message);
      await extraNotifications?.send(message);
    },
  };
  const identity = new IdentityService(database, config, notifications);
  const adminEmail = 'admin.ui@profly.test',
    coordinatorEmail = 'coordenacao.ui@profly.test',
    teacherEmail = 'docente.ui@profly.test',
    password = 'ProFlyTest2026';
  await identity.bootstrap('Administração de Teste', adminEmail, password);
  const app = await buildApp(config, database, { notifications });
  await app.ready();
  async function call(
    url: string,
    payload?: object,
    headers: Record<string, string> = {},
    method = payload ? 'POST' : 'GET',
  ) {
    const result = await app.inject({
      method: method as 'GET' | 'POST' | 'PUT',
      url,
      headers,
      ...(payload ? { payload } : {}),
    });
    if (result.statusCode >= 400)
      throw new Error(
        `Fixture ${method} ${url}: ${result.statusCode} ${result.json().error?.code}`,
      );
    return result.json();
  }
  async function login(email: string) {
    const result = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
      remoteAddress:
        email === adminEmail ? '10.1.0.1' : email === coordinatorEmail ? '10.1.0.2' : '10.1.0.3',
    });
    if (result.statusCode !== 200) throw new Error('Fixture login failed');
    return {
      cookie: String(result.headers['set-cookie']).split(';')[0]!,
      'x-csrf-token': result.json().csrfToken as string,
    };
  }
  const admin = await login(adminEmail);
  const courseA = await call('/api/v1/admin/courses', { code: 'DIR-UI', name: 'Direito' }, admin),
    courseB = await call(
      '/api/v1/admin/courses',
      { code: 'SI-UI', name: 'Sistemas de Informação' },
      admin,
    );
  const coordinator = await call(
    '/api/v1/admin/coordinators',
    { name: 'Coordenação de Teste', email: coordinatorEmail, courseIds: [courseA.id] },
    admin,
  );
  await call('/api/v1/auth/invites/accept', { token: coordinator.inviteToken, password });
  const coordinatorHeaders = await login(coordinatorEmail);
  const competency = await call(
    '/api/v1/admin/competencies',
    { code: 'CIV-UI', name: 'Direito Civil', active: true },
    admin,
  );
  const criteria = {
    status: 'REVIEWED',
    mandatoryKnowledge: [{ competencyId: competency.id, minLevel: 2 }],
    desiredKnowledge: [{ competencyId: competency.id, weight: 1, targetLevel: 3 }],
    minimumEducation: null,
    relevantCompetencyIds: [competency.id],
    minimumTeachingSemesters: 0,
    minimumProfessionalMonths: 0,
    score: {
      knowledgeWeight: 60,
      teachingWeight: 25,
      professionalWeight: 15,
      teachingCapSemesters: 4,
      professionalCapMonths: 24,
    },
  };
  const subjectA = await call(
      `/api/v1/courses/${courseA.id}/subjects`,
      { code: 'CIV-UI', name: 'Direito Civil I', active: true, criteria },
      admin,
    ),
    subjectB = await call(
      `/api/v1/courses/${courseB.id}/subjects`,
      { code: 'SI-UI', name: 'Ética e Legislação', active: true, criteria },
      admin,
    );
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const first = new Date(`${localDay}T12:00:00Z`);
  first.setUTCDate(first.getUTCDate() + ((8 - (first.getUTCDay() || 7)) % 7 || 7));
  const from = first.toISOString().slice(0, 10);
  first.setUTCDate(first.getUTCDate() + 27);
  const until = first.toISOString().slice(0, 10);
  const blocks = [1, 2].map((weekday) => ({
    weekday,
    startsAt: '18:30',
    endsAt: '19:20',
    shift: 'NIGHT',
  }));
  const period = await call(
    '/api/v1/admin/periods',
    {
      code: 'UI-PERIOD',
      name: 'Período de Teste',
      active: true,
      startsOn: from,
      endsOn: until,
      timeZone: 'America/Fortaleza',
      calendarStatus: 'REVIEWED',
      blocks,
    },
    admin,
  );
  const group = await call(
    `/api/v1/courses/${courseA.id}/groups`,
    { code: 'DIR-UI-1', name: 'Direito · Turma 1', active: true, periodId: period.id },
    admin,
  );
  const meeting = {
    id: randomUUID(),
    weekday: 1,
    startsAt: '18:30',
    endsAt: '19:20',
    validFrom: from,
    validUntil: until,
  };
  const offering = await call(
    `/api/v1/courses/${courseA.id}/offerings`,
    {
      code: 'CIV-OF-UI',
      name: 'Direito Civil I · Turma 1',
      active: true,
      periodId: period.id,
      subjectId: subjectA.id,
      groupId: group.id,
      meetings: [meeting],
    },
    admin,
  );
  const registration = await call('/api/v1/auth/register', {
    name: 'Docente de Teste',
    email: teacherEmail,
    password,
  });
  await call('/api/v1/auth/verify-email', {
    token: messages.filter((m) => m.email === teacherEmail).at(-1)!.token,
  });
  const teacher = await login(teacherEmail);
  const profile: ProfileData = {
    contact: { phone: '83999990000' },
    education: [
      {
        id: randomUUID(),
        level: 'MASTER',
        field: 'Direito',
        institution: 'Instituição de Teste',
        completedYear: 2020,
      },
    ],
    knowledge: [{ id: randomUUID(), competencyId: competency.id, level: 3 }],
    teaching: { status: 'NONE', entries: [] },
    professional: { status: 'NONE', entries: [] },
    availability: {
      status: 'PROVIDED',
      timeZone: 'America/Fortaleza',
      windows: [1, 2].map((weekday) => ({
        id: randomUUID(),
        weekday,
        startsAt: '18:00',
        endsAt: '21:00',
        validFrom: from,
        validUntil: until,
      })),
    },
    desiredWeeklyMinutes: 600,
  };
  await call('/api/v1/me/profile', { expectedVersion: 0, data: profile }, teacher, 'PUT');
  const application = await call(
    `/api/v1/me/applications/${courseA.id}`,
    { expectedVersion: 0, profileVersion: 1, subjectIds: [subjectA.id] },
    teacher,
  );
  await call(
    `/api/v1/courses/${courseA.id}/applications/${application.id}/review`,
    {
      expectedVersion: 1,
      profileVersion: 1,
      decision: 'APPROVED',
      reason: 'Fixture sintética, sem homologação institucional',
      items: [...profile.education!, ...profile.knowledge!].map((i) => ({
        id: i.id,
        status: 'CONFIRMED',
      })),
    },
    coordinatorHeaders,
  );
  await call(
    `/api/v1/admin/teachers/${registration.user.id}/workload`,
    {
      expectedVersion: 0,
      weeklyMinutes: 1200,
      validFrom: from,
      validUntil: until,
      timeZone: 'America/Fortaleza',
    },
    admin,
    'PUT',
  );
  return {
    app,
    database,
    identity,
    messages,
    adminEmail,
    coordinatorEmail,
    teacherEmail,
    password,
    courseA,
    courseB,
    competency,
    subjectA,
    subjectB,
    period,
    group,
    offering,
    profile,
    meeting,
    from,
    until,
    teacherId: registration.user.id as string,
    admin,
    coordinatorHeaders,
    teacher,
    login,
    call,
    async close() {
      await app.close();
      await database.close();
      await replica.stop();
    },
  };
}
