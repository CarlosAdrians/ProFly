import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Document } from 'mongodb';
import type { IdentityService } from '../identity/service.js';
import type { Session } from '../identity/models.js';
import { userView } from '../identity/models.js';
import { verifyPassword } from '../shared/crypto.js';
import { command, routeId } from '../shared/http.js';
import { AppError, conflict, missing, parse } from '../shared/errors.js';
import { audit, entity, lock, view, type Entity } from '../shared/model.js';

export const rightKinds = [
  'ACCESS',
  'CONFIRMATION',
  'CORRECTION',
  'ERASURE',
  'ANONYMIZATION',
  'BLOCKING',
  'PORTABILITY',
  'SHARING',
  'OPPOSITION',
  'CONSENT_REVOCATION',
  'REVIEW',
] as const;
export interface PrivacyRequest extends Entity {
  userId: string;
  kind: (typeof rightKinds)[number];
  message: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESPONDED';
  accessDueAt: string | null;
  events: { at: string; status: PrivacyRequest['status']; response: string | null }[];
}
export function privacyRoutes(app: FastifyInstance, identity: IdentityService) {
  const database = identity.database,
    db = database.db;
  const requests = db.collection<PrivacyRequest>('privacyRequests');
  app.get('/api/v1/catalog/privacy', async () => identity.config.privacy);
  for (const admin of [false, true]) {
    app.get(
      admin ? '/api/v1/admin/privacy/requests' : '/api/v1/me/privacy/requests',
      {
        preHandler: identity.guard(admin ? ['admin'] : undefined),
      },
      async (request) => {
        const query = parse(
          z.strictObject({ cursor: z.string().max(160).optional() }),
          request.query,
        );
        const actor = identity.actor(request);
        let boundary: { createdAt: string; id: string } | null = null;
        if (query.cursor) {
          try {
            boundary = z
              .strictObject({ createdAt: z.iso.datetime(), id: z.uuid() })
              .parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString()));
          } catch {
            throw new AppError(422, 'INVALID_CURSOR', 'Paginacao invalida.');
          }
        }
        const items = await requests
          .find({
            ...(!admin ? { userId: actor.user._id } : {}),
            ...(boundary
              ? {
                  $or: [
                    { createdAt: { $lt: boundary.createdAt } },
                    { createdAt: boundary.createdAt, _id: { $lt: boundary.id } },
                  ],
                }
              : {}),
          })
          .sort({ createdAt: -1, _id: -1 })
          .limit(51)
          .toArray();
        return {
          items: items.slice(0, 50).map(view),
          hasMore: items.length > 50,
          nextCursor:
            items.length > 50
              ? Buffer.from(
                  JSON.stringify({ createdAt: items[49]!.createdAt, id: items[49]!._id }),
                ).toString('base64url')
              : null,
        };
      },
    );
  }
  command(
    app,
    'POST',
    '/api/v1/me/privacy/requests',
    z.strictObject({
      kind: z.enum(rightKinds),
      message: z.string().trim().min(10).max(1200),
    }),
    async (request, reply, body) => {
      const actor = identity.actor(request);
      const record: PrivacyRequest = {
        ...entity(),
        userId: actor.user._id,
        ...body,
        status: 'OPEN',
        accessDueAt: ['ACCESS', 'CONFIRMATION'].includes(body.kind)
          ? new Date(Date.now() + 15 * 86400000).toISOString()
          : null,
        events: [{ at: new Date().toISOString(), status: 'OPEN', response: null }],
      };
      await database.transaction(async (session) => {
        await lock(database, session, `user:${actor.user._id}`);
        await requests.insertOne(record, { session });
        await audit(database, session, actor.user._id, 'PRIVACY_REQUEST_CREATED', record._id);
      });
      return reply.code(201).send(view(record));
    },
    identity.guard(),
    'privacy',
    true,
  );
  command(
    app,
    'PATCH',
    '/api/v1/admin/privacy/requests/:requestId',
    z.strictObject({
      expectedVersion: z.number().int().min(1),
      status: z.enum(['IN_REVIEW', 'RESPONDED']),
      response: z.string().trim().min(20).max(2000),
    }),
    async (request, _reply, body) =>
      database.transaction(async (session) => {
        const actor = identity.actor(request),
          requestId = routeId(request, 'requestId');
        const old = await requests.findOne({ _id: requestId }, { session });
        if (!old) missing();
        if (old.version !== body.expectedVersion) conflict('STALE_VERSION');
        if (old.status === 'RESPONDED')
          conflict(
            'PRIVACY_REQUEST_CLOSED',
            'A resposta anterior e preservada. Abra novo protocolo para complementar.',
          );
        const now = new Date().toISOString();
        const updated = await requests.findOneAndUpdate(
          { _id: requestId, version: body.expectedVersion },
          {
            $set: { status: body.status, updatedAt: now },
            $inc: { version: 1 },
            $push: { events: { at: now, status: body.status, response: body.response } },
          },
          { session, returnDocument: 'after' },
        );
        if (!updated) conflict('STALE_VERSION');
        await audit(database, session, actor.user._id, 'PRIVACY_REQUEST_RESPONDED', requestId);
        return view(updated);
      }),
    identity.guard(['admin']),
    'privacy',
    true,
  );

  command(
    app,
    'POST',
    '/api/v1/me/privacy/export',
    z.strictObject({
      currentPassword: z.string().min(1).max(72),
    }),
    async (request, reply, body) => {
      const actor = identity.actor(request);
      if (!(await verifyPassword(body.currentPassword, actor.user.passwordHash)))
        throw new AppError(403, 'CURRENT_PASSWORD_INVALID', 'Senha atual invalida.');
      const result = await database.transaction(async (session) => {
        await lock(database, session, `user:${actor.user._id}`);
        const user = await identity.users.findOne(
          { _id: actor.user._id, state: 'ACTIVE', passwordHash: actor.user.passwordHash },
          { session },
        );
        if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Entre novamente.');
        const activeSession = await db
          .collection<Session>('sessions')
          .findOne(
            { _id: actor.session._id, userId: actor.user._id, expiresAt: { $gt: new Date() } },
            { session },
          );
        if (!activeSession) throw new AppError(401, 'UNAUTHENTICATED', 'Entre novamente.');
        let totalBytes = 0;
        async function records(collection: string, filter: Document, projection: Document) {
          const values: Document[] = [];
          const cursor = db
            .collection(collection)
            .find(filter, { session, projection })
            .limit(5001)
            .batchSize(50);
          try {
            for await (const item of cursor) {
              totalBytes += Buffer.byteLength(JSON.stringify(item));
              if (values.length >= 5000 || totalBytes > 10 * 1024 * 1024)
                throw new AppError(
                  413,
                  'EXPORT_TOO_LARGE',
                  'Solicite acesso completo pelo protocolo de privacidade.',
                );
              values.push(item);
            }
          } finally {
            await cursor.close();
          }
          return values;
        }
        const own = { teacherId: user._id },
          sameId = { _id: user._id };
        // Inclusion projections: credentials, tokens, third-party identities and binary attachments never enter the bundle.
        const datasets: Record<string, Document[]> = {};
        const sources: [string, Document, Document][] = [
          ['profiles', sameId, { data: 1, version: 1, createdAt: 1, updatedAt: 1 }],
          ['profileVersions', own, { data: 1, profileVersion: 1, source: 1, createdAt: 1 }],
          ['memberships', { userId: user._id }, { courseId: 1, role: 1, active: 1, createdAt: 1 }],
          [
            'applications',
            own,
            {
              courseId: 1,
              subjectIds: 1,
              status: 1,
              reason: 1,
              profileVersion: 1,
              reviewedAt: 1,
              createdAt: 1,
            },
          ],
          [
            'reviews',
            own,
            {
              courseId: 1,
              subjectIds: 1,
              profileVersion: 1,
              items: 1,
              experienceDeclarations: 1,
              createdAt: 1,
            },
          ],
          [
            'legalAcceptances',
            { userId: user._id },
            { version: 1, termsAccepted: 1, privacyAcknowledged: 1, acceptedAt: 1 },
          ],
          ['registrationIntents', sameId, { requests: 1 }],
          ['workloads', sameId, { weeklyMinutes: 1, validFrom: 1, validUntil: 1, timeZone: 1 }],
          [
            'occurrences',
            own,
            {
              courseId: 1,
              subjectId: 1,
              date: 1,
              startsAt: 1,
              endsAt: 1,
              minutes: 1,
              status: 1,
              replacementId: 1,
              courseName: 1,
              subjectName: 1,
              groupName: 1,
              room: 1,
            },
          ],
          [
            'publishedAllocations',
            own,
            { courseId: 1, periodId: 1, offeringId: 1, meetings: 1, room: 1, createdAt: 1 },
          ],
          ['absences', own, { startsOn: 1, endsOn: 1, courseIds: 1, attachment: 1, createdAt: 1 }],
          [
            'academicDocuments',
            own,
            {
              profileVersion: 1,
              section: 1,
              itemId: 1,
              title: 1,
              state: 1,
              attachment: 1,
              version: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
          ['preferences', sameId, { notifications: 1, updatedAt: 1 }],
          ['notices', { userId: user._id }, { kind: 1, title: 1, read: 1, createdAt: 1 }],
          [
            'privacyRequests',
            { userId: user._id },
            { kind: 1, message: 1, status: 1, events: 1, accessDueAt: 1, createdAt: 1 },
          ],
        ];
        for (const [name, filter, projection] of sources)
          datasets[name] = await records(name, filter, projection);
        const bundle = {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          account: {
            ...userView(user),
            createdAt: user.createdAt,
            verifiedAt: user.verifiedAt ?? null,
          },
          datasets,
          privateFiles: {
            academicDocuments: datasets
              .academicDocuments!.filter((document) => document.attachment)
              .map((document) => `/api/v1/me/academic-documents/${String(document._id)}/file`),
            photo: (user.photoVersion ?? 0) > 0 ? '/api/v1/me/photo' : null,
            certificates: datasets
              .absences!.filter((a) => a.attachment)
              .map((a) => `/api/v1/me/absences/${String(a._id)}/attachment`),
          },
          scope:
            'Copia dos dados estruturados disponiveis nesta conta. Arquivos privados sao baixados separadamente com autenticacao. Para declaracao completa, criterios e origem ou outro direito, abra um protocolo. Nao constitui portabilidade regulada nem anonimizacao.',
        };
        const serialized = JSON.stringify(bundle);
        if (Buffer.byteLength(serialized) > 10 * 1024 * 1024)
          throw new AppError(
            413,
            'EXPORT_TOO_LARGE',
            'Solicite acesso completo pelo protocolo de privacidade.',
          );
        await audit(database, session, user._id, 'PRIVACY_DATA_EXPORTED', user._id);
        return serialized;
      });
      return reply
        .type('application/json; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="profly-meus-dados.json"')
        .send(result);
    },
    identity.guard(),
    'privacy',
    true,
  );
}
