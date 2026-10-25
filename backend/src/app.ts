import Fastify from 'fastify';
import { privacyRoutes } from './privacy/routes.js';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { randomUUID } from 'node:crypto';
import type { Config } from './config.js';
import type { Database } from './database.js';
import { AppError, errorResponse } from './shared/errors.js';
import { IdentityService } from './identity/service.js';
import { identityRoutes } from './identity/routes.js';
import type { Notifications } from './identity/models.js';
import { teacherRoutes } from './teachers/routes.js';
import { academicRoutes } from './academics/routes.js';
import { createSmtpNotifications } from './notifications/smtp.js';
import { schedulingRoutes } from './scheduling/routes.js';
import { accountRoutes } from './identity/account.js';

export async function buildApp(
  config: Config,
  database: Database,
  options: { notifications?: Notifications } = {},
) {
  const app = Fastify({
    logger: false,
    bodyLimit: 64 * 1024,
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } },
  });
  await app.register(helmet, {
    strictTransportSecurity:
      config.environment === 'production'
        ? { maxAge: 31536000, includeSubDomains: false, preload: false }
        : false,
  });
  app.addHook('onRequest', async (request, reply) => {
    // Session tokens and private academic data must not be cached, including error responses.
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const origin = request.headers.origin;
    if (origin && !config.origins.includes(origin))
      throw new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origem nao permitida.');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers['sec-fetch-site'] === 'cross-site' &&
      !origin
    )
      throw new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origem nao permitida.');
  });
  await app.register(cookie);
  await app.register(cors, {
    origin: config.origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    strictPreflight: true,
    maxAge: 300,
  });
  await app.register(rateLimit, { global: false });
  await app.register(multipart, {
    limits: { fileSize: config.uploadMaxBytes, files: 1, fields: 0 },
  });
  await app.register(swagger, { openapi: { info: { title: 'ProFly API', version: '0.1.0' } } });

  app.setErrorHandler((error, request, reply) => {
    const result = errorResponse(error, request.id);
    reply.code(result.status).send(result.body);
  });
  app.setNotFoundHandler(() => {
    throw new AppError(404, 'NOT_FOUND', 'Recurso indisponivel.');
  });

  app.get('/health/live', { schema: { tags: ['health'] } }, async () => ({ status: 'ok' }));
  app.get('/health/ready', { schema: { tags: ['health'] } }, async () => {
    await database.ping();
    return { status: 'ready' };
  });
  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());
  const identity = new IdentityService(
    database,
    config,
    options.notifications ?? createSmtpNotifications(config.mail),
  );
  identityRoutes(app, identity);
  accountRoutes(app, identity);
  privacyRoutes(app, identity);
  teacherRoutes(app, identity);
  academicRoutes(app, identity);
  schedulingRoutes(app, identity);
  return app;
}
