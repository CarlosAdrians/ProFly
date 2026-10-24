import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { loadConfig } from '../src/config.js';
import { AppError, errorResponse, parse } from '../src/shared/errors.js';

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
