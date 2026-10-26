import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { loadMailConfig, type MailConfig } from '../src/notifications/config.js';
import { createSmtpNotifications, smtpOptions } from '../src/notifications/smtp.js';
import { smtpFixture } from './smtpFixture.js';

const origins = ['http://127.0.0.1:5174'];
const env = {
  EMAIL_TRANSPORT: 'smtp',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_SECURITY: 'plain',
  SMTP_FROM: 'profly@profly.test',
  PUBLIC_APP_URL: origins[0],
};
const token = 'a'.repeat(64);

test('CASE-051/053: e-mail desativado por padrao e configuracao invalida nao expoe segredo', () => {
  assert.equal(loadMailConfig({}, 'development', origins), undefined);
  assert.equal(createSmtpNotifications(undefined), undefined);
  assert.throws(() => loadMailConfig({ EMAIL_TRANSPORT: 'other' }, 'test', origins));
  const config = loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017',
    MONGODB_DATABASE: 'mail_test',
    ALLOWED_ORIGINS: origins[0],
    ...env,
  });
  assert.equal(config.mail?.security, 'plain');
  for (const invalid of [
    { SMTP_USER: 'sender@profly.test' },
    { SMTP_PASSWORD: 'synthetic-secret' },
    { SMTP_FROM: 'sender@profly.test\r\nBcc: other@profly.test' },
    { PUBLIC_APP_URL: 'https://attacker.test' },
    { PUBLIC_APP_URL: 'http://user:synthetic-secret@127.0.0.1:5174' },
    { PUBLIC_APP_URL: `${origins[0]}/?redirect=https://attacker.test` },
    { SMTP_PORT: '0' },
    { SMTP_HOST: 'smtp://host' },
  ])
    assert.throws(
      () => loadMailConfig({ ...env, ...invalid }, 'test', origins),
      (error: Error) => !error.message.includes('synthetic-secret'),
    );
});

test('CASE-051/053: TLS e certificado obrigatorios fora da captura local', () => {
  assert.throws(() => loadMailConfig({ ...env, SMTP_HOST: 'smtp.example.test' }, 'test', origins));
  assert.throws(() =>
    loadMailConfig(
      { ...env, SMTP_USER: 'user', SMTP_PASSWORD: 'synthetic-secret' },
      'test',
      origins,
    ),
  );
  assert.throws(() => loadMailConfig(env, 'production', origins));
  const config = loadMailConfig(
    {
      ...env,
      SMTP_SECURITY: 'starttls',
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'synthetic-secret',
      PUBLIC_APP_URL: 'https://profly.test',
    },
    'production',
    ['https://profly.test'],
  )!;
  const options = smtpOptions(config);
  assert.equal(options.requireTLS, true);
  assert.equal(options.ignoreTLS, false);
  assert.equal(options.tls?.rejectUnauthorized, true);
  assert.equal(options.logger, false);
  assert.equal(options.debug, false);
  assert.equal(options.disableFileAccess, true);
  assert.equal(options.disableUrlAccess, true);
  assert.equal(smtpOptions({ ...config, security: 'implicit', port: 465 }).secure, true);
});

test('CASE-004/051: SMTP real local captura verificacao e reset sem enviar externamente', async () => {
  const smtp = await smtpFixture();
  const config: MailConfig = { ...loadMailConfig(env, 'test', origins)!, port: smtp.port };
  const mail = createSmtpNotifications(config)!;
  try {
    for (const purpose of ['VERIFY_EMAIL', 'RESET'] as const)
      await mail.send({ email: 'teacher@profly.test', purpose, token });
    assert.equal(smtp.messages.length, 2);
    assert.deepEqual(smtp.recipients, [
      'RCPT TO:<teacher@profly.test>',
      'RCPT TO:<teacher@profly.test>',
    ]);
    for (const [index, path] of ['/verificar-email', '/redefinir-senha'].entries()) {
      const content = smtp.messages[index]!.replace(/=\r\n/g, '').replace(/=3D/g, '=');
      assert.ok(content.includes(`${origins[0]}${path}#token=${token}`));
      assert.match(content, /multipart\/alternative/);
      assert.ok(!content.includes(`${path}?token=`));
    }
    const before = smtp.messages.length;
    await assert.rejects(
      mail.send({ email: 'teacher@profly.test,other@profly.test', purpose: 'RESET', token }),
    );
    await assert.rejects(
      mail.send({ email: 'teacher@profly.test', purpose: 'RESET', token: 'invalid' }),
    );
    assert.equal(smtp.messages.length, before);
    smtp.state.rejectRecipients = true;
    await assert.rejects(
      mail.send({ email: 'teacher@profly.test', purpose: 'RESET', token }),
      (error: Error) =>
        error.message === 'Servico de envio indisponivel.' &&
        !error.message.includes('synthetic-private-detail'),
    );
  } finally {
    await smtp.close();
  }
});
