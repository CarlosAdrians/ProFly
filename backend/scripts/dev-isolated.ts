import { createUiFixture } from '../test/ui-fixture.js';
import { createSmtpNotifications } from '../src/notifications/smtp.js';
if (process.env.PROFLY_RUN_INTEGRATION !== '1')
  throw new Error('Opt-in de ambiente isolado obrigatorio.');
const fixture = await createUiFixture(
  createSmtpNotifications({
    host: '127.0.0.1',
    port: 1025,
    security: 'plain',
    from: 'profly@profly.test',
    appOrigin: 'http://127.0.0.1:5175',
  }),
);
await fixture.app.listen({ host: '127.0.0.1', port: 3334 });
console.log(
  'PROFLY_ISOLATED_READY http://127.0.0.1:3334; banco efemero _test; nenhum .env carregado.',
);
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    void fixture.close().then(() => process.exit(0));
  });
