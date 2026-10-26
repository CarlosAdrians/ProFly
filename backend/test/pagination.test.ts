import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createUiFixture } from './ui-fixture.js';
import { entity } from '../src/shared/model.js';
import type { Document } from 'mongodb';
type TestRecord = Document & { _id: string };
let f: Awaited<ReturnType<typeof createUiFixture>>;
before(async () => {
  f = await createUiFixture();
});
after(async () => {
  await f?.close();
});

async function collect(path: string, headers: Record<string, string>, limit = 7) {
  const seen = new Set<string>();
  let offset: number | null = 0;
  do {
    const page: { items: { id: string }[]; nextOffset: number | null } = await f.call(
      `${path}${path.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`,
      undefined,
      headers,
    );
    assert.ok(page.items.length <= limit);
    for (const item of page.items) {
      assert.ok(!seen.has(item.id));
      seen.add(item.id);
    }
    assert.ok(page.nextOffset === null || page.nextOffset > offset!);
    offset = page.nextOffset;
  } while (offset !== null);
  return seen;
}

test('CASE-066: catalogos e usuarios paginam com desempate e nao fingem vinculo de coordenacao', async () => {
  const courses = Array.from({ length: 23 }, (_, i) => ({
    ...entity(),
    code: `PAGE-${i}`,
    name: 'Curso de teste',
    active: true,
  }));
  await f.database.db.collection<TestRecord>('courses').insertMany(courses);
  const seen = await collect('/api/v1/catalog/courses', {});
  assert.equal(seen.size, 25);
  assert.equal((await collect('/api/v1/admin/courses', f.admin)).size, 25);
  const own = await f.call('/api/v1/courses', undefined, f.teacher);
  assert.equal(own.items.length, 1);
  assert.deepEqual(own.items[0].roles, ['teacher']);
  const administration = await f.call('/api/v1/courses', undefined, f.admin);
  assert.ok(administration.items.every((item: { roles: string[] }) => item.roles.length === 0));
  const users = await f.call('/api/v1/admin/users?limit=1', undefined, f.admin);
  assert.equal(users.items.length, 1);
  assert.equal(users.nextOffset, 1);
  assert.ok(!JSON.stringify(users).includes('passwordHash'));
  assert.equal((await collect('/api/v1/admin/users', f.admin, 1)).size, 3);
  assert.equal(
    (await f.app.inject({ url: '/api/v1/admin/users', headers: f.teacher })).statusCode,
    403,
  );
  assert.equal((await f.app.inject('/api/v1/catalog/courses?limit=201')).statusCode, 422);
  assert.equal((await f.app.inject('/api/v1/catalog/courses?offset=-1')).statusCode, 422);
  assert.equal((await f.app.inject('/api/v1/catalog/courses?courseId=forged')).statusCode, 422);
});

