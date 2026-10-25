import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { loadConfig } from '../src/config.js';
import { Database } from '../src/database.js';
import { buildApp } from '../src/app.js';
import { IdentityService } from '../src/identity/service.js';
import type { AccessToken, Notifications, Session, User } from '../src/identity/models.js';
import type { ProfileData } from '../src/teachers/contracts.js';
import { smtpFixture } from './smtpFixture.js';

if (process.env.PROFLY_RUN_INTEGRATION !== '1') {
  throw new Error('Integracao exige PROFLY_RUN_INTEGRATION=1; usa somente MongoDB efemero local.');
}

let replica: MongoMemoryReplSet;
let database: Database;
let app: Awaited<ReturnType<typeof buildApp>>;
let config: ReturnType<typeof loadConfig>;
let identity: IdentityService;
let adminHeaders: Record<string, string>;
let coordinatorHeaders: Record<string, string>;
let courseA: string;
let courseB: string;
let coordinatorInvite: string;
const messages: Parameters<Notifications['send']>[0][] = [];
const notifications: Notifications = {
  async send(message) {
    messages.push(message);
  },
};
const clientAddresses = new Map<string, string>();

test('CASE-004/001: validade exata de uma hora e consumo concorrente', async () => {
  const base = Date.now();
  let time = base;
  const clocked = new IdentityService(database, config, notifications, () => new Date(time));
  const { tokenHash, hashPassword } = await import('../src/shared/crypto.js');
  for (const purpose of ['VERIFY_EMAIL', 'RESET'] as const) {
    for (const elapsed of [3599999, 3600000, 3600001]) {
      time = base;
      const email = `expiry-${purpose.toLowerCase()}-${elapsed}@profly.test`;
      const result = await clocked.register({ name: 'Limite Temporal', email, password: 'ExampleTest2026' });
      const verification = messages.findLast(m => m.email === email)!;
      if (purpose === 'RESET') await clocked.activate(verification.token, 'VERIFY_EMAIL');
      const raw = purpose === 'VERIFY_EMAIL' ? verification.token : await database.transaction(s => clocked.createToken(result.user.id, 'RESET', s));
      const stored = await database.db.collection<AccessToken>('tokens').findOne({ tokenHash: tokenHash(raw) });
      assert.equal(stored!.expiresAt.getTime(), base + 3600000);
      const before = await identity.users.findOne({ _id: result.user.id });
      const sessions = purpose === 'RESET' ? await loginClient(email) : null;
      time = base + elapsed;
      const action = () => purpose === 'RESET' ? clocked.resetPassword(raw, 'synthetic-hash') : clocked.activate(raw, 'VERIFY_EMAIL');
      if (elapsed < 3600000) {
        await action();
        await assert.rejects(action(), { code: 'TOKEN_UNAVAILABLE' });
        if (sessions) assert.equal((await app.inject({ url: '/api/v1/auth/session', headers: sessions })).statusCode, 401);
      } else {
        await assert.rejects(action(), { code: 'TOKEN_UNAVAILABLE' });
        const after = await identity.users.findOne({ _id: result.user.id });
        assert.equal(after!.passwordHash, before!.passwordHash);
        assert.equal(after!.state, before!.state);
        assert.equal((await database.db.collection<AccessToken>('tokens').findOne({ _id: stored!._id }))!.consumedAt, null);
        if (sessions) assert.equal((await app.inject({ url: '/api/v1/auth/session', headers: sessions })).statusCode, 200);
      }
    }
  }
  const teacher = await registerTeacher('reset-race@profly.test');
  const raw = await database.transaction(s => identity.createToken(teacher.id, 'RESET', s));
  const hash = await hashPassword('AnotherTest2026');
  const results = await Promise.allSettled([identity.resetPassword(raw, hash), identity.resetPassword(raw, hash)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await app.inject({ url: '/api/v1/auth/session', headers: teacher.headers })).statusCode, 401);
});

async function loginClient(email: string, password = 'ExampleTest2026') {
  // Separate synthetic people have separate clients. Dedicated abuse tests keep one IP.
  if (!clientAddresses.has(email)) clientAddresses.set(email, `10.0.0.${clientAddresses.size + 1}`);
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
    remoteAddress: clientAddresses.get(email),
  });
  assert.equal(response.statusCode, 200, response.body);
  const raw = response.headers['set-cookie'];
  const cookie = (Array.isArray(raw) ? raw[0] : raw)?.split(';')[0];
  assert.ok(cookie);
  assert.ok(String(raw).includes('HttpOnly'));
  assert.ok(String(raw).includes('SameSite=Strict'));
  return { cookie, 'x-csrf-token': response.json().csrfToken as string };
}

async function registerTeacher(email: string) {
  const registration = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Professor de Teste', email, password: 'ExampleTest2026' },
  });
  assert.equal(registration.statusCode, 201, registration.body);
  const proof = messages.findLast(
    (message) => message.email === email && message.purpose === 'VERIFY_EMAIL',
  );
  assert.ok(proof);
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token: proof.token },
      })
    ).statusCode,
    200,
  );
  return { id: registration.json().user.id as string, headers: await loginClient(email) };
}

