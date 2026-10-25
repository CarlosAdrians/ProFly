import { createUiFixture } from '../test/ui-fixture.js';
import { createSmtpNotifications } from '../src/notifications/smtp.js';
if (process.env.PROFLY_RUN_INTEGRATION !== '1')
  throw new Error('Opt-in de ambiente isolado obrigatorio.');
const https = process.env.PROFLY_PREVIEW_HTTPS === '1';
if (
  process.env.PROFLY_PREVIEW_PORT &&
  !['3334', '3335', '3336'].includes(process.env.PROFLY_PREVIEW_PORT)
)
  throw new Error('Porta de previa invalida.');
const previewPort = Number(process.env.PROFLY_PREVIEW_PORT ?? (https ? '3335' : '3334'));
if ((https && previewPort !== 3335) || (!https && previewPort === 3335))
  throw new Error('Porta e modo da previa incompativeis.');
const fixture = await createUiFixture(
  createSmtpNotifications({
    host: '127.0.0.1',
    port: 1025,
    security: 'plain',
    from: 'profly@profly.test',
    appOrigin: https
      ? 'https://localhost:5176'
      : previewPort === 3336
        ? 'http://localhost:5177'
        : 'http://127.0.0.1:5175',
  }),
  { https },
);
await fixture.app.listen({ host: '127.0.0.1', port: previewPort });
console.log(
  `PROFLY_ISOLATED_READY http://127.0.0.1:${previewPort}; banco efemero _test; nenhum .env carregado.`,
);
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    void fixture.close().then(() => process.exit(0));
  });
