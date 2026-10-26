import type { FastifyInstance } from 'fastify';
import { Binary } from 'mongodb';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { listQuery, pageOf } from '../shared/pagination.js';
import type { IdentityService } from '../identity/service.js';
import type { Actor } from '../identity/models.js';
import { command, id, routeId } from '../shared/http.js';
import { date } from '../shared/temporal.js';
import { AppError, conflict, missing, parse } from '../shared/errors.js';
import { audit, entity, lock, view, type Entity } from '../shared/model.js';
import {
  absenceInput,
  allocationInput,
  workloadInput,
  type Absence,
  type Notice,
  type Preference,
  type Workload,
} from './models.js';
import { SchedulingService, notify } from './service.js';
import { validateDocument, documentExtension } from '../documents/validate.js';

const version = z.number().int().min(1);
const page = z
  .strictObject({
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
      .default(10),
    before: z.string().datetime().optional(),
    cursorId: id.optional(),
    courseId: id.optional(),
    subjectId: id.optional(),
    from: date.optional(),
    until: date.optional(),
  })
  .refine((q) => !!q.before === !!q.cursorId);
export function schedulingRoutes(app: FastifyInstance, identity: IdentityService) {
  const service = new SchedulingService(identity),
    db = identity.database;
  const coordinator = identity.guard(['coordinator', 'admin']),
    teacher = identity.guard(['teacher']),
    authenticated = identity.guard();
  const absences = db.db.collection<Absence>('absences');
  const preferences = db.db.collection<Preference>('preferences');
  const notices = db.db.collection<Notice>('notices');
  const certificates = db.db.collection<{
    _id: string;
    bytes: Binary;
    type: string;
    sha256: string;
  }>('certificates');
  app.get('/api/v1/me/preferences', { preHandler: authenticated }, async (request) => {
    const record = await preferences.findOne({ _id: identity.actor(request).user._id });
    return record ? view(record) : { version: 0, notifications: true };
  });
  command(
    app,
    'PUT',
    '/api/v1/me/preferences',
    z.strictObject({ expectedVersion: z.number().int().min(0), notifications: z.boolean() }),
    async (request, _reply, body) => {
      const actor = identity.actor(request);
      return db.transaction(async (session) => {
        await lock(db, session, `user:${actor.user._id}`);
        const old = await preferences.findOne({ _id: actor.user._id }, { session });
        if ((old?.version ?? 0) !== body.expectedVersion) conflict('STALE_VERSION');
        const record = {
          ...(old ?? entity(actor.user._id)),
          notifications: body.notifications,
          version: (old?.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        await preferences.replaceOne({ _id: actor.user._id }, record, { session, upsert: !old });
        return view(record);
      });
    },
    authenticated,
    'notifications',
  );
  app.get('/api/v1/me/notifications', { preHandler: authenticated }, async (request) => {
    const page = parse(listQuery, request.query),
      userId = identity.actor(request).user._id;
    const values = await notices
      .find({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .skip(page.offset)
      .limit(page.limit + 1)
      .toArray();
    return {
      ...pageOf(values.map(view), page),
      unreadCount: await notices.countDocuments({ userId, read: false }),
    };
  });
  command(
    app,
    'POST',
    '/api/v1/me/notifications/:noticeId/read',
    z.strictObject({ expectedVersion: version }),
    async (request, _reply, body) => {
      const userId = identity.actor(request).user._id;
      const record = await notices.findOneAndUpdate(
        { _id: routeId(request, 'noticeId'), userId, version: body.expectedVersion },
        { $set: { read: true, updatedAt: new Date().toISOString() }, $inc: { version: 1 } },
        { returnDocument: 'after' },
      );
      if (!record) conflict('STALE_VERSION');
      return view(record);
    },
    authenticated,
    'notifications',
  );
  app.get(
    '/api/v1/admin/teachers/:teacherId/workload',
    { preHandler: identity.guard(['admin']) },
    async (request) => {
      const record = await db.db
        .collection<Workload>('workloads')
        .findOne({ _id: routeId(request, 'teacherId') });
      return record ? view(record) : { version: 0 };
    },
  );
  command(
    app,
    'PUT',
    '/api/v1/admin/teachers/:teacherId/workload',
    workloadInput,
    async (request, _reply, body) => {
      const actor = identity.actor(request),
        teacherId = routeId(request, 'teacherId');
      return db.transaction(async (session) => {
        await lock(db, session, 'academics', `user:${actor.user._id}`, `user:${teacherId}`);
        if (!(await identity.users.findOne({ _id: teacherId, roles: 'teacher' }, { session })))
          missing();
        const collection = db.db.collection<Workload>('workloads'),
          old = await collection.findOne({ _id: teacherId }, { session });
        if ((old?.version ?? 0) !== body.expectedVersion) conflict('STALE_VERSION');
        const { expectedVersion, ...data } = body;
        void expectedVersion;
        const record: Workload = {
          ...(old ?? entity(teacherId)),
          ...data,
          teacherId,
          version: (old?.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        await collection.replaceOne({ _id: teacherId }, record, { session, upsert: !old });
        await audit(db, session, actor.user._id, 'WORKLOAD_CONFIGURED', teacherId);
        return view(record);
      });
    },
    identity.guard(['admin']),
    'scheduling',
  );
  app.get('/api/v1/courses/:courseId/teachers', { preHandler: coordinator }, async (request) => {
    const courseId = routeId(request, 'courseId');
    await identity.course(identity.actor(request), courseId);
    const page = parse(
      listQuery.extend({ limit: listQuery.shape.limit.default(200) }),
      request.query,
    );
    const values = await identity.memberships
      .aggregate<{ id: string; name: string; email: string }>([
        { $match: { courseId, role: 'teacher', active: true } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $match: { 'user.state': 'ACTIVE', 'user.roles': 'teacher' } },
        { $project: { _id: 0, id: '$user._id', name: '$user.name', email: '$user.email' } },
        { $sort: { name: 1, id: 1 } },
        { $skip: page.offset },
        { $limit: page.limit + 1 },
      ])
      .toArray();
    return pageOf(values, page);
  });
  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/eligibility',
    allocationInput.extend({ allocationId: id.optional() }),
    async (request, _reply, body) => {
      const actor = identity.actor(request),
        courseId = routeId(request, 'courseId');
      return service.authorized(actor, courseId, async (session) => {
        if (
          body.allocationId &&
          !(await service.allocations.findOne({ _id: body.allocationId, courseId }, { session }))
        )
          missing();
        const { result } = await service.assessment(courseId, body, session, body.allocationId);
        await db.db
          .collection<{ _id: string } & Record<string, unknown>>('evaluations')
          .insertOne({ ...entity(), courseId, actorId: actor.user._id, ...result }, { session });
        return result;
      });
    },
    coordinator,
    'eligibility',
  );
  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/recommendations',
    z.strictObject({
      offeringId: id,
      meetings: allocationInput.shape.meetings,
      allocationId: id.optional(),
    }),
    async (request, _reply, body) => {
      const actor = identity.actor(request),
        courseId = routeId(request, 'courseId');
      return service.authorized(actor, courseId, async (session) => {
        await service.context(
          courseId,
          { offeringId: body.offeringId, teacherId: actor.user._id, meetings: body.meetings },
          session,
        );
        if (
          body.allocationId &&
          !(await service.allocations.findOne({ _id: body.allocationId, courseId }, { session }))
        )
          missing();
        const members = await identity.memberships
          .find({ courseId, role: 'teacher', active: true }, { session })
          .sort({ userId: 1 })
          .toArray();
        if (members.length > 200)
          throw new AppError(
            422,
            'CANDIDATE_LIMIT',
            'Use a avaliacao individual; este curso excede o limite de comparacao em uma requisicao.',
          );
        const results = [];
        for (const member of members) {
          const teacher = await identity.users.findOne(
            { _id: member.userId, state: 'ACTIVE', roles: 'teacher' },
            { session },
          );
          if (!teacher) continue;
          const { result } = await service.assessment(
            courseId,
            { offeringId: body.offeringId, teacherId: member.userId, meetings: body.meetings },
            session,
            body.allocationId,
          );
          await db.db
            .collection<{ _id: string } & Record<string, unknown>>('evaluations')
            .insertOne({ ...entity(), courseId, actorId: actor.user._id, ...result }, { session });
          results.push({ ...result, name: teacher.name });
        }
        const ranked = results
          .filter((r) => r.eligibility === 'ELIGIBLE' && r.score.state === 'CALCULATED')
          .sort(
            (a, b) => b.score.value! - a.score.value! || a.teacherId.localeCompare(b.teacherId),
          );
        const ranks = new Map<string, number>();
        let rank = 0;
        let last: number | null = null;
        ranked.forEach((r, index) => {
          if (last !== r.score.value) {
            rank = index + 1;
            last = r.score.value;
          }
          ranks.set(r.teacherId, rank);
        });
        return {
          policy: 'PROPOSAL_CONFIGURABLE',
          items: [...ranked, ...results.filter((r) => !ranks.has(r.teacherId))].map((r) => ({
            ...r,
            rank: ranks.get(r.teacherId) ?? null,
          })),
        };
      });
    },
    coordinator,
    'eligibility',
  );

  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/allocations',
    allocationInput,
    async (request, reply, body) =>
      reply
        .code(201)
        .send(await service.save(identity.actor(request), routeId(request, 'courseId'), body, 0)),
    coordinator,
    'scheduling',
  );
  command(
    app,
    'PUT',
    '/api/v1/courses/:courseId/allocations/:allocationId',
    z.strictObject({ expectedVersion: version, data: allocationInput }),
    async (request, _reply, body) =>
      service.save(
        identity.actor(request),
        routeId(request, 'courseId'),
        body.data,
        body.expectedVersion,
        routeId(request, 'allocationId'),
      ),
    coordinator,
    'scheduling',
  );
  command(
    app,
    'DELETE',
    '/api/v1/courses/:courseId/allocations/:allocationId',
    z.strictObject({ expectedVersion: version }),
    async (request, _reply, body) => {
      const actor = identity.actor(request),
        courseId = routeId(request, 'courseId'),
        allocationId = routeId(request, 'allocationId');
      return service.authorized(actor, courseId, async (session) => {
        const old = await service.allocations.findOne({ _id: allocationId, courseId }, { session });
        if (!old) missing();
        if (old.version !== body.expectedVersion || old.state === 'CANCELLED')
          conflict('STALE_VERSION');
        const record = {
          ...old,
          state: 'CANCELLED' as const,
          version: old.version + 1,
          updatedAt: new Date().toISOString(),
        };
        await service.allocations.replaceOne({ _id: allocationId }, record, { session });
        await service.bump(courseId, old.periodId, session);
        await audit(db, session, actor.user._id, 'ALLOCATION_CANCELLED', allocationId, courseId);
        return view(record);
      });
    },
    coordinator,
    'scheduling',
  );
  app.get('/api/v1/courses/:courseId/planning', { preHandler: coordinator }, async (request) => {
    const courseId = routeId(request, 'courseId');
    await identity.course(identity.actor(request), courseId);
    const query = parse(z.strictObject({ periodId: id.optional() }), request.query);
    const filter = { courseId, ...(query.periodId ? { periodId: query.periodId } : {}) };
    const allocations = await service.allocations
      .find({ ...filter, state: { $ne: 'CANCELLED' } })
      .sort({ _id: 1 })
      .limit(501)
      .toArray();
    const published = await service.published.find(filter).sort({ _id: 1 }).limit(501).toArray();
    const plans = await service.plans.find(filter).sort({ _id: 1 }).limit(101).toArray();
    if (allocations.length > 500 || published.length > 500 || plans.length > 100)
      throw new AppError(
        422,
        'PLANNING_LIMIT',
        'Filtre um periodo menor ou use as consultas paginadas de alocacoes, publicacoes e planos.',
      );
    return {
      allocations: allocations.map(view),
      published: published.map(view),
      plans: plans.map(view),
    };
  });
  for (const collectionName of ['allocations', 'publishedAllocations', 'plans'] as const) {
    const resource =
      collectionName === 'publishedAllocations' ? 'published-allocations' : collectionName;
    app.get(
      `/api/v1/courses/:courseId/${resource}`,
      { preHandler: coordinator },
      async (request) => {
        const courseId = routeId(request, 'courseId');
        await identity.course(identity.actor(request), courseId);
        const query = parse(listQuery.extend({ periodId: id.optional() }), request.query);
        const values = await db.db
          .collection<Entity & { courseId: string; periodId: string }>(collectionName)
          .find({ courseId, ...(query.periodId ? { periodId: query.periodId } : {}) })
          .sort({ _id: 1 })
          .skip(query.offset)
          .limit(query.limit + 1)
          .toArray();
        return pageOf(values.map(view), query);
      },
    );
  }
  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/periods/:periodId/publish',
    z.strictObject({ expectedVersion: version }),
    async (request, _reply, body) =>
      service.publish(
        identity.actor(request),
        routeId(request, 'courseId'),
        routeId(request, 'periodId'),
        body.expectedVersion,
      ),
    coordinator,
    'scheduling',
  );
  app.get('/api/v1/me/schedule', { preHandler: teacher }, async (request) => {
    const query = parse(
      z
        .strictObject({ from: date, until: date })
        .refine(
          (q) => q.from <= q.until && Date.parse(q.until) - Date.parse(q.from) <= 93 * 86400000,
        ),
      request.query,
    );
    const teacherId = identity.actor(request).user._id;
    const records = await service.occurrences
      .find({ teacherId, date: { $gte: query.from, $lte: query.until } })
      .sort({ startsAt: 1, _id: 1 })
      .limit(4097)
      .toArray();
    if (records.length > 4096)
      throw new AppError(422, 'SCHEDULE_LIMIT', 'Reduza o periodo consultado.');
    const cases = await absences
      .find({ teacherId, startsOn: { $lte: query.until }, endsOn: { $gte: query.from } })
      .toArray();
    return {
      items: records.map((r) => ({
        ...view(r),
        absencePending: cases.some(
          (a) =>
            a.startsOn <= r.date &&
            a.endsOn >= r.date &&
            Object.values(a.decisions).some((d) => d.status !== 'REJECTED'),
        ),
      })),
    };
  });
  app.get('/api/v1/me/history', { preHandler: teacher }, async (request) => {
    const q = parse(page, request.query),
      teacherId = identity.actor(request).user._id;
    const records = await service.occurrences
      .find({
        teacherId,
        startsAt: { $lte: new Date().toISOString() },
        ...(q.before
          ? {
              $or: [
                { startsAt: { $lt: q.before } },
                { startsAt: q.before, _id: { $lt: q.cursorId! } },
              ],
            }
          : {}),
        ...(q.courseId ? { courseId: q.courseId } : {}),
        ...(q.subjectId ? { subjectId: q.subjectId } : {}),
        ...(q.from || q.until
          ? { date: { ...(q.from ? { $gte: q.from } : {}), ...(q.until ? { $lte: q.until } : {}) } }
          : {}),
      })
      .sort({ startsAt: -1, _id: -1 })
      .limit(q.limit + 1)
      .toArray();
    const items = records.slice(0, q.limit),
      last = items.at(-1);
    return {
      items: items.map((r) => ({
        ...view(r),
        displayStatus: r.status === 'PLANNED' ? 'AWAITING_CONFIRMATION' : r.status,
      })),
      next: records.length > q.limit && last ? { before: last.startsAt, cursorId: last._id } : null,
    };
  });
  app.get('/api/v1/courses/:courseId/occurrences', { preHandler: coordinator }, async (request) => {
    const courseId = routeId(request, 'courseId');
    await identity.course(identity.actor(request), courseId);
    const query = parse(
      listQuery
        .extend({
          limit: z
            .string()
            .regex(/^\d+$/)
            .transform(Number)
            .pipe(z.number().int().min(1).max(500))
            .default(500),
          from: date.optional(),
          until: date.optional(),
        })
        .refine((q) => !q.from || !q.until || q.from <= q.until),
      request.query,
    );
    const values = await service.occurrences
      .find({
        courseId,
        ...(query.from || query.until
          ? {
              date: {
                ...(query.from ? { $gte: query.from } : {}),
                ...(query.until ? { $lte: query.until } : {}),
              },
            }
          : {}),
      })
      .sort({ startsAt: -1, _id: -1 })
      .skip(query.offset)
      .limit(query.limit + 1)
      .toArray();
    return pageOf(values.map(view), query);
  });
  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/occurrences/:occurrenceId/status',
    z.strictObject({
      expectedVersion: version,
      status: z.enum(['COMPLETED', 'CANCELLED', 'RESCHEDULED']),
      replacementId: id.optional(),
    }),
    async (request, _reply, body) => {
      const actor = identity.actor(request),
        courseId = routeId(request, 'courseId');
      return service.authorized(actor, courseId, async (session) => {
        const old = await service.occurrences.findOne(
          { _id: routeId(request, 'occurrenceId'), courseId },
          { session },
        );
        if (!old) missing();
        if (old.version !== body.expectedVersion) conflict('STALE_VERSION');
        if (old.status !== 'PLANNED') conflict('OCCURRENCE_FINALIZED');
        if (body.status === 'COMPLETED' && old.endsAt > new Date().toISOString())
          throw new AppError(422, 'FUTURE_OCCURRENCE', 'A aula ainda nao terminou.');
        if (body.status === 'RESCHEDULED') {
          if (
            !body.replacementId ||
            body.replacementId === old._id ||
            !(await service.occurrences.findOne(
              {
                _id: body.replacementId,
                courseId,
                teacherId: old.teacherId,
                subjectId: old.subjectId,
                groupId: old.groupId,
                status: 'PLANNED',
                startsAt: { $gt: old.startsAt },
              },
              { session },
            ))
          )
            throw new AppError(
              422,
              'INVALID_REPLACEMENT',
              'Selecione uma reposicao publicada, posterior e da mesma disciplina.',
            );
        } else if (body.replacementId)
          throw new AppError(422, 'INVALID_REPLACEMENT', 'Reposicao somente para remarcacao.');
        const record = {
          ...old,
          status: body.status,
          ...(body.replacementId ? { replacementId: body.replacementId } : {}),
          confirmedBy: actor.user._id,
          version: old.version + 1,
          updatedAt: new Date().toISOString(),
        };
        await service.occurrences.replaceOne({ _id: old._id }, record, { session });
        await audit(db, session, actor.user._id, `OCCURRENCE_${body.status}`, old._id, courseId);
        return view(record);
      });
    },
    coordinator,
    'history',
  );
  command(
    app,
    'POST',
    '/api/v1/me/absences',
    absenceInput,
    async (request, reply, body) => {
      const actor = identity.actor(request);
      const result = await db.transaction(async (session) => {
        await lock(
          db,
          session,
          'academics',
          `user:${actor.user._id}`,
          ...body.courseIds.map((c) => `course:${c}`),
        );
        for (const courseId of body.courseIds)
          await identity.course(actor, courseId, session, true);
        const record: Absence = {
          ...entity(),
          teacherId: actor.user._id,
          ...body,
          decisions: Object.fromEntries(
            body.courseIds.map((c) => [c, { status: 'SUBMITTED' as const }]),
          ),
        };
        await absences.insertOne(record, { session });
        await audit(db, session, actor.user._id, 'ABSENCE_SUBMITTED', record._id);
        for (const courseId of body.courseIds) {
          const members = await identity.memberships
            .find({ courseId, role: 'coordinator', active: true }, { session })
            .toArray();
          for (const member of members)
            await notify(
              identity,
              session,
              member.userId,
              'ABSENCE',
              record._id,
              'Uma ausencia docente aguarda analise.',
            );
        }
        return view(record);
      });
      return reply.code(201).send(result);
    },
    teacher,
    'absences',
  );
  async function allowed(actor: Actor, absenceId: string, courseId?: string) {
    const record = await absences.findOne({ _id: absenceId });
    if (!record) missing();
    if (!courseId) {
      if (record.teacherId !== actor.user._id) missing();
    } else {
      await identity.course(actor, courseId);
      if (!record.courseIds.includes(courseId)) missing();
    }
    return record;
  }
  app.get('/api/v1/me/absences', { preHandler: teacher }, async (request) => {
    const page = parse(listQuery, request.query);
    const values = await absences
      .find({ teacherId: identity.actor(request).user._id })
      .sort({ createdAt: -1, _id: -1 })
      .skip(page.offset)
      .limit(page.limit + 1)
      .toArray();
    return pageOf(values.map(view), page);
  });
  app.get('/api/v1/courses/:courseId/absences', { preHandler: coordinator }, async (request) => {
    const courseId = routeId(request, 'courseId');
    await identity.course(identity.actor(request), courseId);
    const page = parse(listQuery, request.query);
    const values = await absences
      .find({ courseIds: courseId })
      .sort({ createdAt: -1, _id: -1 })
      .skip(page.offset)
      .limit(page.limit + 1)
      .toArray();
    return pageOf(
      values.map((record) => {
        const { decisions, courseIds, ...data } = view(record);
        void courseIds;
        return { ...data, decisions: { [courseId]: decisions[courseId] } };
      }),
      page,
    );
  });
  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/absences/:absenceId/review',
    z.strictObject({ expectedVersion: version, decision: z.enum(['ACCEPTED', 'REJECTED']) }),
    async (request, _reply, body) => {
      const actor = identity.actor(request),
        courseId = routeId(request, 'courseId');
      return service.authorized(actor, courseId, async (session) => {
        const record = await absences.findOne(
          { _id: routeId(request, 'absenceId'), courseIds: courseId },
          { session },
        );
        if (!record) missing();
        if (record.version !== body.expectedVersion) conflict('STALE_VERSION');
        if (record.decisions[courseId]?.status !== 'SUBMITTED')
          conflict('ABSENCE_ALREADY_REVIEWED');
        await absences.updateOne(
          { _id: record._id },
          {
            $set: {
              [`decisions.${courseId}`]: {
                status: body.decision,
                by: actor.user._id,
                at: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            },
            $inc: { version: 1 },
          },
          { session },
        );
        await notify(
          identity,
          session,
          record.teacherId,
          'ABSENCE',
          record._id,
          'Sua comunicacao de ausencia foi analisada.',
        );
        await audit(db, session, actor.user._id, `ABSENCE_${body.decision}`, record._id, courseId);
        return { reviewed: true };
      });
    },
    coordinator,
    'absences',
  );
  app.post(
    '/api/v1/me/absences/:absenceId/attachment',
    { preHandler: teacher },
    async (request, reply) => {
      const actor = identity.actor(request),
        absenceId = routeId(request, 'absenceId');
      await allowed(actor, absenceId);
      if (identity.config.privacy.healthUploads === 'BLOCKED')
        throw new AppError(
          403,
          'HEALTH_UPLOADS_DISABLED',
          'Envio de atestados bloqueado ate a definicao institucional de privacidade.',
        );
      const file = await request.file();
      if (!file) throw new AppError(422, 'FILE_REQUIRED', 'Selecione o atestado.');
      const bytes = await validateDocument(
        await file.toBuffer(),
        file.mimetype,
        identity.config.uploadMaxBytes,
      );
      await db.transaction(async (session) => {
        await lock(db, session, 'academics', `user:${actor.user._id}`);
        const record = await absences.findOne(
          { _id: absenceId, teacherId: actor.user._id },
          { session },
        );
        if (!record) missing();
        if (
          record.attachment ||
          Object.values(record.decisions).some((d) => d.status !== 'SUBMITTED')
        )
          conflict(
            'ATTACHMENT_LOCKED',
            'O documento enviado e preservado; abra uma nova comunicacao para corrigir.',
          );
        await certificates.insertOne(
          {
            _id: absenceId,
            bytes: new Binary(bytes),
            type: file.mimetype,
            sha256: createHash('sha256').update(bytes).digest('hex'),
          },
          { session },
        );
        await absences.updateOne(
          { _id: absenceId },
          {
            $set: {
              attachment: { bytes: bytes.length, type: file.mimetype },
              updatedAt: new Date().toISOString(),
            },
            $inc: { version: 1 },
          },
          { session },
        );
        await audit(db, session, actor.user._id, 'CERTIFICATE_UPLOADED', absenceId);
      });
      return reply.code(201).send({ uploaded: true });
    },
  );
  for (const prefix of ['/api/v1/me', '/api/v1/courses/:courseId'])
    app.get(
      `${prefix}/absences/:absenceId/attachment`,
      { preHandler: prefix.endsWith('me') ? teacher : coordinator },
      async (request, reply) => {
        const actor = identity.actor(request),
          absenceId = routeId(request, 'absenceId');
        await allowed(
          actor,
          absenceId,
          prefix.endsWith('me') ? undefined : routeId(request, 'courseId'),
        );
        const file = await certificates.findOne({ _id: absenceId });
        if (!file) missing();
        // Authorization precedes every private download; no public object URL and no stored filename.
        await db.transaction((s) =>
          audit(db, s, actor.user._id, 'CERTIFICATE_DOWNLOADED', absenceId),
        );
        return reply
          .type(file.type)
          .header(
            'Content-Disposition',
            `attachment; filename="atestado.${documentExtension(file.type)}"`,
          )
          .header('Content-Security-Policy', "default-src 'none'; sandbox")
          .send(Buffer.from(file.bytes.value()));
      },
    );
}