before(
  async () => {
    replica = await MongoMemoryReplSet.create({
      binary: { downloadDir: path.resolve('../../../work/mongodb-binaries') },
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: 60000 }],
    });
    config = loadConfig({
      NODE_ENV: 'test',
      MONGODB_URI: replica.getUri(),
      MONGODB_DATABASE: 'profly_integration_test',
      ALLOWED_ORIGINS: 'http://localhost:5173',
    });
    database = new Database(config);
    await database.connect();
    identity = new IdentityService(database, config, notifications);
    await identity.bootstrap('Administrador Teste', 'admin@profly.test', 'ExampleTest2026');
    app = await buildApp(config, database, { notifications });
    await app.ready();
    adminHeaders = await loginClient('admin@profly.test');
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/courses',
      headers: adminHeaders,
      payload: { code: 'DIR', name: 'Direito' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/courses',
      headers: adminHeaders,
      payload: { code: 'SI', name: 'Sistemas de Informacao' },
    });
    assert.equal(first.statusCode, 201, first.body);
    assert.equal(second.statusCode, 201, second.body);
    courseA = first.json().id;
    courseB = second.json().id;
    const coordinator = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/coordinators',
      headers: adminHeaders,
      payload: {
        name: 'Coordenador Teste',
        email: 'coordinator@profly.test',
        courseIds: [courseA],
      },
    });
    assert.equal(coordinator.statusCode, 201, coordinator.body);
    coordinatorInvite = coordinator.json().inviteToken;
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/invites/accept',
          payload: { token: coordinatorInvite, password: 'ExampleTest2026' },
        })
      ).statusCode,
      200,
    );
    coordinatorHeaders = await loginClient('coordinator@profly.test');
  },
  { timeout: 300000 },
);

after(async () => {
  await app?.close();
  await database?.close();
  await replica?.stop();
});

test('CASE-053: readiness depende do MongoDB real, sem fallback em memoria', async () => {
  const live = await app.inject('/health/live');
  assert.equal(live.statusCode, 200);
  assert.equal((await app.inject('/health/ready')).statusCode, 200);
  const other = new Database(
    loadConfig({
      NODE_ENV: 'test',
      MONGODB_URI: replica.getUri(),
      MONGODB_DATABASE: 'profly_closed_test',
      ALLOWED_ORIGINS: 'http://localhost:5173',
    }),
  );
  await other.close();
  const closedApp = await buildApp(
    loadConfig({
      NODE_ENV: 'test',
      MONGODB_URI: replica.getUri(),
      MONGODB_DATABASE: 'profly_closed_test',
      ALLOWED_ORIGINS: 'http://localhost:5173',
    }),
    other,
  );
  try {
    assert.equal((await closedApp.inject('/health/ready')).statusCode, 503);
  } finally {
    await closedApp.close();
  }
});

test('origem externa e recusada e OpenAPI e gerado das rotas reais', async () => {
  assert.equal(
    (
      await app.inject({
        method: 'GET',
        url: '/health/live',
        headers: { origin: 'https://example.test' },
      })
    ).statusCode,
    403,
  );
  const response = await app.inject('/openapi.json');
  assert.equal(response.statusCode, 200);
  assert.ok(response.json().paths['/health/ready']);
});

test('CASE-001/003: autenticacao e campos protegidos passam pelo HTTP real', async () => {
  assert.equal((await app.inject('/api/v1/auth/session')).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'admin@profly.test', password: 'WrongTest2026' },
      })
    ).statusCode,
    401,
  );
  const before = await database.db.collection('users').countDocuments();
  const hostile = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Atacante Teste',
      email: 'hostile@profly.test',
      password: 'ExampleTest2026',
      role: 'admin',
      approved: true,
    },
  });
  assert.equal(hostile.statusCode, 422);
  assert.ok(hostile.json().error.fieldErrors);
  assert.equal(await database.db.collection('users').countDocuments(), before);
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: { $ne: null }, password: 'ExampleTest2026' },
      })
    ).statusCode,
    422,
  );
});

test('CASE-005/006/008: coordenador acessa apenas o curso atribuido e nao cria administracao', async () => {
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/courses/${courseA}/coordinators`,
        headers: coordinatorHeaders,
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/courses/${courseB}/coordinators`,
        headers: coordinatorHeaders,
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/admin/courses',
        headers: coordinatorHeaders,
        payload: { code: 'BAD', name: 'Curso Indevido' },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await app.inject({ url: '/api/v1/courses', headers: coordinatorHeaders })).json().items.length,
    1,
  );
});

test('CSRF e obrigatorio em alteracao autenticada, inclusive com cookie valido', async () => {
  const before = await database.db.collection('courses').countDocuments();
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/admin/courses',
        headers: { cookie: adminHeaders.cookie! },
        payload: { code: 'BAD', name: 'Curso Indevido' },
      })
    ).statusCode,
    403,
  );
  assert.equal(await database.db.collection('courses').countDocuments(), before);
});