test('CASE-066: docentes, solicitacoes e competencias paginadas mantem o curso antes do limite', async () => {
  const users = Array.from({ length: 17 }, (_, i) => ({
    ...entity(),
    name: 'Docente sintetico',
    email: `page-${i}@profly.test`,
    roles: ['teacher'],
    state: i === 16 ? 'DISABLED' : 'ACTIVE',
  }));
  await f.database.db.collection<TestRecord>('users').insertMany(users);
  await f.database.db.collection<TestRecord>('memberships').insertMany(
    users.map((user, i) => ({
      ...entity(),
      userId: user._id,
      courseId: i === 15 ? f.courseB.id : f.courseA.id,
      role: 'teacher',
      active: true,
    })),
  );
  await f.database.db.collection<TestRecord>('applications').insertMany(
    users.map((user, i) => ({
      ...entity(),
      teacherId: user._id,
      courseId: i === 15 ? f.courseB.id : f.courseA.id,
      profileVersion: 1,
      subjectIds: [f.subjectA.id],
      status: 'SUBMITTED',
    })),
  );
  const seen = await collect(`/api/v1/courses/${f.courseA.id}/teachers`, f.coordinatorHeaders);
  assert.equal(seen.size, 16); // 15 active new teachers plus the approved fixture teacher.
  assert.ok(!seen.has(users[15]!._id));
  assert.ok(!seen.has(users[16]!._id));
  assert.equal(
    (await collect(`/api/v1/courses/${f.courseA.id}/applications`, f.coordinatorHeaders)).size,
    17,
  );
  assert.equal((await collect('/api/v1/me/applications', f.teacher)).size, 1);
  assert.equal(
    (
      await f.app.inject({
        url: `/api/v1/courses/${f.courseB.id}/teachers`,
        headers: f.coordinatorHeaders,
      })
    ).statusCode,
    404,
  );
  const competencies = Array.from({ length: 13 }, (_, i) => ({
    ...entity(),
    code: `PAGE-C-${i}`,
    name: 'Conhecimento sintetico',
    active: true,
  }));
  await f.database.db.collection<TestRecord>('competencies').insertMany(competencies);
  assert.equal((await collect('/api/v1/catalog/competencies', {})).size, 14);
  assert.equal((await collect('/api/v1/admin/competencies', f.admin)).size, 14);
});

test('CASE-066: notificacoes e ausencias paginam sem dados de outro titular ou decisoes de outro curso', async () => {
  const before = await f.database.db
    .collection<TestRecord>('notices')
    .countDocuments({ userId: f.teacherId, read: false });
  const own = Array.from({ length: 205 }, () => ({
    ...entity(),
    userId: f.teacherId,
    read: false,
    kind: 'SCHEDULE',
    title: 'Aviso sintetico',
    resourceId: crypto.randomUUID(),
  }));
  await f.database.db.collection<TestRecord>('notices').insertMany([
    ...own,
    {
      ...entity(),
      userId: crypto.randomUUID(),
      read: false,
      kind: 'SCHEDULE',
      title: 'Aviso alheio',
      resourceId: crypto.randomUUID(),
    },
  ]);
  const first = await f.call('/api/v1/me/notifications', undefined, f.teacher);
  assert.equal(first.items.length, 100);
  assert.equal(first.unreadCount, before + 205);
  assert.equal(first.nextOffset, 100);
  assert.equal((await collect('/api/v1/me/notifications', f.teacher, 37)).size, before + 205);
  const absences = Array.from({ length: 15 }, () => ({
    ...entity(),
    teacherId: f.teacherId,
    startsOn: f.from,
    endsOn: f.until,
    courseIds: [f.courseA.id, f.courseB.id],
    decisions: {
      [f.courseA.id]: { status: 'SUBMITTED' },
      [f.courseB.id]: { status: 'ACCEPTED' },
    },
  }));
  await f.database.db.collection<TestRecord>('absences').insertMany(absences);
  assert.equal((await collect('/api/v1/me/absences', f.teacher)).size, 15);
  assert.equal(
    (await collect(`/api/v1/courses/${f.courseA.id}/absences`, f.coordinatorHeaders)).size,
    15,
  );
  const scoped = await f.call(
    `/api/v1/courses/${f.courseA.id}/absences?limit=1`,
    undefined,
    f.coordinatorHeaders,
  );
  assert.deepEqual(Object.keys(scoped.items[0].decisions), [f.courseA.id]);
  assert.ok(!('courseIds' in scoped.items[0]));
});

