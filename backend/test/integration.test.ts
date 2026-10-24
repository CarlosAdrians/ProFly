import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { loadConfig } from '../src/config.js';
import { Database } from '../src/database.js';
import { buildApp } from '../src/app.js';
import { IdentityService } from '../src/identity/service.js';
import type { AccessToken, Notifications, Session, User } from '../src/identity/models.js';

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

async function loginClient(email: string, password = 'ExampleTest2026') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
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
