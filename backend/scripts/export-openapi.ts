import { mkdir, writeFile } from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { Database } from '../src/database.js';

// Export metadata without opening a database connection or a listener.
const config = loadConfig({
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017',
  MONGODB_DATABASE: 'profly_openapi_test',
  ALLOWED_ORIGINS: 'http://localhost:5173',
});
const database = new Database(config);
const app = await buildApp(config, database);
try {
  await app.ready();
  await mkdir('docs', { recursive: true });
  await writeFile('docs/openapi.json', `${JSON.stringify(app.swagger(), null, 2)}\n`);
} finally {
  await app.close();
  await database.close();
}