test('CASE-004: convite e de uso unico e nao expoe credenciais na consulta', async () => {
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/invites/accept',
        payload: { token: coordinatorInvite, password: 'ExampleTest2026' },
      })
    ).statusCode,
    410,
  );
  const stored = await database.db.collection<AccessToken>('tokens').findOne({ purpose: 'INVITE' });
  assert.ok(stored?.consumedAt);
  assert.ok(!JSON.stringify(stored).includes(coordinatorInvite));
});

test('CASE-009: verificar e-mail nao aprova automaticamente acesso a curso', async () => {
  const email = 'pending@profly.test';
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Professor Pendente', email, password: 'ExampleTest2026' },
  });
  assert.equal(created.statusCode, 201, created.body);
  assert.equal(created.json().user.state, 'PENDING_EMAIL');
  assert.ok(!created.body.includes('passwordHash'));
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'ExampleTest2026' },
      })
    ).statusCode,
    403,
  );
  const verification = messages.findLast(
    (item) => item.email === email && item.purpose === 'VERIFY_EMAIL',
  );
  assert.ok(verification);
  const outcomes = await Promise.all(
    [1, 2].map(() =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token: verification.token },
      }),
    ),
  );
  assert.deepEqual(outcomes.map((item) => item.statusCode).sort(), [200, 410]);
  const headers = await loginClient(email);
  assert.deepEqual((await app.inject({ url: '/api/v1/courses', headers })).json().items, []);
  assert.equal((await app.inject({ url: '/api/v1/admin/users', headers })).statusCode, 403);
});

test('CASE-002: revogar vinculo e desativar conta invalidam operacoes seguintes', async () => {
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/coordinators',
    headers: adminHeaders,
    payload: { name: 'Outro Coordenador', email: 'revoked@profly.test', courseIds: [courseB] },
  });
  assert.equal(created.statusCode, 201, created.body);
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/invites/accept',
    payload: { token: created.json().inviteToken, password: 'ExampleTest2026' },
  });
  const headers = await loginClient('revoked@profly.test');
  const membership = (
    await app.inject({ url: `/api/v1/courses/${courseB}/coordinators`, headers })
  ).json().items[0];
  assert.ok(membership);
  assert.equal(
    (
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/courses/${courseB}/coordinators/${created.json().user.id}`,
        headers: adminHeaders,
        payload: { expectedVersion: membership.version, active: false },
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (await app.inject({ url: `/api/v1/courses/${courseB}/coordinators`, headers })).statusCode,
    404,
  );
  const user = await database.db.collection<User>('users').findOne({ _id: created.json().user.id });
  assert.ok(user);
  assert.equal(
    (
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${user._id}/state`,
        headers: adminHeaders,
        payload: { expectedVersion: user.version, state: 'DISABLED' },
      })
    ).statusCode,
    200,
  );
  assert.equal((await app.inject({ url: '/api/v1/auth/session', headers })).statusCode, 401);
});

test('CASE-004/013: convite expirado e token malformado nao ativam conta', async () => {
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/coordinators',
    headers: adminHeaders,
    payload: { name: 'Coordenador Expirado', email: 'expired@profly.test', courseIds: [courseB] },
  });
  assert.equal(created.statusCode, 201, created.body);
  await database.db
    .collection<AccessToken>('tokens')
    .updateMany({ userId: created.json().user.id }, { $set: { expiresAt: new Date(0) } });
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/invites/accept',
        payload: { token: created.json().inviteToken, password: 'ExampleTest2026' },
      })
    ).statusCode,
    410,
  );
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/invites/lookup',
        payload: { token: { $ne: null } },
      })
    ).statusCode,
    422,
  );
  assert.equal(
    (await database.db.collection<User>('users').findOne({ _id: created.json().user.id }))?.state,
    'INVITED',
  );
});

test('redefinicao de senha consome token e revoga todas as sessoes anteriores', async () => {
  const teacher = await registerTeacher('reset@profly.test');
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'reset@profly.test' },
      })
    ).statusCode,
    202,
  );
  const message = messages.findLast(
    (item) => item.email === 'reset@profly.test' && item.purpose === 'RESET',
  );
  assert.ok(message);
  const payload = { token: message.token, password: 'ChangedTest2026' };
  assert.equal(
    (await app.inject({ method: 'POST', url: '/api/v1/auth/reset-password', payload })).statusCode,
    200,
  );
  assert.equal(
    (await app.inject({ url: '/api/v1/auth/session', headers: teacher.headers })).statusCode,
    401,
  );
  assert.equal(
    (await app.inject({ method: 'POST', url: '/api/v1/auth/reset-password', payload })).statusCode,
    410,
  );
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'reset@profly.test', password: 'ExampleTest2026' },
      })
    ).statusCode,
    401,
  );
  await loginClient('reset@profly.test', 'ChangedTest2026');
});

