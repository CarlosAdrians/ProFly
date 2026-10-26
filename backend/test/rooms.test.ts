import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createUiFixture } from './ui-fixture.js';
import { entity } from '../src/shared/model.js';
import type { Actor, Membership, User, Session } from '../src/identity/models.js';
import type { TeacherProfile, Review } from '../src/teachers/models.js';
import type { Workload } from '../src/scheduling/models.js';
import { SchedulingService } from '../src/scheduling/service.js';

test('CASE-069: sala valida, normalizada e reservada globalmente mesmo com outro professor, turma, curso e periodo', async () => {
  const f = await createUiFixture();
  try {
    const base = `/api/v1/courses/${f.courseA.id}`;
    const data = { offeringId: f.offering.id, teacherId: f.teacherId, meetings: [f.meeting] };
    for (const room of ['', ' ', 201, { $ne: null }, 'x'.repeat(81), '<script>', '201\n202']) {
      const response = await f.app.inject({
        method: 'POST',
        url: `${base}/allocations`,
        headers: f.coordinatorHeaders,
        payload: { ...data, room },
      });
      assert.equal(response.statusCode, 422);
    }
    // Independent synthetic candidate: no teacher or group conflict can mask a room conflict.
    const other = randomUUID();
    const user = await f.identity.users.findOne({ _id: f.teacherId });
    await f.identity.users.insertOne({
      ...user!,
      ...entity(other),
      email: 'sala.outro@profly.test',
    });
    await f.database.db
      .collection<{ _id: string; version: number }>('guards')
      .insertOne({ _id: `user:${other}`, version: 0 });
    await f.identity.memberships.insertOne({
      ...entity(),
      userId: other,
      courseId: f.courseB.id,
      role: 'teacher',
      active: true,
    } satisfies Membership);
    const profile = await f.database.db
      .collection<TeacherProfile>('profiles')
      .findOne({ _id: f.teacherId });
    await f.database.db
      .collection<TeacherProfile>('profiles')
      .insertOne({ ...profile!, _id: other });
    const workload = await f.database.db
      .collection<Workload>('workloads')
      .findOne({ _id: f.teacherId });
    await f.database.db
      .collection<Workload>('workloads')
      .insertOne({ ...workload!, _id: other, teacherId: other });
    const review = await f.database.db
      .collection<Review>('reviews')
      .findOne({ teacherId: f.teacherId });
    await f.database.db.collection<Review>('reviews').insertOne({
      ...review!,
      ...entity(),
      teacherId: other,
      courseId: f.courseB.id,
      subjectIds: [f.subjectB.id],
    });
    const period = await f.call(
      '/api/v1/admin/periods',
      {
        code: 'ROOM-OTHER',
        name: 'Periodo sobreposto de teste',
        active: true,
        startsOn: f.from,
        endsOn: f.until,
        timeZone: 'America/Fortaleza',
        calendarStatus: 'REVIEWED',
        blocks: f.period.blocks,
      },
      f.admin,
    );
    const group = await f.call(
      `/api/v1/courses/${f.courseB.id}/groups`,
      { code: 'ROOM-GROUP', name: 'Outra turma de teste', active: true, periodId: period.id },
      f.admin,
    );
    const offering = await f.call(
      `/api/v1/courses/${f.courseB.id}/offerings`,
      {
        code: 'ROOM-OFFERING',
        name: 'Outra oferta de teste',
        active: true,
        periodId: period.id,
        groupId: group.id,
        subjectId: f.subjectB.id,
        meetings: [{ ...f.meeting, id: randomUUID() }],
      },
      f.admin,
    );
    const otherData = {
      offeringId: offering.id,
      teacherId: other,
      meetings: offering.meetings,
      room: 'sAlA  201',
    };
    const raced = await Promise.all([
      f.app.inject({
        method: 'POST',
        url: `${base}/allocations`,
        headers: f.coordinatorHeaders,
        payload: { ...data, room: ' 201 ' },
      }),
      f.app.inject({
        method: 'POST',
        url: `/api/v1/courses/${f.courseB.id}/allocations`,
        headers: f.admin,
        payload: otherData,
      }),
    ]);
    assert.deepEqual(raced.map((r) => r.statusCode).sort(), [201, 409]);
    const winner = raced.find((r) => r.statusCode === 201)!.json();
    assert.equal(winner.roomKey, '201');
    assert.ok(['201', 'sAlA 201'].includes(winner.room));
    const loser = raced.find((r) => r.statusCode === 409)!.json();
    assert.equal(loser.error.code, 'ALLOCATION_NOT_ELIGIBLE');
    assert.ok(
      loser.error.fieldErrors.eligibility.some((s: string) => s.includes('Sala informada ocupada')),
    );
    // A different room is allowed; scoring factors remain academic and unchanged.
    const assessed = await f.call(
      `${base}/eligibility`,
      {
        ...data,
        room: 'Laboratório 2',
        ...(winner.courseId === f.courseA.id ? { allocationId: winner.id } : {}),
      },
      f.coordinatorHeaders,
    );
    assert.equal(assessed.eligibility, 'ELIGIBLE');
    assert.equal(assessed.score.value, 60);
    assert.equal(assessed.checks.find((c: { id: string }) => c.id === 'room').state, 'PASS');
    const comparison = await f.call(
      `${base}/recommendations`,
      {
        offeringId: f.offering.id,
        meetings: [f.meeting],
        room: 'SALA 201',
        ...(winner.courseId === f.courseA.id ? { allocationId: winner.id } : {}),
      },
      f.coordinatorHeaders,
    );
    assert.equal(
      comparison.items[0].checks.find((c: { id: string }) => c.id === 'room').state,
      winner.courseId === f.courseA.id ? 'PASS' : 'FAIL',
    );
    assert.equal(await f.database.db.collection('allocations').countDocuments(), 1);
    const anotherDay = await f.call(
      `${base}/eligibility`,
      { ...data, meetings: [{ ...f.meeting, weekday: 2 }], room: '201' },
      f.coordinatorHeaders,
    );
    assert.equal(anotherDay.eligibility, 'ELIGIBLE');
    const winnerBase = `/api/v1/courses/${winner.courseId}`;
    let plan = (await f.call(`${winnerBase}/planning`, undefined, f.admin)).plans[0];
    await f.call(
      `${winnerBase}/periods/${winner.periodId}/publish`,
      { expectedVersion: plan.version },
      f.admin,
    );
    const published = await f.database.db
      .collection<{ _id: string; version: number }>('allocations')
      .findOne({ _id: winner.id });
    await f.call(
      `${winnerBase}/allocations/${winner.id}`,
      { expectedVersion: published!.version },
      f.admin,
      'DELETE',
    );
    const targetBase = winner.courseId === f.courseA.id ? `/api/v1/courses/${f.courseB.id}` : base;
    const targetData = winner.courseId === f.courseA.id ? otherData : { ...data, room: '201' };
    const held = await f.app.inject({
      method: 'POST',
      url: `${targetBase}/allocations`,
      headers: f.admin,
      payload: targetData,
    });
    assert.equal(held.statusCode, 409); // Published room stays reserved after draft cancellation.
    plan = (await f.call(`${winnerBase}/planning`, undefined, f.admin)).plans[0];
    await f.call(
      `${winnerBase}/periods/${winner.periodId}/publish`,
      { expectedVersion: plan.version },
      f.admin,
    );
    const released = await f.app.inject({
      method: 'POST',
      url: `${targetBase}/allocations`,
      headers: f.admin,
      payload: targetData,
    });
    assert.equal(released.statusCode, 201, released.body);
  } finally {
    await f.close();
  }
});

