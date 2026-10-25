import path from 'node:path';
import { z } from 'zod';
import { loadMailConfig, type MailConfig } from './notifications/config.js';

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  MONGODB_DATABASE: z.string().regex(/^[a-zA-Z0-9_-]{1,63}$/),
  ALLOWED_ORIGINS: z.string().min(1),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(20 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  UPLOAD_DIRECTORY: z.string().min(1).default('.data/certificates'),
});

export interface Config {
  environment: 'development' | 'test' | 'production';
  host: string;
  port: number;
  mongoUri: string;
  database: string;
  origins: string[];
  sessionHours: number;
  uploadMaxBytes: number;
  uploadDirectory: string;
  secureCookies: boolean;
  mail?: MailConfig;
}

export function loadConfig(input: Record<string, string | undefined> = process.env): Config {
  const parsed = environment.safeParse(input);
  if (!parsed.success) {
    // Report names only: a database URI may contain credentials.
    throw new Error(
      `Configuracao invalida: ${[...new Set(parsed.error.issues.map((i) => i.path.join('.')))].join(', ')}`,
    );
  }
  const env = parsed.data;
  const origins = env.ALLOWED_ORIGINS.split(',').map((value) => value.trim());
  if (
    origins.some((value) => {
      try {
        const url = new URL(value);
        return (
          !['http:', 'https:'].includes(url.protocol) ||
          url.origin !== value ||
          url.hostname.includes('*') ||
          (env.NODE_ENV === 'production' && url.protocol !== 'https:')
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error('Configuracao invalida: ALLOWED_ORIGINS');
  if (env.NODE_ENV === 'production' && env.COOKIE_SECURE === 'false')
    throw new Error('Configuracao invalida: COOKIE_SECURE');
  if (env.NODE_ENV === 'test' && !env.MONGODB_DATABASE.endsWith('_test')) {
    throw new Error('Banco de teste deve terminar em _test');
  }
  return {
    environment: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    mongoUri: env.MONGODB_URI,
    database: env.MONGODB_DATABASE,
    origins: [...new Set(origins)],
    sessionHours: env.SESSION_HOURS,
    uploadMaxBytes: env.UPLOAD_MAX_BYTES,
    uploadDirectory: path.resolve(env.UPLOAD_DIRECTORY),
    secureCookies: env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true',
    mail: loadMailConfig(input, env.NODE_ENV, origins),
  };
}