test('logout e expiracao nao dependem da limpeza assincrona do indice TTL', async () => {
  const client = await loginClient('coordinator@profly.test');
  assert.equal(
    (await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: client, payload: {} }))
      .statusCode,
    204,
  );
  assert.equal(
    (await app.inject({ url: '/api/v1/auth/session', headers: client })).statusCode,
    401,
  );
  const expired = await loginClient('coordinator@profly.test');
  const session = (await app.inject({ url: '/api/v1/auth/session', headers: expired })).json();
  assert.equal(session.user.email, 'coordinator@profly.test');
  await database.db
    .collection<Session>('sessions')
    .updateMany({ csrfToken: expired['x-csrf-token'] }, { $set: { expiresAt: new Date(0) } });
  assert.equal(
    (await app.inject({ url: '/api/v1/auth/session', headers: expired })).statusCode,
    401,
  );
});

test('CASE-001/004/009/051: HTTP e SMTP local verificam e-mail e redefinem senha sem aprovar curso', async () => {
  const smtp = await smtpFixture();
  const mailApp = await buildApp(
    {
      ...config,
      mail: {
        host: '127.0.0.1',
        port: smtp.port,
        security: 'plain',
        from: 'profly@profly.test',
        appOrigin: config.origins[0]!,
      },
    },
    database,
  );
  const address = 'smtp-flow@profly.test';
  const extractToken = (index: number) => {
    const content = smtp.messages[index]!.replace(/=\r\n/g, '').replace(/=3D/g, '=');
    const value = content.match(/#token=([a-f0-9]{64})/)?.[1];
    assert.ok(value);
    return value;
  };
  try {
    const registration = await mailApp.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Professor SMTP Teste', email: address, password: 'ExampleTest2026' },
    });
    assert.equal(registration.statusCode, 201, registration.body);
    assert.equal(registration.json().user.state, 'PENDING_EMAIL');
    const verification = extractToken(0);
    assert.equal(
      (
        await mailApp.inject({
          method: 'POST',
          url: '/api/v1/auth/verify-email',
          payload: { token: verification },
        })
      ).statusCode,
      200,
    );
    const login = await mailApp.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: address, password: 'ExampleTest2026' },
    });
    assert.equal(login.statusCode, 200, login.body);
    const userId = registration.json().user.id;
    assert.equal(
      await database.db
        .collection('memberships')
        .countDocuments({ userId, role: 'teacher', active: true }),
      0,
    );
    const rawCookie = login.headers['set-cookie'];
    const cookie = (Array.isArray(rawCookie) ? rawCookie[0] : rawCookie)!.split(';')[0]!;
    const forgotten = await mailApp.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: address },
    });
    assert.equal(forgotten.statusCode, 202, forgotten.body);
    const reset = extractToken(1);
    const changed = await mailApp.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: reset, password: 'ChangedSmtp2026' },
    });
    assert.equal(changed.statusCode, 200, changed.body);
    assert.equal(
      (await mailApp.inject({ url: '/api/v1/auth/session', headers: { cookie } })).statusCode,
      401,
    );
    assert.equal(
      (
        await mailApp.inject({
          method: 'POST',
          url: '/api/v1/auth/reset-password',
          payload: { token: reset, password: 'OtherSmtp2026' },
        })
      ).statusCode,
      410,
    );
    const before = smtp.messages.length;
    assert.equal(
      (
        await mailApp.inject({
          method: 'POST',
          url: '/api/v1/auth/forgot-password',
          payload: { email: 'absent-smtp@profly.test' },
        })
      ).statusCode,
      202,
    );
    assert.equal(smtp.messages.length, before);
    smtp.state.rejectRecipients = true;
    const failed = await mailApp.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: address },
    });
    assert.equal(failed.statusCode, 503);
    assert.equal(failed.json().error.code, 'EMAIL_UNAVAILABLE');
    assert.ok(!failed.body.includes(reset));
    assert.ok(!failed.body.includes('synthetic-private-detail'));
  } finally {
    await mailApp.close();
    await smtp.close();
  }
});

test('CASE-051: e-mail nao configurado nao simula envio nem cria conta ativa', async () => {
  const unconfigured = await buildApp(config, database);
  try {
    assert.equal(
      (
        await unconfigured.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: {
            name: 'Professor Sem Envio',
            email: 'no-mail@profly.test',
            password: 'ExampleTest2026',
          },
        })
      ).statusCode,
      503,
    );
    assert.equal(
      await database.db.collection('users').countDocuments({ email: 'no-mail@profly.test' }),
      0,
    );
    assert.equal(
      (
        await unconfigured.inject({
          method: 'POST',
          url: '/api/v1/auth/forgot-password',
          payload: { email: 'unknown@profly.test' },
        })
      ).statusCode,
      503,
    );
  } finally {
    await unconfigured.close();
  }
});

test('CASE-049: JSON malformado e payload excessivo sao recusados', async () => {
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'content-type': 'application/json' },
        payload: '{"email":',
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'a'.repeat(70000) },
      })
    ).statusCode,
    413,
  );
});

test('limite de tentativas de autenticacao e aplicado antes de processar senhas', async () => {
  const limited = await buildApp(config, database);
  try {
    for (let i = 0; i < 20; i += 1)
      assert.equal(
        (await limited.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {} }))
          .statusCode,
        422,
      );
    assert.equal(
      (await limited.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {} })).statusCode,
      429,
    );
  } finally {
    await limited.close();
  }
});

