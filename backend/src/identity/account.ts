import type { FastifyInstance } from 'fastify';
import { Binary } from 'mongodb';
import sharp from 'sharp';
import { z } from 'zod';
import type { IdentityService } from './service.js';
import { userView, type AccessToken, type Session } from './models.js';
import { command, email, name, id } from '../shared/http.js';
import { phone } from '../shared/phone.js';
import { AppError, conflict, missing } from '../shared/errors.js';
import { audit, lock } from '../shared/model.js';
import { hashPassword, tokenHash, verifyPassword } from '../shared/crypto.js';
import { profileData, type ProfileData } from '../teachers/contracts.js';
import { validateImage } from '../scheduling/media.js';
export const LEGAL_VERSION = '2026-10-24.4';
export const legalAcceptance = z.strictObject({
  version: z.literal(LEGAL_VERSION),
  termsAccepted: z.literal(true),
  privacyAcknowledged: z.literal(true),
});
export const registrationRequests = z
  .array(
    z.strictObject({
      courseId: id,
      subjectIds: z
        .array(id)
        .min(1)
        .max(50)
        .refine((v) => new Set(v).size === v.length),
    }),
  )
  .max(20)
  .refine((v) => new Set(v.map((i) => i.courseId)).size === v.length);
export type Enrollment = {
  profile: ProfileData;
  legal: z.infer<typeof legalAcceptance>;
  requests?: z.infer<typeof registrationRequests>;
};
export function accountRoutes(app: FastifyInstance, identity: IdentityService) {
  const db = identity.database,
    authenticated = identity.guard();
  const photos = db.db.collection<{ _id: string; bytes: Binary }>('photos');
  app.get('/api/v1/catalog/legal', async () => ({ version: LEGAL_VERSION }));
  command(
    app,
    'POST',
    '/api/v1/auth/enroll',
    z.strictObject({
      name,
      email,
      password: z.string().min(8).max(72).regex(/\p{L}/u).regex(/[0-9]/),
      profile: profileData,
      legal: legalAcceptance,
      requests: registrationRequests.optional(),
    }),
    async (_request, reply, body) => reply.code(201).send(await identity.register(body, body)),
    undefined,
    'auth',
    true,
  );
  command(
    app,
    'PUT',
    '/api/v1/me/account',
    z.strictObject({ expectedVersion: z.number().int().min(1), name, phone }),
    async (request, _reply, body) => {
      const actor = identity.actor(request);
      return db.transaction(async (session) => {
        await lock(db, session, `user:${actor.user._id}`);
        const updated = await identity.users.findOneAndUpdate(
          { _id: actor.user._id, state: 'ACTIVE', version: body.expectedVersion },
          {
            $set: { name: body.name, phone: body.phone, updatedAt: new Date().toISOString() },
            $inc: { version: 1 },
          },
          { session, returnDocument: 'after' },
        );
        if (!updated) conflict('STALE_VERSION');
        await audit(db, session, actor.user._id, 'ACCOUNT_UPDATED', updated._id);
        return userView(updated);
      });
    },
    authenticated,
    'account',
  );
  command(
    app,
    'POST',
    '/api/v1/me/email-change',
    z.strictObject({
      expectedVersion: z.number().int().min(1),
      email,
      password: z.string().min(1).max(72),
    }),
    async (request, reply, body) => {
      const actor = identity.actor(request);
      if (!identity.notifications)
        throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Envio nao configurado.');
      if (!(await verifyPassword(body.password, actor.user.passwordHash)))
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Confira sua senha atual.');
      const raw = await db.transaction(async (session) => {
        await lock(db, session, `user:${actor.user._id}`);
        const user = await identity.users.findOne(
          {
            _id: actor.user._id,
            state: 'ACTIVE',
            version: body.expectedVersion,
            passwordHash: actor.user.passwordHash,
          },
          { session },
        );
        if (!user) conflict('STALE_VERSION');
        if (user.email === body.email)
          throw new AppError(422, 'EMAIL_UNCHANGED', 'Informe o novo e-mail.');
        await db.db
          .collection<AccessToken>('tokens')
          .updateMany(
            { userId: user._id, purpose: 'CHANGE_EMAIL', consumedAt: null },
            { $set: { consumedAt: new Date() } },
            { session },
          );
        const raw = await identity.createToken(user._id, 'CHANGE_EMAIL', session);
        await db.db
          .collection<AccessToken>('tokens')
          .updateOne({ tokenHash: tokenHash(raw) }, { $set: { email: body.email } }, { session });
        await audit(db, session, user._id, 'EMAIL_CHANGE_REQUESTED', user._id);
        return raw;
      });
      try {
        await identity.notifications.send({
          email: body.email,
          purpose: 'VERIFY_EMAIL',
          token: raw,
        });
      } catch {
        throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Nao foi possivel enviar a verificacao.');
      }
      return reply.code(202).send({ verificationRequired: true });
    },
    authenticated,
    'account',
    true,
  );
  app.post('/api/v1/me/photo', { preHandler: authenticated }, async (request, reply) => {
    const actor = identity.actor(request),
      file = await request.file();
    if (!file) throw new AppError(422, 'FILE_REQUIRED', 'Selecione a foto.');
    const bytes = await validateImage(await file.toBuffer(), file.mimetype, 2 * 1024 * 1024);
    const normalized = await sharp(bytes, { limitInputPixels: 16000000 })
      .rotate()
      .resize(256, 256, { fit: 'cover' })
      .jpeg({ quality: 88 })
      .toBuffer();
    await db.transaction(async (session) => {
      await lock(db, session, `user:${actor.user._id}`);
      await photos.replaceOne(
        { _id: actor.user._id },
        { bytes: new Binary(normalized) },
        { session, upsert: true },
      );
      await identity.users.updateOne(
        { _id: actor.user._id },
        { $inc: { version: 1, photoVersion: 1 }, $set: { updatedAt: new Date().toISOString() } },
        { session },
      );
      await audit(db, session, actor.user._id, 'PHOTO_UPDATED', actor.user._id);
    });
    return reply.code(201).send({ saved: true });
  });
  app.get('/api/v1/me/photo', { preHandler: authenticated }, async (request, reply) => {
    const photo = await photos.findOne({ _id: identity.actor(request).user._id });
    if (!photo) missing();
    return reply.type('image/jpeg').send(Buffer.from(photo.bytes.value()));
  });
  command(
    app,
    'DELETE',
    '/api/v1/me/photo',
    z.strictObject({}),
    async (request, reply) => {
      const actor = identity.actor(request);
      await db.transaction(async (session) => {
        await lock(db, session, `user:${actor.user._id}`);
        await photos.deleteOne({ _id: actor.user._id }, { session });
        await identity.users.updateOne(
          { _id: actor.user._id },
          { $inc: { version: 1 }, $set: { photoVersion: 0, updatedAt: new Date().toISOString() } },
          { session },
        );
        await audit(db, session, actor.user._id, 'PHOTO_REMOVED', actor.user._id);
      });
      return reply.code(204).send();
    },
    authenticated,
    'account',
  );
  command(
    app,
    'POST',
    '/api/v1/me/password',
    z.strictObject({
      password: z.string().min(1).max(72),
      newPassword: z.string().min(8).max(72).regex(/\p{L}/u).regex(/[0-9]/),
    }),
    async (request, _reply, body) => {
      const actor = identity.actor(request);
      if (!(await verifyPassword(body.password, actor.user.passwordHash)))
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Confira sua senha atual.');
      const hash = await hashPassword(body.newPassword);
      await db.transaction(async (session) => {
        await lock(db, session, `user:${actor.user._id}`);
        const user = await identity.users.findOne(
          { _id: actor.user._id, state: 'ACTIVE', passwordHash: actor.user.passwordHash },
          { session },
        );
        if (!user) conflict('STALE_VERSION');
        await identity.users.updateOne(
          { _id: user._id },
          {
            $set: { passwordHash: hash, updatedAt: new Date().toISOString() },
            $inc: { version: 1 },
          },
          { session },
        );
        await db.db.collection<Session>('sessions').deleteMany({ userId: user._id }, { session });
        await db.db
          .collection<AccessToken>('tokens')
          .updateMany(
            { userId: user._id, consumedAt: null },
            { $set: { consumedAt: new Date() } },
            { session },
          );
        await audit(db, session, user._id, 'PASSWORD_CHANGED', user._id);
      });
      return { changed: true, loginRequired: true };
    },
    authenticated,
    'account',
    true,
  );
}
