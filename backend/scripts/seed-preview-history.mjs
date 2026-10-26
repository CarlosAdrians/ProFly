// Explicit operation on the existing ephemeral preview. Never loads .env or creates users.
import { MongoClient } from 'mongodb';
import { loadConfig } from '../dist/config.js';
import { Database } from '../dist/database.js';
import { seedPreviewHistory } from '../dist/testing/previewHistory.js';
if (process.env.PROFLY_SEED_PREVIEW_HISTORY !== '1')
  throw new Error('Opt-in sintetico obrigatorio.');
const port = process.env.PROFLY_PREVIEW_MONGO_PORT;
if (!port || !/^\d+$/.test(port) || +port < 1024 || +port > 65535)
  throw new Error('Porta local explicita obrigatoria.');
const uri = `mongodb://127.0.0.1:${port}/?replicaSet=testset`;
const probe = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
let database;
try {
  await probe.connect();
  const names = (await probe.db('admin').admin().listDatabases()).databases.filter((d) =>
    /^profly_ui_[a-f0-9]{32}_test$/.test(d.name),
  );
  if (names.length !== 1) throw new Error('Previa unica nao identificada.');
  const config = loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: uri,
    MONGODB_DATABASE: names[0].name,
    ALLOWED_ORIGINS: 'http://127.0.0.1:5175',
    PRIVACY_HEALTH_UPLOADS_ENABLED: 'true',
  });
  database = new Database(config);
  await database.client.connect();
  const user = await database.db.collection('users').findOne({ email: 'docente.ui@profly.test' });
  if (!user || typeof user._id !== 'string') throw new Error('Professor ficticio indisponivel.');
  console.log(JSON.stringify(await seedPreviewHistory(database, config, user._id)));
} finally {
  await database?.close();
  await probe.close();
}
