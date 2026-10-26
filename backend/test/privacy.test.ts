import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createUiFixture } from './ui-fixture.js';
import { loadPrivacyConfig } from '../src/privacy/config.js';
import { entity } from '../src/shared/model.js';
import type { PrivacyRequest } from '../src/privacy/routes.js';
let fixture: Awaited<ReturnType<typeof createUiFixture>>;
before(async () => {
  fixture = await createUiFixture();
});
after(async () => {
  await fixture?.close();
});

test('CASE-057: configuracao conservadora bloqueia saude e producao sem politica', () => {
  assert.equal(loadPrivacyConfig({}, 'development').healthUploads, 'BLOCKED');
  assert.throws(() => loadPrivacyConfig({}, 'production'));
  assert.throws(() => loadPrivacyConfig({ PRIVACY_HEALTH_UPLOADS_ENABLED: 'true' }, 'development'));
  assert.equal(
    loadPrivacyConfig({ PRIVACY_HEALTH_UPLOADS_ENABLED: 'true' }, 'test').healthUploads,
    'SYNTHETIC_ONLY',
  );
  const approved = {
    PRIVACY_APPROVED: 'true',
    PRIVACY_CONTROLLER: 'Instituicao Ficticia',
    PRIVACY_CONTACT_EMAIL: 'privacidade@profly.test',
    PRIVACY_RETENTION_NOTICE: 'Politica sintetica de retencao aprovada apenas no teste.',
    PRIVACY_PROCESSING_BASIS: 'Fundamentacao sintetica por finalidade para este teste.',
  };
  assert.equal(loadPrivacyConfig(approved, 'production').healthUploads, 'BLOCKED');
  assert.throws(() =>
    loadPrivacyConfig({ ...approved, PRIVACY_HEALTH_UPLOADS_ENABLED: 'true' }, 'production'),
  );
  assert.equal(
    loadPrivacyConfig(
      {
        ...approved,
        PRIVACY_HEALTH_UPLOADS_ENABLED: 'true',
        PRIVACY_HEALTH_BASIS: 'Fundamentacao sintetica especifica de saude no teste.',
      },
      'production',
    ).healthUploads,
    'ENABLED',
  );
});
test('CASE-058: protocolo autentica, valida CSRF e impede falsificar titular', async () => {
  const payload = { kind: 'ACCESS', message: 'Solicito declaracao completa dos meus dados.' };
  assert.equal(
    (await fixture.app.inject({ method: 'POST', url: '/api/v1/me/privacy/requests', payload }))
      .statusCode,
    401,
  );
  assert.equal(
    (
      await fixture.app.inject({
        method: 'POST',
        url: '/api/v1/me/privacy/requests',
        headers: { cookie: fixture.teacher.cookie },
        payload,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await fixture.app.inject({
        method: 'POST',
        url: '/api/v1/me/privacy/requests',
        headers: fixture.teacher,
        payload: { ...payload, userId: fixture.adminEmail },
      })
    ).statusCode,
    422,
  );
  const response = await fixture.app.inject({
    method: 'POST',
    url: '/api/v1/me/privacy/requests',
    headers: fixture.teacher,
    payload,
  });
  assert.equal(response.statusCode, 201);
  const record = response.json();
  assert.equal(record.userId, fixture.teacherId);
  assert.equal(record.status, 'OPEN');
  assert.ok(
    Math.abs(Date.parse(record.accessDueAt) - Date.parse(record.createdAt) - 15 * 86400000) < 1000,
  );
  assert.equal(response.headers['cache-control'], 'no-store');
  const coordinator = await fixture.login(fixture.coordinatorEmail);
  const others = await fixture.call('/api/v1/me/privacy/requests', undefined, coordinator);
  assert.equal(others.items.length, 0);
  assert.equal(
    (
      await fixture.app.inject({
        url: '/api/v1/me/privacy/requests?userId=' + fixture.teacherId,
        headers: coordinator,
      })
    ).statusCode,
    422,
  );
  assert.equal(
    (await fixture.app.inject({ url: '/api/v1/admin/privacy/requests', headers: coordinator }))
      .statusCode,
    403,
  );
});
test('CASE-059: resposta exige administrador, versao e preserva historico sob concorrencia', async () => {
  const record = await fixture.call(
    '/api/v1/me/privacy/requests',
    { kind: 'ERASURE', message: 'Solicito analise de eliminacao dos meus dados.' },
    fixture.teacher,
  );
  assert.equal(record.accessDueAt, null);
  const url = `/api/v1/admin/privacy/requests/${record.id}`;
  const payload = {
    expectedVersion: 1,
    status: 'RESPONDED',
    response: 'Solicitacao analisada neste teste, sem executar exclusao de dados.',
  };
  assert.equal(
    (await fixture.app.inject({ method: 'PATCH', url, headers: fixture.teacher, payload }))
      .statusCode,
    403,
  );
  const race = await Promise.all(
    [1, 2].map(() => fixture.app.inject({ method: 'PATCH', url, headers: fixture.admin, payload })),
  );
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  const stored = await fixture.database.db
    .collection<PrivacyRequest>('privacyRequests')
    .findOne({ _id: record.id });
  assert.equal(stored!.events.length, 2);
  assert.equal(stored!.version, 2);
  assert.equal(
    (
      await fixture.app.inject({
        method: 'PATCH',
        url,
        headers: fixture.admin,
        payload: { ...payload, expectedVersion: 2 },
      })
    ).statusCode,
    409,
  );
  assert.ok(await fixture.identity.users.findOne({ _id: fixture.teacherId, state: 'ACTIVE' }));
  assert.equal(
    await fixture.database.db
      .collection('audit')
      .countDocuments({ action: 'PRIVACY_REQUEST_RESPONDED', resourceId: record.id }),
    1,
  );
});
test('CASE-060: exportacao exige senha e nao contem credenciais nem dados de outro titular', async () => {
  await fixture.database.db
    .collection<{ _id: string; data: unknown }>('profiles')
    .insertOne({ _id: 'foreign-user', data: { secret: 'FOREIGN_PERSON_SENTINEL' } });
  await fixture.database.db
    .collection<{ _id: string; userId: string; title: string }>('notices')
    .insertOne({ ...entity(), userId: 'foreign-user', title: 'FOREIGN_PERSON_SENTINEL' });
  await fixture.database.db
    .collection<{ _id: string } & Record<string, unknown>>('legalAcceptances')
    .insertOne({
      ...entity(),
      userId: fixture.teacherId,
      version: 'historical-test-version',
      termsAccepted: true,
      privacyAcknowledged: true,
      acceptedAt: new Date().toISOString(),
    });
  const url = '/api/v1/me/privacy/export';
  assert.equal(
    (
      await fixture.app.inject({
        method: 'POST',
        url,
        headers: fixture.teacher,
        payload: { currentPassword: 'wrong' },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await fixture.app.inject({
        method: 'POST',
        url,
        headers: { cookie: fixture.teacher.cookie },
        payload: { currentPassword: fixture.password },
      })
    ).statusCode,
    403,
  );
  const response = await fixture.app.inject({
    method: 'POST',
    url,
    headers: fixture.teacher,
    payload: { currentPassword: fixture.password },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().account.id, fixture.teacherId);
  assert.match(String(response.headers['content-disposition']), /attachment/);
  assert.equal(response.headers['cache-control'], 'no-store');
  for (const secret of [
    'passwordHash',
    'tokenHash',
    'csrfToken',
    fixture.password,
    'FOREIGN_PERSON_SENTINEL',
    fixture.adminEmail,
  ])
    assert.ok(!response.body.includes(secret), secret);
  assert.equal(response.json().datasets.profiles.length, 1);
  assert.equal(response.json().datasets.legalAcceptances.length, 1);
  assert.equal(response.json().datasets.legalAcceptances[0].version, 'historical-test-version');
  assert.equal(
    await fixture.database.db
      .collection('audit')
      .countDocuments({ action: 'PRIVACY_DATA_EXPORTED', actorId: fixture.teacherId }),
    1,
  );
});
test('CASE-061: paginacao mantem empate de datas e escopo e recusa cursor invalido', async () => {
  const at = '2026-01-01T00:00:00.000Z';
  await fixture.database.db.collection<PrivacyRequest>('privacyRequests').insertMany(
    Array.from({ length: 55 }, () => ({
      ...entity(),
      createdAt: at,
      userId: fixture.teacherId,
      kind: 'CORRECTION',
      message: 'Registro sintetico de paginacao.',
      status: 'OPEN',
      accessDueAt: null,
      events: [],
    })),
  );
  const first = await fixture.call('/api/v1/me/privacy/requests', undefined, fixture.teacher);
  assert.equal(first.items.length, 50);
  assert.ok(first.nextCursor);
  const second = await fixture.call(
    '/api/v1/me/privacy/requests?cursor=' + first.nextCursor,
    undefined,
    fixture.teacher,
  );
  assert.equal(first.items.length + second.items.length, 57);
  assert.equal(new Set([...first.items, ...second.items].map((r) => r.id)).size, 57);
  assert.equal(
    (
      await fixture.app.inject({
        url: '/api/v1/me/privacy/requests?cursor=not-json',
        headers: fixture.teacher,
      })
    ).statusCode,
    422,
  );
});
test('CASE-062: bloqueio de dados de saude ocorre no servidor antes de armazenar arquivo', async () => {
  const absence = await fixture.call(
    '/api/v1/me/absences',
    { startsOn: fixture.from, endsOn: fixture.from, courseIds: [fixture.courseA.id] },
    fixture.teacher,
  );
  const previous = fixture.identity.config.privacy.healthUploads;
  fixture.identity.config.privacy.healthUploads = 'BLOCKED';
  try {
    const response = await fixture.app.inject({
      method: 'POST',
      url: `/api/v1/me/absences/${absence.id}/attachment`,
      headers: fixture.teacher,
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'HEALTH_UPLOADS_DISABLED');
    assert.equal(
      await fixture.database.db.collection('certificates').countDocuments({ _id: absence.id }),
      0,
    );
  } finally {
    fixture.identity.config.privacy.healthUploads = previous;
  }
});

test('CASE-060: exportacao excessiva e recusada sem truncar ou registrar sucesso', async () => {
  await fixture.database.db
    .collection<{ _id: string; userId: string; title: string }>('notices')
    .insertMany(
      Array.from({ length: 5001 }, () => ({
        ...entity(),
        userId: fixture.teacherId,
        title: 'Aviso sintetico de limite de exportacao.',
      })),
    );
  const response = await fixture.app.inject({
    method: 'POST',
    url: '/api/v1/me/privacy/export',
    headers: fixture.teacher,
    payload: { currentPassword: fixture.password },
  });
  assert.equal(response.statusCode, 413);
  assert.equal(response.json().error.code, 'EXPORT_TOO_LARGE');
  assert.equal(
    await fixture.database.db
      .collection('audit')
      .countDocuments({ action: 'PRIVACY_DATA_EXPORTED', actorId: fixture.teacherId }),
    1,
  );
});
