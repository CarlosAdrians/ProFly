import { z } from 'zod';
import { loadConfig } from '../src/config.js';
import { Database } from '../src/database.js';
import { IdentityService } from '../src/identity/service.js';
import { email, name, password } from '../src/shared/http.js';

async function main() {
  const config = loadConfig();
  const input = z
    .strictObject({ name, email, password })
    .safeParse({
      name: process.env.BOOTSTRAP_ADMIN_NAME,
      email: process.env.BOOTSTRAP_ADMIN_EMAIL,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    });
  if (!input.success)
    throw new Error(
      'Defina BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD validos.',
    );
  const database = new Database(config);
  try {
    await database.connect();
    await new IdentityService(database, config).bootstrap(
      input.data.name,
      input.data.email,
      input.data.password,
    );
    process.stdout.write('Administrador inicial criado. Nenhuma credencial foi exibida.\n');
  } finally {
    await database.close();
  }
}
main().catch(() => {
  process.stderr.write(
    'Bootstrap nao concluido. Confira a configuracao; um administrador existente nao sera sobrescrito.\n',
  );
  process.exitCode = 1;
});