test('CASE-054/055: identidade e auditoria persistem ao recriar a aplicacao', async () => {
  const restartedDatabase = new Database(config);
  await restartedDatabase.connect();
  const restarted = await buildApp(config, restartedDatabase);
  try {
    assert.equal(
      (await restarted.inject({ url: '/api/v1/auth/session', headers: adminHeaders })).statusCode,
      200,
    );
    const users = await restarted.inject({ url: '/api/v1/admin/users', headers: adminHeaders });
    assert.equal(users.statusCode, 200);
    assert.ok(!users.body.includes('passwordHash'));
    assert.ok(!users.body.includes('tokenHash'));
    assert.ok(
      await restartedDatabase.db
        .collection('audit')
        .countDocuments({ action: 'COORDINATOR_ASSIGNED' }),
    );
  } finally {
    await restarted.close();
    await restartedDatabase.close();
  }
});

test('administrador inicial nao e sobrescrito nem o ultimo administrador desativado', async () => {
  await assert.rejects(
    identity.bootstrap('Outro Admin', 'other-admin@profly.test', 'ExampleTest2026'),
    /Administrador inicial ja existe/,
  );
  const user = await database.db.collection<User>('users').findOne({ email: 'admin@profly.test' });
  assert.ok(user);
  assert.equal(
    (
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${user._id}/state`,
        headers: adminHeaders,
        payload: { expectedVersion: user.version, state: 'DISABLED' },
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (await app.inject({ url: '/api/v1/auth/session', headers: adminHeaders })).statusCode,
    200,
  );
});

async function teacherFixture(label: string) {
  const teacher = await registerTeacher(`${label}@profly.test`);
  const competency = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/competencies',
    headers: adminHeaders,
    payload: { code: label, name: 'Competencia de teste', active: true },
  });
  assert.equal(competency.statusCode, 201, competency.body);
  const competencyId = competency.json().id as string;
  const createSubject = (courseId: string) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/subjects`,
      headers: adminHeaders,
      payload: { code: label, name: 'Disciplina de teste', active: true, criteria: null },
    });
  const firstSubject = await createSubject(courseA);
  const secondSubject = await createSubject(courseB);
  assert.equal(firstSubject.statusCode, 201, firstSubject.body);
  assert.equal(secondSubject.statusCode, 201, secondSubject.body);
  const subjectA = firstSubject.json().id as string;
  const subjectB = secondSubject.json().id as string;
  const data: ProfileData = {
    contact: { phone: '+55 83 99999-0000' },
    education: [
      {
        id: randomUUID(),
        level: 'MASTER',
        field: 'Direito',
        institution: 'Instituicao de Teste',
        completedYear: 2020,
      },
    ],
    knowledge: [{ id: randomUUID(), competencyId, level: 4 }],
    teaching: { status: 'NONE', entries: [] },
    professional: { status: 'NONE', entries: [] },
    availability: {
      status: 'PROVIDED',
      timeZone: 'America/Fortaleza',
      windows: [
        {
          id: randomUUID(),
          weekday: 1,
          startsAt: '18:30',
          endsAt: '21:10',
          validFrom: '2026-01-01',
          validUntil: '2026-12-31',
        },
      ],
    },
    desiredWeeklyMinutes: 1200,
  };
  const save = (expectedVersion: number, values: ProfileData) =>
    app.inject({
      method: 'PUT',
      url: '/api/v1/me/profile',
      headers: teacher.headers,
      payload: { expectedVersion, data: values },
    });
  const submit = (courseId: string, subjectId: string, expectedVersion = 0, profileVersion = 1) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/me/applications/${courseId}`,
      headers: teacher.headers,
      payload: { expectedVersion, profileVersion, subjectIds: [subjectId] },
    });
  return { ...teacher, data, save, submit, subjectA, subjectB };
}

test('CASE-013/014: dedicacao opcional permite submissao pendente sem gerar aprovacao', async () => {
  const teacher = await teacherFixture('optional-dedication');
  const { desiredWeeklyMinutes: omitted, ...data } = teacher.data;
  assert.equal(omitted, 1200);
  assert.equal((await teacher.save(0, data)).statusCode, 200);
  const submission = await teacher.submit(courseA, teacher.subjectA);
  assert.equal(submission.statusCode, 201, submission.body);
  const current = await app.inject({ url: '/api/v1/me/profile', headers: teacher.headers });
  assert.equal(current.json().data.desiredWeeklyMinutes, undefined);
  const saved = await database.db
    .collection('applications')
    .findOne({ teacherId: teacher.id, courseId: courseA });
  assert.equal(saved?.status, 'SUBMITTED');
});

test('CASE-012/013/014/016: rascunho, submissao incompleta e edicoes concorrentes preservam versao', async () => {
  const teacher = await teacherFixture('profile-draft');
  const empty = await app.inject({ url: '/api/v1/me/profile', headers: teacher.headers });
  assert.equal(empty.json().version, 0);
  assert.ok(empty.json().missingFields.education);
  assert.equal((await teacher.save(0, {})).statusCode, 200);
  const incomplete = await teacher.submit(courseA, teacher.subjectA);
  assert.equal(incomplete.statusCode, 422, incomplete.body);
  assert.ok(incomplete.json().error.fieldErrors.knowledge);
  assert.equal(
    await database.db.collection('applications').countDocuments({ teacherId: teacher.id }),
    0,
  );
  const responses = await Promise.all([
    teacher.save(1, teacher.data),
    teacher.save(1, { ...teacher.data, desiredWeeklyMinutes: 600 }),
  ]);
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 409]);
  const current = await app.inject({ url: '/api/v1/me/profile', headers: teacher.headers });
  assert.equal(current.json().version, 2);
  assert.equal(current.json().source, 'TEACHER_DECLARED');
  assert.deepEqual(current.json().missingFields, {});
  const invalid = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/profile',
    headers: teacher.headers,
    payload: { expectedVersion: 2, data: { ...teacher.data, approved: true } },
  });
  assert.equal(invalid.statusCode, 422);
  const badReference = await teacher.save(2, {
    ...teacher.data,
    knowledge: [{ id: randomUUID(), competencyId: randomUUID(), level: 5 }],
  });
  assert.equal(badReference.statusCode, 422);
  assert.equal(
    await database.db.collection('profileVersions').countDocuments({ teacherId: teacher.id }),
    2,
  );
});

test('CASE-009/010/011: aprovacao por curso exige analise, autoria real e nao cria aula', async () => {
  const teacher = await teacherFixture('profile-approval');
  assert.equal((await teacher.save(0, teacher.data)).statusCode, 200);
  assert.equal((await teacher.submit(courseA, teacher.subjectB)).statusCode, 422);
  const first = await teacher.submit(courseA, teacher.subjectA);
  const second = await teacher.submit(courseB, teacher.subjectB);
  assert.equal(first.statusCode, 201, first.body);
  assert.equal(second.statusCode, 201, second.body);
  assert.equal((await teacher.submit(courseA, teacher.subjectA, 1)).statusCode, 409);
  assert.deepEqual(
    (await app.inject({ url: '/api/v1/courses', headers: teacher.headers })).json().items,
    [],
  );
  const review = (applicationId: string, courseId: string, decision: string, items: unknown[]) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/applications/${applicationId}/review`,
      headers: adminHeaders,
      payload: {
        expectedVersion: 1,
        profileVersion: 1,
        decision,
        reason: 'Analise sintetica de teste',
        items,
      },
    });
  assert.equal(
    (
      await review(first.json().id, courseA, 'APPROVED', [
        { id: randomUUID(), status: 'CONFIRMED' },
      ])
    ).statusCode,
    422,
  );
  const decisions = await Promise.all([
    review(first.json().id, courseA, 'APPROVED', [
      { id: teacher.data.knowledge![0]!.id, status: 'CONFIRMED' },
    ]),
    review(first.json().id, courseA, 'APPROVED', []),
  ]);
  assert.deepEqual(decisions.map((r) => r.statusCode).sort(), [200, 409]);
  // Only one review commits; B's rejection remains independent from A's approval.
  const rejectedB = await review(second.json().id, courseB, 'REJECTED', []);
  assert.equal(rejectedB.statusCode, 200);
  assert.equal(rejectedB.json().reason, 'Analise sintetica de teste');
  const admin = await identity.users.findOne({ email: 'admin@profly.test' });
  assert.equal(rejectedB.json().reviewerId, admin!._id);
  assert.equal(
    await identity.memberships.countDocuments({
      userId: teacher.id,
      courseId: courseB,
      role: 'teacher',
      active: true,
    }),
    0,
  );
  const accepted = decisions.find((r) => r.statusCode === 200)!;
  assert.equal(
    await identity.memberships.countDocuments({
      userId: teacher.id,
      courseId: courseA,
      role: 'teacher',
      active: true,
    }),
    accepted.json().status === 'APPROVED' ? 1 : 0,
  );
  assert.equal(
    await database.db.collection('allocations').countDocuments({ teacherId: teacher.id }),
    0,
  );
  assert.equal(
    await database.db.collection('occurrences').countDocuments({ teacherId: teacher.id }),
    0,
  );
  const own = await app.inject({ url: '/api/v1/me/applications', headers: teacher.headers });
  assert.equal(own.json().items.length, 2);
  assert.equal(
    (await app.inject({ url: `/api/v1/courses/${courseA}/applications`, headers: teacher.headers }))
      .statusCode,
    403,
  );
});

