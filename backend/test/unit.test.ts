import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { loadConfig } from '../src/config.js';
import { AppError, errorResponse, parse } from '../src/shared/errors.js';
import { hashPassword, token, tokenHash, verifyPassword } from '../src/shared/crypto.js';
import { randomUUID } from 'node:crypto';
import { profileData, missingFields } from '../src/teachers/contracts.js';

const env = {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://localhost:27017',
  MONGODB_DATABASE: 'profly_test',
  ALLOWED_ORIGINS: 'http://localhost:5173',
};

test('CASE-053: configuracao nao usa banco padrao nem permite teste em banco sem sufixo', () => {
  assert.throws(() => loadConfig({}), /Configuracao invalida/);
  assert.throws(() => loadConfig({ ...env, MONGODB_DATABASE: 'profly' }), /_test/);
  assert.equal(loadConfig(env).database, 'profly_test');
});

test('configuracao valida limites e origens; erros nao expoem URI', () => {
  assert.throws(
    () => loadConfig({ ...env, MONGODB_URI: 'secret-password' }),
    (error: Error) => !error.message.includes('secret-password'),
  );
  assert.throws(() => loadConfig({ ...env, PORT: '0' }));
  assert.throws(() => loadConfig({ ...env, ALLOWED_ORIGINS: '*' }));
  assert.throws(() => loadConfig({ ...env, NODE_ENV: 'production' }));
});

test('CASE-014/050: tipo trocado e operador injetado sao rejeitados, nunca removidos silenciosamente', () => {
  const schema = z.strictObject({ email: z.email() });
  assert.throws(() => parse(schema, { email: { $ne: null } }), AppError);
  assert.throws(() => parse(schema, { email: 'a@profly.test', role: 'admin' }), AppError);
  assert.deepEqual(parse(schema, { email: 'a@profly.test' }), { email: 'a@profly.test' });
});

test('CASE-051/052: erros estruturados nao expoem segredos nem anunciam sucesso', () => {
  const internal = errorResponse(new Error('password=secret'), 'req-1');
  assert.equal(internal.status, 500);
  assert.equal(errorResponse(null, 'r').status, 500);
  assert.ok(!JSON.stringify(internal).includes('secret'));
  assert.equal(errorResponse({ name: 'MongoNetworkError' }, 'r').status, 503);
  assert.equal(errorResponse({ code: 11000 }, 'r').status, 409);
  assert.equal(errorResponse({ code: 'FST_ERR_CTP_INVALID_JSON_BODY' }, 'r').status, 400);
  try {
    parse(z.strictObject({ name: z.string().min(3) }), { name: '' });
  } catch (error) {
    assert.ok(errorResponse(error, 'r').body.error.fieldErrors?.name);
  }
});

test('CASE-001: senha usa derivacao com sal aleatorio e verificacao real', async () => {
  const encoded = await hashPassword('ExampleTest2026');
  assert.ok(!encoded.includes('ExampleTest2026'));
  assert.equal(await verifyPassword('ExampleTest2026', encoded), true);
  assert.equal(await verifyPassword('OtherTest2026', encoded), false);
  assert.equal(await verifyPassword('ExampleTest2026'), false);
  const raw = token();
  assert.match(raw, /^[a-f0-9]{64}$/);
  assert.notEqual(tokenHash(raw), raw);
  assert.notEqual(raw, token());
});

test('CASE-013/014/015: rascunho distingue desconhecido, nenhum e dados declarados', () => {
  assert.deepEqual(parse(profileData, {}), {});
  assert.ok(missingFields({}).education);
  const data = parse(profileData, { teaching: { status: 'NONE', entries: [] } });
  assert.equal(missingFields(data).teaching, undefined);
  for (const teaching of [
    { status: 'NONE', entries: [{}] },
    { status: 'PROVIDED', entries: [] },
    null,
  ])
    assert.throws(() => parse(profileData, { teaching }), AppError);
  for (const data of [
    { approved: true },
    { desiredWeeklyMinutes: '120' },
    { education: null },
    { contact: { phone: { $ne: null } } },
    { desiredWeeklyMinutes: Infinity },
  ])
    assert.throws(() => parse(profileData, data), AppError);
});

test('CASE-020: disponibilidade aceita adjacencia e rejeita sobreposicao, meia-noite e vigencia invalida', () => {
  const first = {
    id: randomUUID(),
    weekday: 1,
    startsAt: '18:30',
    endsAt: '19:20',
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
  };
  const section = (windows: unknown[]) => ({
    availability: { status: 'PROVIDED', timeZone: 'America/Fortaleza', windows },
  });
  assert.doesNotThrow(() =>
    parse(
      profileData,
      section([first, { ...first, id: randomUUID(), startsAt: '19:20', endsAt: '20:10' }]),
    ),
  );
  for (const second of [
    { ...first, id: randomUUID() },
    { ...first, startsAt: '22:00', endsAt: '01:00' },
    { ...first, validFrom: '2026-12-31', validUntil: '2026-01-01' },
    { ...first, validFrom: '2026-02-30' },
  ])
    assert.throws(() => parse(profileData, section([second, first])), AppError);
  assert.throws(
    () =>
      parse(profileData, { availability: { status: 'NONE', timeZone: 'invalid', windows: [] } }),
    AppError,
  );
});