test('CASE-070: sala aparece somente ao publicar e republicacao preserva o local das aulas passadas', async () => {
  const f = await createUiFixture();
  try {
    const base = `/api/v1/courses/${f.courseA.id}`;
    const input = {
      offeringId: f.offering.id,
      teacherId: f.teacherId,
      meetings: [f.meeting],
      room: '201',
    };
    const record = await f.call(`${base}/allocations`, input, f.coordinatorHeaders);
    assert.equal(
      (await f.call(`/api/v1/me/schedule?from=${f.from}&until=${f.until}`, undefined, f.teacher))
        .items.length,
      0,
    );
    let plan = (await f.call(`${base}/planning`, undefined, f.coordinatorHeaders)).plans[0];
    await f.call(
      `${base}/periods/${f.period.id}/publish`,
      { expectedVersion: plan.version },
      f.coordinatorHeaders,
    );
    const before = (
      await f.call(`/api/v1/me/schedule?from=${f.from}&until=${f.until}`, undefined, f.teacher)
    ).items;
    assert.ok(before.length >= 2);
    assert.ok(before.every((o: { room: string }) => o.room === '201'));
    const user = await f.identity.users.findOne({ email: f.coordinatorEmail });
    const session = await f.database.db
      .collection<Session>('sessions')
      .findOne({ userId: user!._id });
    const actor: Actor = { user: user as User, session: session! };
    let clock = new Date(new Date(before[0].startsAt).getTime() + 1000);
    const service = new SchedulingService(f.identity, () => clock);
    let stored = await service.allocations.findOne({ _id: record.id });
    const changed = await service.save(
      actor,
      f.courseA.id,
      { ...input, room: '202' },
      stored!.version,
      record.id,
    );
    const stillPublished = (
      await f.call(`/api/v1/me/schedule?from=${f.from}&until=${f.until}`, undefined, f.teacher)
    ).items;
    assert.deepEqual(stillPublished, before);
    plan = (await f.call(`${base}/planning`, undefined, f.coordinatorHeaders)).plans[0];
    await service.publish(actor, f.courseA.id, f.period.id, plan.version);
    const after = (
      await f.call(`/api/v1/me/schedule?from=${f.from}&until=${f.until}`, undefined, f.teacher)
    ).items;
    assert.deepEqual(after[0], before[0]);
    assert.ok(after.slice(1).every((o: { room: string }) => o.room === '202'));
    assert.equal(changed.slots[0]?.room, '201');
    assert.ok(changed.slots.slice(1).every((slot) => slot.room === '202'));
    assert.equal(changed.slots[0]?.roomKey, '201');
    assert.equal(
      await service.published.countDocuments({ roomKey: '202', 'slots.roomKey': '201' }),
      1,
    );
    const activeConflict = await service.authorized(actor, f.courseA.id, (session) =>
      service.assessment(f.courseA.id, input, session),
    );
    assert.equal(activeConflict.result.checks.find((check) => check.id === 'room')?.state, 'FAIL');
    clock = new Date(new Date(before[0].endsAt).getTime() + 1000);
    const ended = await service.authorized(actor, f.courseA.id, (session) =>
      service.assessment(f.courseA.id, input, session),
    );
    assert.equal(ended.result.checks.find((check) => check.id === 'room')?.state, 'PASS');

    // Older clients omitting the new field preserve the current room.
    stored = await service.allocations.findOne({ _id: record.id });
    const { room: ignored, ...legacyInput } = input;
    assert.equal(ignored, '201');
    const saved = await service.save(actor, f.courseA.id, legacyInput, stored!.version, record.id);
    assert.equal(saved.room, '202');
    await assert.rejects(service.save(actor, f.courseA.id, input, stored!.version, record.id), {
      code: 'STALE_VERSION',
    });
    assert.equal(after[0].version, before[0].version);
    const removed = await service.save(
      actor,
      f.courseA.id,
      { ...input, room: null },
      saved.version,
      record.id,
    );
    assert.equal(removed.room, null);
    plan = (await f.call(`${base}/planning`, undefined, f.coordinatorHeaders)).plans[0];
    await service.publish(actor, f.courseA.id, f.period.id, plan.version);
    const final = (
      await f.call(`/api/v1/me/schedule?from=${f.from}&until=${f.until}`, undefined, f.teacher)
    ).items;
    assert.deepEqual(final[0], before[0]);
    assert.ok(final.slice(1).every((o: { room: string | null }) => o.room === null));
    const exported = await f.call(
      '/api/v1/me/privacy/export',
      { currentPassword: f.password },
      f.teacher,
    );
    assert.equal(
      exported.datasets.occurrences.find(
        (o: { startsAt: string }) => o.startsAt === before[0].startsAt,
      ).room,
      '201',
    );
  } finally {
    await f.close();
  }
});