test('CASE-011/016: edicao de perfil torna analise antiga obsoleta e exige nova submissao', async () => {
  const teacher = await teacherFixture('profile-stale');
  assert.equal((await teacher.save(0, teacher.data)).statusCode, 200);
  const first = await teacher.submit(courseA, teacher.subjectA);
  assert.equal(first.statusCode, 201);
  assert.equal(
    (await teacher.save(1, { ...teacher.data, desiredWeeklyMinutes: 600 })).statusCode,
    200,
  );
  const stale = await app.inject({
    method: 'POST',
    url: `/api/v1/courses/${courseA}/applications/${first.json().id}/review`,
    headers: adminHeaders,
    payload: {
      expectedVersion: 1,
      profileVersion: 1,
      decision: 'APPROVED',
      reason: 'Analise sintetica',
      items: [],
    },
  });
  assert.equal(stale.statusCode, 409);
  assert.equal(stale.json().error.code, 'STALE_PROFILE');
  assert.equal((await teacher.submit(courseA, teacher.subjectA, 1, 2)).statusCode, 201);
  const detail = await app.inject({
    url: `/api/v1/courses/${courseA}/applications/${first.json().id}`,
    headers: adminHeaders,
  });
  assert.equal(detail.json().profile.profileVersion, 2);
  assert.equal(detail.json().profile.data.desiredWeeklyMinutes, 600);
  const old = await database.db
    .collection('profileVersions')
    .findOne({ teacherId: teacher.id, profileVersion: 1 });
  assert.equal(old!.data.desiredWeeklyMinutes, 1200);
  const changes = await app.inject({
    method: 'POST',
    url: `/api/v1/courses/${courseA}/applications/${first.json().id}/review`,
    headers: adminHeaders,
    payload: {
      expectedVersion: 2,
      profileVersion: 2,
      decision: 'CHANGES_REQUESTED',
      reason: 'Complemente a evidencia',
      items: [],
    },
  });
  assert.equal(changes.statusCode, 200, changes.body);
  assert.equal(changes.json().status, 'CHANGES_REQUESTED');
});