test('CASE-066: planejamento grande recusa truncamento e oferece periodo e listagens paginadas', async () => {
  const overflowPeriod = crypto.randomUUID();
  const rows = Array.from({ length: 501 }, () => ({
    ...entity(),
    courseId: f.courseA.id,
    periodId: overflowPeriod,
    offeringId: f.offering.id,
    teacherId: f.teacherId,
    subjectId: f.subjectA.id,
    groupId: f.group.id,
    state: 'DRAFT',
    meetings: [],
    slots: [],
  }));
  await f.database.db.collection<TestRecord>('allocations').insertMany(rows);
  const full = await f.app.inject({
    url: `/api/v1/courses/${f.courseA.id}/planning`,
    headers: f.coordinatorHeaders,
  });
  assert.equal(full.statusCode, 422);
  assert.equal(full.json().error.code, 'PLANNING_LIMIT');
  const scoped = await f.call(
    `/api/v1/courses/${f.courseA.id}/planning?periodId=${f.period.id}`,
    undefined,
    f.coordinatorHeaders,
  );
  assert.deepEqual(scoped.allocations, []);
  assert.equal(
    (
      await collect(
        `/api/v1/courses/${f.courseA.id}/allocations?periodId=${overflowPeriod}`,
        f.coordinatorHeaders,
        100,
      )
    ).size,
    501,
  );
  for (const resource of ['allocations', 'published-allocations', 'plans']) {
    assert.equal(
      (
        await f.app.inject({
          url: `/api/v1/courses/${f.courseB.id}/${resource}`,
          headers: f.coordinatorHeaders,
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (
        await f.app.inject({
          url: `/api/v1/courses/${f.courseA.id}/${resource}`,
          headers: f.teacher,
        })
      ).statusCode,
      403,
    );
  }
  const occurrences = Array.from({ length: 17 }, () => ({
    ...entity(),
    allocationId: crypto.randomUUID(),
    teacherId: f.teacherId,
    courseId: f.courseA.id,
    periodId: f.period.id,
    subjectId: f.subjectA.id,
    groupId: f.group.id,
    date: f.from,
    startsAt: `${f.from}T21:30:00Z`,
    endsAt: `${f.from}T22:20:00Z`,
    minutes: 50,
    status: 'PLANNED',
    courseName: 'Direito',
    subjectName: 'Materia sintetica',
    groupName: 'Turma sintetica',
  }));
  await f.database.db.collection<TestRecord>('occurrences').insertMany(occurrences);
  assert.equal(
    (
      await collect(
        `/api/v1/courses/${f.courseA.id}/occurrences?from=${f.from}&until=${f.until}`,
        f.coordinatorHeaders,
      )
    ).size,
    17,
  );
});

test('CASE-007/045/046: historico reune cursos, ultimas dez e cursores empatados sem aceitar outro titular', async () => {
  const rows = Array.from({ length: 16 }, (_, i) => ({
    ...entity(),
    teacherId: f.teacherId,
    allocationId: crypto.randomUUID(),
    courseId: i % 2 ? f.courseB.id : f.courseA.id,
    subjectId: i % 2 ? f.subjectB.id : f.subjectA.id,
    groupId: crypto.randomUUID(),
    periodId: f.period.id,
    startsAt: '2020-01-06T11:00:00.000Z',
    endsAt: '2020-01-06T11:50:00.000Z',
    date: '2020-01-06',
    minutes: 50,
    status: 'PLANNED',
    courseName: i % 2 ? 'Sistemas' : 'Direito',
    subjectName: 'Disciplina historica sintetica',
    groupName: 'Turma historica sintetica',
  }));
  await f.database.db.collection<TestRecord>('occurrences').insertMany(rows);
  const first = await f.call('/api/v1/me/history', undefined, f.teacher);
  assert.equal(first.items.length, 10);
  assert.equal(new Set(first.items.map((item: { courseId: string }) => item.courseId)).size, 2);
  assert.ok(first.items.every((item: { status: string }) => item.status === 'PLANNED'));
  const second = await f.call(
    `/api/v1/me/history?before=${encodeURIComponent(first.next.before)}&cursorId=${first.next.cursorId}`,
    undefined,
    f.teacher,
  );
  assert.equal(second.items.length, 6);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 16);
  assert.equal(
    (
      await f.app.inject({
        url: `/api/v1/me/history?teacherId=${crypto.randomUUID()}`,
        headers: f.teacher,
      })
    ).statusCode,
    422,
  );
});
