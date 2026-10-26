import { z } from 'zod';

export interface MailConfig {
  host: string;
  port: number;
  security: 'implicit' | 'starttls' | 'plain';
  from: string;
  appOrigin: string;
  auth?: { user: string; pass: string };
}
const schema = z.object({
  SMTP_HOST: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.:-]+$/),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURITY: z.enum(['implicit', 'starttls', 'plain']).default('starttls'),
  SMTP_FROM: z.email(),
  SMTP_USER: z.string().min(1).max(320).optional(),
  SMTP_PASSWORD: z.string().min(1).max(4096).optional(),
  PUBLIC_APP_URL: z.url(),
});
const loopback = (host: string) => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);

export function loadMailConfig(
  input: Record<string, string | undefined>,
  environment: 'development' | 'test' | 'production',
  origins: string[],
): MailConfig | undefined {
  const mode = input.EMAIL_TRANSPORT ?? 'disabled';
  if (mode === 'disabled') return undefined;
  if (mode !== 'smtp') throw new Error('Configuracao invalida: EMAIL_TRANSPORT');
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Configuracao invalida: ${[...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ')}`,
    );
  const env = result.data;
  const url = new URL(env.PUBLIC_APP_URL);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !origins.includes(url.origin) ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && environment !== 'production' && loopback(url.hostname)))
  )
    throw new Error('Configuracao invalida: PUBLIC_APP_URL');
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD))
    throw new Error('Configuracao invalida: SMTP_USER, SMTP_PASSWORD');
  if (
    env.SMTP_SECURITY === 'plain' &&
    (environment === 'production' || !loopback(env.SMTP_HOST) || env.SMTP_USER)
  )
    throw new Error('SMTP sem TLS permitido somente para captura local sem autenticacao.');
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    security: env.SMTP_SECURITY,
    from: env.SMTP_FROM,
    appOrigin: url.origin,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
  };
}