test('CASE-004/005/006: convite docente e analise respeitam escopo e nao aprovam automaticamente', async () => {
  const submittedTeacher = await teacherFixture('profile-isolation');
  assert.equal((await submittedTeacher.save(0, submittedTeacher.data)).statusCode, 200);
  const submittedApplication = await submittedTeacher.submit(courseB, submittedTeacher.subjectB);
  assert.equal(submittedApplication.statusCode, 201);
  const coordinator = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/coordinators',
    headers: adminHeaders,
    payload: {
      name: 'Coordenador de Perfil',
      email: 'profile-coordinator@profly.test',
      courseIds: [courseA],
    },
  });
  assert.equal(coordinator.statusCode, 201, coordinator.body);
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/invites/accept',
        payload: { token: coordinator.json().inviteToken, password: 'ExampleTest2026' },
      })
    ).statusCode,
    200,
  );
  const headers = await loginClient('profile-coordinator@profly.test');
  const invite = await app.inject({
    method: 'POST',
    url: `/api/v1/courses/${courseA}/teachers/invites`,
    headers,
    payload: { name: 'Docente Convidado', email: 'invited-teacher@profly.test' },
  });
  assert.equal(invite.statusCode, 201, invite.body);
  assert.equal(invite.json().academicApprovalRequired, true);
  assert.equal(invite.json().teacher.state, 'INVITED');
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: `/api/v1/courses/${courseB}/teachers/invites`,
        headers,
        payload: { name: 'Docente Bloqueado', email: 'forbidden-invite@profly.test' },
      })
    ).statusCode,
    404,
  );
  assert.equal(await identity.users.countDocuments({ email: 'forbidden-invite@profly.test' }), 0);
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/invites/accept',
        payload: { token: invite.json().inviteToken, password: 'ExampleTest2026' },
      })
    ).statusCode,
    200,
  );
  const invitedHeaders = await loginClient('invited-teacher@profly.test');
  assert.equal(
    (await app.inject({ url: '/api/v1/me/profile', headers: invitedHeaders })).statusCode,
    200,
  );
  assert.deepEqual(
    (await app.inject({ url: '/api/v1/courses', headers: invitedHeaders })).json().items,
    [],
  );
  assert.equal(
    (await app.inject({ url: `/api/v1/courses/${courseA}/applications`, headers })).statusCode,
    200,
  );
  const target = { _id: submittedApplication.json().id as string };
  for (const courseId of [courseA, courseB]) {
    const detail: { statusCode: number; body: string } = await app.inject({
      url: `/api/v1/courses/${courseId}/applications/${target._id}`,
      headers,
    });
    assert.equal(detail.statusCode, 404);
    assert.ok(!detail.body.includes('phone'));
  }
  const decision = await app.inject({
    method: 'POST',
    url: `/api/v1/courses/${courseB}/applications/${target._id}/review`,
    headers,
    payload: {
      expectedVersion: 1,
      profileVersion: 1,
      decision: 'APPROVED',
      reason: 'Tentativa fora do escopo',
      items: [],
    },
  });
  assert.equal(decision.statusCode, 404);
});

