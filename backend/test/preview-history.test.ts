import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUiFixture } from './ui-fixture.js';
import { seedPreviewHistory } from '../src/testing/previewHistory.js';

test('CASE-068: historico sintetico restrito, transacional e idempotente preserva perfil, criterios e aulas existentes', async () => {
  const f = await createUiFixture();
  try {
    const config = f.identity.config;
    const snapshot = async () =>
      JSON.stringify(
        await Promise.all(
          ['profiles', 'subjects', 'applications', 'publishedAllocations'].map((name) =>
            f.database.db.collection(name).find().toArray(),
          ),
        ),
      );
    const allocation = await f.call(
      `/api/v1/courses/${f.courseA.id}/allocations`,
      { offeringId: f.offering.id, teacherId: f.teacherId, meetings: [f.meeting] },
      f.coordinatorHeaders,
    );
    const planning = await f.call(
      `/api/v1/courses/${f.courseA.id}/planning`,
      undefined,
      f.coordinatorHeaders,
    );
    await f.call(
      `/api/v1/courses/${f.courseA.id}/periods/${f.period.id}/publish`,
      { expectedVersion: planning.plans[0].version },
      f.coordinatorHeaders,
    );
    const existingLessons = await f.database.db
      .collection('occurrences')
      .find()
      .sort({ startsAt: 1 })
      .toArray();
    assert.ok(existingLessons.length > 0);
    const before = await snapshot();
    const drafts = await f.database.db.collection('allocations').find().toArray();
    for (const bad of [
      { ...config, environment: 'production' as const },
      { ...config, database: 'institution_test' },
      { ...config, privacy: { ...config.privacy, approved: true } },
      { ...config, mongoUri: 'mongodb://example.com:27017/' },
    ])
      await assert.rejects(seedPreviewHistory(f.database, bad, f.teacherId));
    await assert.rejects(seedPreviewHistory(f.database, config, 'not-the-test-user'));
    assert.equal(
      await f.database.db.collection('occurrences').countDocuments(),
      existingLessons.length,
    );
    assert.deepEqual(await seedPreviewHistory(f.database, config, f.teacherId), {
      created: 5,
      preserved: 0,
    });
    const records = await f.database.db
      .collection('occurrences')
      .find({ date: { $lt: f.from } })
      .sort({ startsAt: 1 })
      .toArray();
    assert.deepEqual(await seedPreviewHistory(f.database, config, f.teacherId), {
      created: 0,
      preserved: 5,
    });
    assert.deepEqual(
      await f.database.db.collection('occurrences').find().sort({ startsAt: 1 }).toArray(),
      [...records, ...existingLessons],
    );
    assert.equal(records.length, 5);
    assert.equal(await snapshot(), before);
    assert.deepEqual(await f.database.db.collection('allocations').find().toArray(), drafts);
    assert.ok(allocation.id);
    const history = await f.call('/api/v1/me/history?limit=20', undefined, f.teacher);
    assert.equal(history.items.length, 5);
    assert.equal(
      history.items.filter((o: { status: string }) => o.status === 'COMPLETED').length,
      3,
    );
    assert.ok(
      records.every((o) => o.teacherId === f.teacherId && o.endsAt < new Date().toISOString()),
    );
    assert.equal(
      await f.database.db
        .collection('audit')
        .countDocuments({ action: 'SYNTHETIC_HISTORY_PREPARED' }),
      1,
    );
  } finally {
    await f.close();
  }
});
