import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { parse } from './errors.js';

export const id = z.uuid();
export const name = z.string().trim().min(3).max(100);
export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const password = z
  .string()
  .min(8)
  .max(72)
  .regex(/[a-zA-Z]/)
  .regex(/[0-9]/);
export const opaqueToken = z.string().regex(/^[a-f0-9]{64}$/);
export type GuardHook = (request: FastifyRequest) => Promise<void>;

export function command<T extends z.ZodType>(
  app: FastifyInstance,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  schema: T,
  handler: (request: FastifyRequest, reply: FastifyReply, body: z.infer<T>) => Promise<unknown>,
  guard?: GuardHook,
  tag = 'api',
  limited = false,
) {
  app.route({
    method,
    url,
    attachValidation: true,
    schema: { tags: [tag], body: z.toJSONSchema(schema, { target: 'draft-7', io: 'input' }) },
    ...(guard ? { preHandler: guard } : {}),
    ...(limited ? { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } } : {}),
    handler: async (request, reply) => handler(request, reply, parse(schema, request.body)),
  });
}

export function routeId(request: FastifyRequest, key: string) {
  return parse(id, parse(z.record(z.string(), z.unknown()), request.params)[key]);
}
