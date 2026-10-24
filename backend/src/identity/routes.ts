import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { IdentityService, SESSION_COOKIE } from './service.js';
import { type AccessToken, type Course, type Session, type User, userView } from './models.js';
import { command, email, id, name, opaqueToken, password, routeId } from '../shared/http.js';
import { AppError, conflict, missing, parse } from '../shared/errors.js';
import { hashPassword, tokenHash } from '../shared/crypto.js';
import { audit, entity, lock, view, type Guard } from '../shared/model.js';

const account = z.strictObject({ name, email, password });
const login = z.strictObject({ email, password: z.string().min(1).max(72) });
const courseInput = z.strictObject({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  name,
});
const coordinatorInput = z.strictObject({
  name,
  email,
  courseIds: z
    .array(id)
    .min(1)
    .max(20)
    .refine((items) => new Set(items).size === items.length),
});

export function identityRoutes(app: FastifyInstance, service: IdentityService) {
  const authenticated = service.guard();
  const admin = service.guard(['admin']);
  const coordinator = service.guard(['admin', 'coordinator']);
  const db = service.database;
  app.decorateRequest('actor', null);

  command(
    app,
    'POST',
    '/api/v1/auth/register',
    account,
    async (_request, reply, body) => {
      const result = await service.register(body);
      return reply.code(201).send(result);
    },
    undefined,
    'auth',
    true,
  );

  command(
    app,
    'POST',
    '/api/v1/auth/login',
    login,
    async (_request, reply, body) => {
      const result = await service.login(body.email, body.password);
      reply.setCookie(SESSION_COOKIE, result.raw, {
        httpOnly: true,
        secure: service.config.secureCookies,
        sameSite: 'strict',
        path: '/api/v1',
        expires: result.session.expiresAt,
      });
      return {
        user: result.user,
        csrfToken: result.session.csrfToken,
        expiresAt: result.session.expiresAt.toISOString(),
      };
    },
    undefined,
    'auth',
    true,
  );

  app.get(
    '/api/v1/auth/session',
    { preHandler: authenticated, schema: { tags: ['auth'] } },
    async (request) => {
      const actor = service.actor(request);
      return {
        user: userView(actor.user),
        csrfToken: actor.session.csrfToken,
        expiresAt: actor.session.expiresAt.toISOString(),
      };
    },
  );

  command(
    app,
    'POST',
    '/api/v1/auth/logout',
    z.strictObject({}).default({}),
    async (request, reply) => {
      await db.db
        .collection<Session>('sessions')
        .deleteOne({ _id: service.actor(request).session._id });
      reply.clearCookie(SESSION_COOKIE, {
        path: '/api/v1',
        httpOnly: true,
        secure: service.config.secureCookies,
        sameSite: 'strict',
      });
      return reply.code(204).send();
    },
    authenticated,
    'auth',
  );

  command(
    app,
    'POST',
    '/api/v1/auth/verify-email',
    z.strictObject({ token: opaqueToken }),
    async (_request, _reply, body) => service.activate(body.token, 'VERIFY_EMAIL'),
    undefined,
    'auth',
    true,
  );

  command(
    app,
    'POST',
    '/api/v1/auth/resend-verification',
    z.strictObject({ email }),
    async (_request, reply, body) =>
      reply.code(202).send(await service.requestEmail(body.email, 'VERIFY_EMAIL')),
    undefined,
    'auth',
    true,
  );

  command(
    app,
    'POST',
    '/api/v1/auth/forgot-password',
    z.strictObject({ email }),
    async (_request, reply, body) =>
      reply.code(202).send(await service.requestEmail(body.email, 'RESET')),
    undefined,
    'auth',
    true,
  );

  command(
    app,
    'POST',
    '/api/v1/auth/reset-password',
    z.strictObject({ token: opaqueToken, password }),
    async (_request, _reply, body) => {
      await service.resetPassword(body.token, await hashPassword(body.password));
      return { changed: true };
    },
    undefined,
    'auth',
    true,
  );

  command(
    app,
    'POST',
    '/api/v1/auth/invites/lookup',
    z.strictObject({ token: opaqueToken }),
    async (_request, _reply, body) => {
      const proof = await db.db.collection<AccessToken>('tokens').findOne({
        tokenHash: tokenHash(body.token),
        purpose: 'INVITE',
        consumedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (!proof) throw new AppError(410, 'TOKEN_UNAVAILABLE', 'Link invalido ou indisponivel.');
      const user = await service.users.findOne({ _id: proof.userId, state: 'INVITED' });
      if (!user) throw new AppError(410, 'TOKEN_UNAVAILABLE', 'Link invalido ou indisponivel.');
      return { name: user.name, email: user.email };
    },
    undefined,
    'auth',
    true,
  );

  command(
    app,
    'POST',
    '/api/v1/auth/invites/accept',
    z.strictObject({ token: opaqueToken, password }),
    async (_request, _reply, body) =>
      service.activate(body.token, 'INVITE', await hashPassword(body.password)),
    undefined,
    'auth',
    true,
  );

  app.get('/api/v1/catalog/courses', { schema: { tags: ['catalog'] } }, async () => ({
    items: (
      await service.courses.find({ active: true }).sort({ name: 1, _id: 1 }).limit(200).toArray()
    ).map((item) => ({ id: item._id, name: item.name, code: item.code })),
  }));

  app.get(
    '/api/v1/courses',
    { preHandler: authenticated, schema: { tags: ['courses'] } },
    async (request) => {
      const actor = service.actor(request);
      const ids = actor.user.roles.includes('admin')
        ? null
        : (await service.memberships.find({ userId: actor.user._id, active: true }).toArray()).map(
            (item) => item.courseId,
          );
      return {
        items: (
          await service.courses
            .find({ active: true, ...(ids ? { _id: { $in: ids } } : {}) })
            .sort({ name: 1, _id: 1 })
            .limit(200)
            .toArray()
        ).map(view),
      };
    },
  );

  command(
    app,
    'POST',
    '/api/v1/admin/courses',
    courseInput,
    async (request, reply, body) => {
      const record: Course = { ...entity(), ...body, active: true };
      await db.transaction(async (session) => {
        await service.courses.insertOne(record, { session });
        await db.db
          .collection<Guard>('guards')
          .insertOne({ _id: `course:${record._id}`, version: 0 }, { session });
        await audit(
          db,
          session,
          service.actor(request).user._id,
          'COURSE_CREATED',
          record._id,
          record._id,
        );
      });
      return reply.code(201).send(view(record));
    },
    admin,
    'admin',
  );

  command(
    app,
    'PATCH',
    '/api/v1/admin/courses/:courseId',
    z
      .strictObject({
        expectedVersion: z.number().int().min(1),
        name: name.optional(),
        active: z.boolean().optional(),
      })
      .refine((body) => body.name !== undefined || body.active !== undefined),
    async (request, _reply, body) => {
      const courseId = routeId(request, 'courseId');
      return db.transaction(async (session) => {
        const previous = await service.courses.findOne({ _id: courseId }, { session });
        if (!previous) missing();
        await lock(db, session, `course:${courseId}`);
        const updated = await service.courses.findOneAndUpdate(
          { _id: courseId, version: body.expectedVersion },
          {
            $set: {
              ...(body.name !== undefined ? { name: body.name } : {}),
              ...(body.active !== undefined ? { active: body.active } : {}),
              updatedAt: new Date().toISOString(),
            },
            $inc: { version: 1 },
          },
          { session, returnDocument: 'after' },
        );
        if (!updated) conflict('STALE_VERSION');
        await audit(
          db,
          session,
          service.actor(request).user._id,
          'COURSE_UPDATED',
          courseId,
          courseId,
        );
        return view(updated);
      });
    },
    admin,
    'admin',
  );

  command(
    app,
    'POST',
    '/api/v1/admin/coordinators',
    coordinatorInput,
    async (request, reply, body) => {
      const result = await db.transaction(async (session) => {
        for (const courseId of body.courseIds) {
          if (!(await service.courses.findOne({ _id: courseId, active: true }, { session })))
            missing();
        }
        const existing = await service.users.findOne({ email: body.email }, { session });
        await lock(
          db,
          session,
          ...body.courseIds.map((courseId) => `course:${courseId}`),
          ...(existing ? [`user:${existing._id}`] : []),
        );
        const user: User = existing ?? {
          ...entity(),
          name: body.name,
          email: body.email,
          roles: ['coordinator'],
          state: 'INVITED',
        };
        if (existing?.state === 'DISABLED') conflict('ACCOUNT_DISABLED', 'Conta desativada.');
        if (!existing) {
          await service.users.insertOne(user, { session });
          await db.db
            .collection<Guard>('guards')
            .insertOne({ _id: `user:${user._id}`, version: 0 }, { session });
        } else if (!user.roles.includes('coordinator')) {
          user.roles.push('coordinator');
          await service.users.updateOne(
            { _id: user._id },
            {
              $set: { roles: user.roles, updatedAt: new Date().toISOString() },
              $inc: { version: 1 },
            },
            { session },
          );
          user.version += 1;
        }
        for (const courseId of body.courseIds) {
          const current = await service.memberships.findOne(
            { userId: user._id, courseId, role: 'coordinator' },
            { session },
          );
          if (current)
            await service.memberships.updateOne(
              { _id: current._id },
              { $set: { active: true, updatedAt: new Date().toISOString() }, $inc: { version: 1 } },
              { session },
            );
          else
            await service.memberships.insertOne(
              { ...entity(), userId: user._id, courseId, role: 'coordinator', active: true },
              { session },
            );
        }
        const inviteToken =
          user.state === 'INVITED' ? await service.createToken(user._id, 'INVITE', session) : null;
        await audit(db, session, service.actor(request).user._id, 'COORDINATOR_ASSIGNED', user._id);
        return { user: userView(user), inviteToken };
      });
      return reply.code(201).send(result);
    },
    admin,
    'admin',
  );

  app.get(
    '/api/v1/courses/:courseId/coordinators',
    { preHandler: coordinator, schema: { tags: ['courses'] } },
    async (request) => {
      const courseId = routeId(request, 'courseId');
      await service.course(service.actor(request), courseId);
      const members = await service.memberships
        .find({ courseId, role: 'coordinator' })
        .limit(200)
        .toArray();
      return { items: members.map(view) };
    },
  );

  command(
    app,
    'PATCH',
    '/api/v1/admin/courses/:courseId/coordinators/:userId',
    z.strictObject({ expectedVersion: z.number().int().min(1), active: z.boolean() }),
    async (request, _reply, body) => {
      const courseId = routeId(request, 'courseId');
      const userId = routeId(request, 'userId');
      return db.transaction(async (session) => {
        const previous = await service.memberships.findOne(
          { courseId, userId, role: 'coordinator' },
          { session },
        );
        if (!previous) missing();
        await lock(db, session, `course:${courseId}`, `user:${userId}`);
        const member = await service.memberships.findOneAndUpdate(
          { _id: previous._id, version: body.expectedVersion },
          {
            $set: { active: body.active, updatedAt: new Date().toISOString() },
            $inc: { version: 1 },
          },
          { session, returnDocument: 'after' },
        );
        if (!member) conflict('STALE_VERSION');
        await audit(
          db,
          session,
          service.actor(request).user._id,
          'COORDINATOR_MEMBERSHIP_CHANGED',
          userId,
          courseId,
        );
        return view(member);
      });
    },
    admin,
    'admin',
  );

  command(
    app,
    'PATCH',
    '/api/v1/admin/users/:userId/state',
    z.strictObject({
      expectedVersion: z.number().int().min(1),
      state: z.enum(['ACTIVE', 'DISABLED']),
    }),
    async (request, _reply, body) => {
      const userId = routeId(request, 'userId');
      return db.transaction(async (session) => {
        const user = await service.users.findOne({ _id: userId }, { session });
        if (!user) missing();
        await lock(db, session, `user:${userId}`, 'administrators');
        if (
          user.roles.includes('admin') &&
          body.state === 'DISABLED' &&
          (await service.users.countDocuments(
            { roles: 'admin', state: 'ACTIVE', _id: { $ne: userId } },
            { session },
          )) === 0
        )
          conflict('LAST_ADMIN', 'O ultimo administrador ativo deve ser preservado.');
        if (body.state === 'ACTIVE' && (!user.passwordHash || !user.verifiedAt))
          conflict('ACTIVATION_REQUIRED', 'A conta precisa concluir sua ativacao.');
        const changed = await service.users.findOneAndUpdate(
          { _id: userId, version: body.expectedVersion },
          {
            $set: { state: body.state, updatedAt: new Date().toISOString() },
            $inc: { version: 1 },
          },
          { session, returnDocument: 'after' },
        );
        if (!changed) conflict('STALE_VERSION');
        await db.db.collection<Session>('sessions').deleteMany({ userId }, { session });
        await audit(db, session, service.actor(request).user._id, 'ACCOUNT_STATE_CHANGED', userId);
        return userView(changed);
      });
    },
    admin,
    'admin',
  );

  app.get(
    '/api/v1/admin/users',
    { preHandler: admin, schema: { tags: ['admin'] } },
    async (request) => {
      const query = parse(
        z.strictObject({
          limit: z
            .string()
            .regex(/^\d+$/)
            .transform(Number)
            .pipe(z.number().int().min(1).max(100))
            .default(50),
          offset: z
            .string()
            .regex(/^\d+$/)
            .transform(Number)
            .pipe(z.number().int().min(0).max(10000))
            .default(0),
        }),
        request.query,
      );
      return {
        items: (
          await service.users
            .find()
            .sort({ createdAt: 1, _id: 1 })
            .skip(query.offset)
            .limit(query.limit)
            .toArray()
        ).map(userView),
      };
    },
  );
}
