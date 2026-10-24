import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { Database } from './database.js';

async function main() {
  const config = loadConfig();
  const database = new Database(config);
  try {
    await database.connect();
  } catch {
    await database.close();
    throw new Error(
      'Banco indisponivel ou incompativel. Confira a configuracao com o responsavel pelo MongoDB.',
    );
  }
  const app = await buildApp(config, database);
  app.addHook('onClose', () => database.close());
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close().then(() => {
        process.exitCode = 0;
      });
    });
  }
  try {
    await app.listen({ host: config.host, port: config.port });
  } catch {
    await app.close();
    throw new Error('Nao foi possivel abrir a porta HTTP configurada.');
  }
  process.stdout.write(`ProFly API em ${config.host}:${config.port}\n`);
}

main().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
