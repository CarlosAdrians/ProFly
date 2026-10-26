import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUiFixture } from './ui-fixture.js';
import { buildApp } from '../src/app.js';

test('CASE-067: manutencao recusa operacoes antes dos handlers, preserva dados e recupera sem revogar sessao', async () => {
  const f = await createUiFixture();
  const maintenance = await buildApp({ ...f.identity.config, maintenanceMode: true }, f.database);
  try {
    await maintenance.ready();
    const before = await f.identity.users.countDocuments();
    assert.equal((await maintenance.inject('/health/live')).statusCode, 200);
    assert.equal((await maintenance.inject('/api/v1/status')).json().state, 'MAINTENANCE');
    for (const url of [
      '/health/ready',
      '/api/v1/auth/session',
      '/api/v1/me/academic-documents',
      '/api/v1/status-extra',
    ]) {
      const response = await maintenance.inject({
        url,
        headers: { ...f.teacher, origin: 'http://localhost:5173' },
      });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error.code, 'MAINTENANCE');
      assert.equal(response.headers['retry-after'], '300');
      assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
    }
    const write = await maintenance.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Pessoa sintetica',
        email: 'maintenance@profly.test',
        password: 'ExampleTest2026',
      },
    });
    assert.equal(write.statusCode, 503);
    assert.equal(await f.identity.users.countDocuments(), before);
    assert.equal(
      (await f.app.inject({ url: '/api/v1/auth/session', headers: f.teacher })).statusCode,
      200,
    );
    assert.equal((await f.app.inject('/api/v1/status')).json().state, 'AVAILABLE');
  } finally {
    await maintenance.close();
    await f.close();
  }
});