test('CASE-017/019: codigo unico, versao e historico academico persistem sob concorrencia', async () => {
  const url = '/api/v1/admin/competencies';
  const data = { code: ' concurrent-code ', name: 'Competencia concorrente', active: true };
  const create = () => app.inject({ method: 'POST', url, headers: adminHeaders, payload: data });
  const responses = await Promise.all([create(), create()]);
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [201, 409]);
  const record = responses.find((r) => r.statusCode === 201)!.json();
  assert.equal(record.code, 'CONCURRENT-CODE');
  const update = await app.inject({
    method: 'PUT',
    url: `${url}/${record.id}`,
    headers: adminHeaders,
    payload: { expectedVersion: 1, data: { ...data, name: 'Competencia revisada' } },
  });
  assert.equal(update.statusCode, 200, update.body);
  assert.equal(update.json().version, 2);
  const stale = await app.inject({
    method: 'PUT',
    url: `${url}/${record.id}`,
    headers: adminHeaders,
    payload: { expectedVersion: 1, data },
  });
  assert.equal(stale.statusCode, 409);
  assert.equal(
    await database.db.collection('academicVersions').countDocuments({ resourceId: record.id }),
    2,
  );
  const catalog = await app.inject('/api/v1/catalog/competencies?limit=100&offset=0');
  assert.equal(catalog.statusCode, 200);
  assert.ok(catalog.json().items.some((i: { id: string }) => i.id === record.id));
  assert.ok(!catalog.body.includes('changedBy'));
  assert.equal((await app.inject('/api/v1/catalog/competencies?limit=1000')).statusCode, 422);
});

test('CASE-018/019/020: ofertas exigem curso, periodo e blocos compativeis e preservam dependencias', async () => {
  const create = async (url: string, payload: object) => {
    const result = await app.inject({ method: 'POST', url, headers: adminHeaders, payload });
    assert.equal(result.statusCode, 201, result.body);
    return result.json();
  };
  const block = { weekday: 1, startsAt: '18:30', endsAt: '19:20', shift: 'NIGHT' };
  const periodData = {
    code: '2026-ACADEMIC',
    name: 'Periodo sintetico',
    active: true,
    startsOn: '2026-08-01',
    endsOn: '2026-12-31',
    timeZone: 'America/Fortaleza',
    calendarStatus: 'REVIEWED',
    blocks: [block, { ...block, startsAt: '19:35', endsAt: '20:25' }],
  };
  const period = await create('/api/v1/admin/periods', periodData);
  const groupData = {
    code: 'TURMA-TEST',
    name: 'Turma sintetica',
    active: true,
    periodId: period.id,
  };
  const groupA = await create(`/api/v1/courses/${courseA}/groups`, groupData);
  const groupB = await create(`/api/v1/courses/${courseB}/groups`, groupData);
  const subjectData = {
    code: 'ACADEMIC-SUBJECT',
    name: 'Disciplina sintetica',
    active: true,
    criteria: null,
  };
  const subjectA = await create(`/api/v1/courses/${courseA}/subjects`, subjectData);
  const subjectB = await create(`/api/v1/courses/${courseB}/subjects`, subjectData);
  const meeting = {
    id: randomUUID(),
    weekday: 1,
    startsAt: '18:30',
    endsAt: '19:20',
    validFrom: '2026-08-01',
    validUntil: '2026-12-31',
  };
  const offering = {
    code: 'OFFER-TEST',
    name: 'Oferta sintetica',
    active: true,
    periodId: period.id,
    groupId: groupA.id,
    subjectId: subjectA.id,
    meetings: [meeting],
  };
  const url = `/api/v1/courses/${courseA}/offerings`;
  for (const payload of [
    { ...offering, subjectId: subjectB.id },
    { ...offering, groupId: groupB.id },
    { ...offering, meetings: [{ ...meeting, validFrom: '2026-01-01' }] },
    { ...offering, meetings: [{ ...meeting, startsAt: '18:40' }] },
    { ...offering, meetings: [{ ...meeting, validFrom: '2026-08-04', validUntil: '2026-08-04' }] },
  ])
    assert.equal(
      (await app.inject({ method: 'POST', url, headers: adminHeaders, payload })).statusCode,
      422,
    );
  assert.equal(await database.db.collection('offerings').countDocuments({ code: 'OFFER-TEST' }), 0);
  const saved = await create(url, offering);
  assert.equal(saved.courseId, courseA);
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/periods/${period.id}`,
        headers: adminHeaders,
        payload: { expectedVersion: 1, data: periodData },
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: `/api/v1/courses/${courseA}/subjects/${subjectA.id}`,
        headers: adminHeaders,
        payload: { expectedVersion: 1, data: { ...subjectData, active: false } },
      })
    ).statusCode,
    409,
  );
  const catalog = await app.inject(`/api/v1/catalog/courses/${courseA}/subjects`);
  assert.equal(catalog.statusCode, 200);
  assert.ok(!catalog.body.includes(subjectB.id));
  const coordinatorInvite = await create('/api/v1/admin/coordinators', {
    name: 'Coordenador Academico',
    email: 'academic-coordinator@profly.test',
    courseIds: [courseA],
  });
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/invites/accept',
        payload: { token: coordinatorInvite.inviteToken, password: 'ExampleTest2026' },
      })
    ).statusCode,
    200,
  );
  const coordinator = await loginClient('academic-coordinator@profly.test');
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: `/api/v1/courses/${courseB}/subjects`,
        headers: coordinator,
        payload: { ...subjectData, code: 'DENIED' },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/admin/competencies',
        headers: coordinator,
        payload: { code: 'DENIED', name: 'Sem permissao', active: true },
      })
    ).statusCode,
    403,
  );
});
