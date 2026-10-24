import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { loadConfig } from '../src/config.js';
import { Database } from '../src/database.js';
import { buildApp } from '../src/app.js';

if (process.env.PROFLY_RUN_INTEGRATION !== '1') {
  throw new Error('Integracao exige PROFLY_RUN_INTEGRATION=1; usa somente MongoDB efemero local.');
}

let replica: MongoMemoryReplSet;
let database: Database;
let app: Awaited<ReturnType<typeof buildApp>>;

before(
  async () => {
    replica = await MongoMemoryReplSet.create({
      binary: { downloadDir: path.resolve('../../../work/mongodb-binaries') },
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: 60000 }],
    });
    const config = loadConfig({
      NODE_ENV: 'test',
      MONGODB_URI: replica.getUri(),
      MONGODB_DATABASE: 'profly_integration_test',
      ALLOWED_ORIGINS: 'http://localhost:5173',
    });
    database = new Database(config);
    await database.connect();
    app = await buildApp(config, database);
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
