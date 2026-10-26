import type { FastifyInstance } from 'fastify';
import { Binary, type ClientSession } from 'mongodb';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { IdentityService } from '../identity/service.js';
import type { TeacherProfile, Application } from '../teachers/models.js';
import { command, id, name, routeId } from '../shared/http.js';
import { AppError, conflict, missing, parse } from '../shared/errors.js';
import { audit, entity, lock, view, type Entity } from '../shared/model.js';
import { validateDocument, documentExtension } from './validate.js';

export interface AcademicDocument extends Entity {
  teacherId: string;
  profileVersion: number;
  section: 'education' | 'knowledge' | 'teaching' | 'professional';
  itemId: string;
  title: string;
  state: 'ACTIVE' | 'WITHDRAWN';
  attachment?: { bytes: number; type: string; sha256: string };
}
interface PrivateFile {
  _id: string;
  bytes: Binary;
  type: string;
}
const query = z.strictObject({
  cursor: id.optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default(50),
});

export function documentRoutes(app: FastifyInstance, identity: IdentityService) {
  const database = identity.database,
    db = database.db;
  const documents = db.collection<AcademicDocument>('academicDocuments');
  const files = db.collection<PrivateFile>('academicFiles');
  const teacher = identity.guard(['teacher']);
  const coordinator = identity.guard(['coordinator']);
  async function active(userId: string, session: ClientSession) {
    if (!(await identity.users.findOne({ _id: userId, state: 'ACTIVE' }, { session })))
      throw new AppError(401, 'UNAUTHENTICATED', 'Entre na sua conta.');
  }
  async function own(documentId: string, userId: string) {
    const record = await documents.findOne({ _id: documentId, teacherId: userId });
    if (!record) missing();
    return record;
  }
  command(
    app,
    'POST',
    '/api/v1/me/academic-documents',
    z.strictObject({
      profileVersion: z.number().int().min(1),
      section: z.enum(['education', 'knowledge', 'teaching', 'professional']),
      itemId: id,
      title: name,
    }),
    async (request, reply, body) => {
      const actor = identity.actor(request);
      const record = await database.transaction(async (session) => {
        await lock(database, session, `user:${actor.user._id}`);
        await active(actor.user._id, session);
        const profile = await db
          .collection<TeacherProfile>('profiles')
          .findOne({ _id: actor.user._id }, { session });
        if (!profile || profile.version !== body.profileVersion) conflict('STALE_PROFILE');
        const entries =
          body.section === 'education' || body.section === 'knowledge'
            ? profile.data[body.section]
            : profile.data[body.section]?.entries;
        if (!entries?.some((entry) => entry.id === body.itemId))
          throw new AppError(
            422,
            'INVALID_DOCUMENT_ITEM',
            'Selecione um item do seu perfil atual.',
          );
        if ((await documents.countDocuments({ teacherId: actor.user._id }, { session })) >= 100)
          throw new AppError(
            413,
            'DOCUMENT_QUOTA',
            'Limite de 100 documentos por conta. Solicite atendimento.',
          );
        const value: AcademicDocument = {
          ...entity(),
          ...body,
          teacherId: actor.user._id,
          state: 'ACTIVE',
        };
        await documents.insertOne(value, { session });
        await audit(database, session, actor.user._id, 'ACADEMIC_DOCUMENT_CREATED', value._id);
        return view(value);
      });
      return reply.code(201).send(record);
    },
    teacher,
    'documents',
  );

  app.post(
    '/api/v1/me/academic-documents/:documentId/file',
    { preHandler: teacher },
    async (request, reply) => {
      const actor = identity.actor(request),
        documentId = routeId(request, 'documentId');
      const initial = await own(documentId, actor.user._id);
      if (initial.attachment || initial.state !== 'ACTIVE') conflict('DOCUMENT_LOCKED');
      const file = await request.file();
      if (!file) throw new AppError(422, 'FILE_REQUIRED', 'Selecione o comprovante.');
      const bytes = await validateDocument(
        await file.toBuffer(),
        file.mimetype,
        identity.config.uploadMaxBytes,
      );
      await database.transaction(async (session) => {
        await lock(database, session, `user:${actor.user._id}`);
        await active(actor.user._id, session);
        const record = await documents.findOne(
          { _id: documentId, teacherId: actor.user._id },
          { session },
        );
        if (!record) missing();
        if (record.attachment || record.state !== 'ACTIVE') conflict('DOCUMENT_LOCKED');
        const stored = await documents.find({ teacherId: actor.user._id }, { session }).toArray();
        if (
          stored.reduce((total, item) => total + (item.attachment?.bytes ?? 0), 0) + bytes.length >
          50 * 1024 * 1024
        )
          throw new AppError(413, 'DOCUMENT_QUOTA', 'Limite de 50 MB de documentos por conta.');
        await files.insertOne(
          { _id: documentId, bytes: new Binary(bytes), type: file.mimetype },
          { session },
        );
        await documents.updateOne(
          { _id: documentId },
          {
            $set: {
              attachment: {
                bytes: bytes.length,
                type: file.mimetype,
                sha256: createHash('sha256').update(bytes).digest('hex'),
              },
              updatedAt: new Date().toISOString(),
            },
            $inc: { version: 1 },
          },
          { session },
        );
        await audit(database, session, actor.user._id, 'ACADEMIC_DOCUMENT_UPLOADED', documentId);
      });
      return reply.code(201).send({ uploaded: true });
    },
  );

  command(
    app,
    'POST',
    '/api/v1/me/academic-documents/:documentId/withdraw',
    z.strictObject({ expectedVersion: z.number().int().min(1) }),
    async (request, _reply, body) => {
      const actor = identity.actor(request),
        documentId = routeId(request, 'documentId');
      return database.transaction(async (session) => {
        await lock(database, session, `user:${actor.user._id}`);
        await active(actor.user._id, session);
        const record = await documents.findOne(
          { _id: documentId, teacherId: actor.user._id },
          { session },
        );
        if (!record) missing();
        if (record.version !== body.expectedVersion) conflict('STALE_VERSION');
        if (record.state !== 'ACTIVE') conflict('DOCUMENT_LOCKED');
        const updated = await documents.findOneAndUpdate(
          { _id: documentId },
          {
            $set: {
              state: 'WITHDRAWN',
              updatedAt: new Date().toISOString(),
            },
            $inc: { version: 1 },
          },
          { session, returnDocument: 'after' },
        );
        await audit(database, session, actor.user._id, 'ACADEMIC_DOCUMENT_WITHDRAWN', documentId);
        return view(updated!);
      });
    },
    teacher,
    'documents',
  );

  for (const asTeacher of [true, false]) {
    app.get(
      asTeacher
        ? '/api/v1/me/academic-documents'
        : '/api/v1/courses/:courseId/applications/:applicationId/documents',
      { preHandler: asTeacher ? teacher : coordinator },
      async (request) => {
        const actor = identity.actor(request),
          page = parse(query, request.query);
        let filter: {
          teacherId: string;
          profileVersion?: number;
          state?: 'ACTIVE';
          attachment?: object;
        } = { teacherId: actor.user._id };
        if (!asTeacher) {
          const courseId = routeId(request, 'courseId');
          await identity.coordinatedCourse(actor, courseId);
          const application = await db.collection<Application>('applications').findOne({
            _id: routeId(request, 'applicationId'),
            courseId,
          });
          if (!application) missing();
          filter = {
            teacherId: application.teacherId,
            profileVersion: application.profileVersion,
            state: 'ACTIVE',
            attachment: { $exists: true },
          };
        }
        const values = await documents
          .find({ ...filter, ...(page.cursor ? { _id: { $gt: page.cursor } } : {}) })
          .sort({ _id: 1 })
          .limit(page.limit + 1)
          .toArray();
        const hasMore = values.length > page.limit;
        return {
          items: values.slice(0, page.limit).map(view),
          nextCursor: hasMore ? values[page.limit - 1]!._id : null,
        };
      },
    );
    app.get(
      asTeacher
        ? '/api/v1/me/academic-documents/:documentId/file'
        : '/api/v1/courses/:courseId/academic-documents/:documentId/file',
      { preHandler: asTeacher ? teacher : coordinator },
      async (request, reply) => {
        const actor = identity.actor(request),
          documentId = routeId(request, 'documentId');
        const record = await documents.findOne({ _id: documentId });
        if (!record) missing();
        let courseId: string | undefined;
        if (asTeacher) {
          if (record.teacherId !== actor.user._id) missing();
        } else {
          courseId = routeId(request, 'courseId');
          await identity.coordinatedCourse(actor, courseId);
          if (
            record.state !== 'ACTIVE' ||
            !(await db.collection<Application>('applications').findOne({
              teacherId: record.teacherId,
              courseId,
              profileVersion: record.profileVersion,
            }))
          )
            missing();
        }
        const file = await files.findOne({ _id: documentId });
        if (!file) missing();
        await database.transaction((session) =>
          audit(
            database,
            session,
            actor.user._id,
            'ACADEMIC_DOCUMENT_DOWNLOADED',
            documentId,
            courseId,
          ),
        );
        return reply
          .type(file.type)
          .header(
            'Content-Disposition',
            `attachment; filename="comprovante.${documentExtension(file.type)}"`,
          )
          .header('Content-Security-Policy', "default-src 'none'; sandbox")
          .send(Buffer.from(file.bytes.value()));
      },
    );
  }
}
