import type { FastifyInstance } from 'fastify';
import type { ClientSession } from 'mongodb';
import { z } from 'zod';
import { listQuery, pageOf } from '../shared/pagination.js';
import type { IdentityService } from '../identity/service.js';
import { command, routeId } from '../shared/http.js';
import { AppError, conflict, missing, parse } from '../shared/errors.js';
import { audit, entity, lock, view, type Entity } from '../shared/model.js';
import {
  competencyInput,
  groupInput,
  offeringInput,
  periodInput,
  subjectInput,
  type PeriodData,
  type SubjectData,
} from './contracts.js';

export type Academic<T> = Entity & T & { courseId?: string; changedBy: string };
type CatalogRecord = Academic<{ code: string; name: string; active: boolean }> &
  Record<string, unknown>;
const pagination = z.strictObject({
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
});
export function academicRoutes(app: FastifyInstance, identity: IdentityService) {
  const db = identity.database;
  const invalid = (field: string): never => {
    throw new AppError(422, 'INVALID_REFERENCE', 'Confira as referencias academicas.', {
      [field]: ['Referencia indisponivel ou incompativel.'],
    });
  };
  async function activePeriod(periodId: string, session: ClientSession) {
    const period = await db.db
      .collection<Academic<PeriodData>>('periods')
      .findOne({ _id: periodId, active: true }, { session });
    if (!period) return invalid('periodId');
    return period;
  }

  function resource<T extends z.ZodType<{ code: string; name: string; active: boolean }>>(
    collectionName: string,
    schema: T,
    scoped: boolean,
    validate: (
      body: z.infer<T>,
      courseId: string | undefined,
      session: ClientSession,
      recordId?: string,
    ) => Promise<void>,
  ) {
    const collection = db.db.collection<CatalogRecord>(collectionName);
    const prefix = scoped ? '/api/v1/courses/:courseId' : '/api/v1/admin';
    const guard = scoped ? identity.guard(['admin', 'coordinator']) : identity.guard(['admin']);
    const write = async (
      request: Parameters<ReturnType<typeof identity.guard>>[0],
      body: z.infer<T>,
      recordId?: string,
      expectedVersion?: number,
    ) => {
      const actor = identity.actor(request);
      const courseId = scoped ? routeId(request, 'courseId') : undefined;
      return db.transaction(async (session) => {
        await lock(
          db,
          session,
          'academics',
          `user:${actor.user._id}`,
          ...(courseId ? [`course:${courseId}`] : []),
        );
        const currentUser = await identity.users.findOne(
          { _id: actor.user._id, state: 'ACTIVE' },
          { session },
        );
        if (!currentUser) throw new AppError(401, 'UNAUTHENTICATED', 'Entre na sua conta.');
        if (courseId) await identity.course(actor, courseId, session);
        const previous = recordId
          ? await collection.findOne(
              { _id: recordId, ...(courseId ? { courseId } : {}) },
              { session },
            )
          : null;
        if (recordId && !previous) missing();
        if (previous && previous.version !== expectedVersion) conflict('STALE_VERSION');
        await validate(body, courseId, session, recordId);
        const record = {
          ...(previous ?? entity()),
          ...body,
          ...(courseId ? { courseId } : {}),
          changedBy: actor.user._id,
          version: (previous?.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        } as CatalogRecord;
        await collection.replaceOne({ _id: record._id }, record, {
          session,
          upsert: !recordId,
        });
        await db.db.collection<CatalogRecord>('academicVersions').insertOne(
          {
            ...record,
            _id: `${collectionName}:${record._id}:${record.version}`,
            resourceId: record._id,
            collectionName,
          },
          { session },
        );
        await audit(
          db,
          session,
          actor.user._id,
          `${collectionName.toUpperCase()}_${recordId ? 'UPDATED' : 'CREATED'}`,
          record._id,
          courseId,
        );
        return view(record);
      });
    };
    const updateSchema = z.strictObject({
      expectedVersion: z.number().int().min(1),
      data: schema,
    }) as unknown as z.ZodType<{ expectedVersion: number; data: z.infer<T> }>;
    command(
      app,
      'POST',
      `${prefix}/${collectionName}`,
      schema,
      async (request, reply, body) => reply.code(201).send(await write(request, body)),
      guard,
      'academics',
    );
    command(
      app,
      'PUT',
      `${prefix}/${collectionName}/:recordId`,
      updateSchema,
      async (request, _reply, body) =>
        write(request, body.data, routeId(request, 'recordId'), body.expectedVersion),
      guard,
      'academics',
    );
    app.get(
      `${prefix}/${collectionName}`,
      { preHandler: guard, schema: { tags: ['academics'] } },
      async (request) => {
        const courseId = scoped ? routeId(request, 'courseId') : undefined;
        if (courseId) await identity.course(identity.actor(request), courseId);
        const query = parse(pagination, request.query);
        const values = (
          await collection
            .find(courseId ? { courseId } : {})
            .sort({ code: 1, _id: 1 })
            .skip(query.offset)
            .limit(query.limit + 1)
            .toArray()
        ).map(view);
        return pageOf(values, query);
      },
    );
  }

  resource('competencies', competencyInput, false, async (body, _courseId, session, recordId) => {
    if (
      !body.active &&
      recordId &&
      (await db.db.collection('subjects').countDocuments(
        {
          active: true,
          $or: [
            { 'criteria.mandatoryKnowledge.competencyId': recordId },
            { 'criteria.desiredKnowledge.competencyId': recordId },
            { 'criteria.relevantCompetencyIds': recordId },
          ],
        },
        { session },
      ))
    )
      conflict('RESOURCE_IN_USE');
  });
  resource('periods', periodInput, false, async (body, _courseId, session, recordId) => {
    if (
      recordId &&
      (await db.db
        .collection('offerings')
        .countDocuments({ periodId: recordId, active: true }, { session }))
    )
      conflict(
        'RESOURCE_IN_USE',
        'Periodo com ofertas ativas exige revisao do planejamento antes da alteracao.',
      );
    if (
      !body.active &&
      recordId &&
      (await db.db
        .collection('groups')
        .countDocuments({ periodId: recordId, active: true }, { session }))
    )
      conflict('RESOURCE_IN_USE');
  });
  resource('subjects', subjectInput, true, async (body, _courseId, session, recordId) => {
    const ids = [
      ...new Set([
        ...(body.criteria?.mandatoryKnowledge ?? []).map((item) => item.competencyId),
        ...(body.criteria?.desiredKnowledge ?? []).map((item) => item.competencyId),
        ...(body.criteria?.relevantCompetencyIds ?? []),
      ]),
    ];
    if (
      ids.length &&
      (await db.db
        .collection<{ _id: string; active: boolean }>('competencies')
        .countDocuments({ _id: { $in: ids }, active: true }, { session })) !== ids.length
    )
      invalid('criteria');
    if (
      !body.active &&
      recordId &&
      (await db.db
        .collection('offerings')
        .countDocuments({ subjectId: recordId, active: true }, { session }))
    )
      conflict('RESOURCE_IN_USE');
  });
  resource('groups', groupInput, true, async (body, _courseId, session, recordId) => {
    await activePeriod(body.periodId, session);
    if (
      recordId &&
      (await db.db
        .collection('offerings')
        .countDocuments({ groupId: recordId, active: true }, { session }))
    )
      conflict('RESOURCE_IN_USE');
  });
  resource('offerings', offeringInput, true, async (body, courseId, session, recordId) => {
    const period = await activePeriod(body.periodId, session);
    if (
      !(await db.db
        .collection<{ _id: string; courseId: string; active: boolean }>('subjects')
        .findOne({ _id: body.subjectId, courseId, active: true }, { session }))
    )
      invalid('subjectId');
    if (
      !(await db.db
        .collection<{ _id: string; courseId: string; periodId: string; active: boolean }>('groups')
        .findOne(
          { _id: body.groupId, courseId, periodId: body.periodId, active: true },
          { session },
        ))
    )
      invalid('groupId');
    for (const meeting of body.meetings) {
      if (meeting.validFrom < period.startsOn || meeting.validUntil > period.endsOn)
        invalid('meetings');
      if (
        !period.blocks.some(
          (block) =>
            block.weekday === meeting.weekday &&
            block.startsAt === meeting.startsAt &&
            block.endsAt === meeting.endsAt,
        )
      )
        invalid('meetings');
      const firstDate = new Date(`${meeting.validFrom}T12:00:00Z`);
      const weekday = firstDate.getUTCDay() || 7;
      firstDate.setUTCDate(firstDate.getUTCDate() + ((meeting.weekday - weekday + 7) % 7));
      if (firstDate.toISOString().slice(0, 10) > meeting.validUntil) invalid('meetings');
    }
    if (
      recordId &&
      (await db.db
        .collection('allocations')
        .countDocuments(
          { offeringId: recordId, state: { $in: ['DRAFT', 'PUBLISHED'] } },
          { session },
        ))
    )
      conflict('RESOURCE_IN_USE');
  });

  app.get(
    '/api/v1/periods',
    { preHandler: identity.guard(['coordinator', 'admin']) },
    async (request) => {
      const page = parse(listQuery, request.query);
      const values = await db.db
        .collection<Academic<PeriodData>>('periods')
        .find({ active: true })
        .sort({ startsOn: -1, _id: 1 })
        .skip(page.offset)
        .limit(page.limit + 1)
        .toArray();
      return pageOf(values.map(view), page);
    },
  );

  app.get('/api/v1/catalog/competencies', { schema: { tags: ['catalog'] } }, async (request) => {
    const query = parse(pagination, request.query);
    const items = await db.db
      .collection<Academic<z.infer<typeof competencyInput>>>('competencies')
      .find({ active: true })
      .sort({ code: 1, _id: 1 })
      .skip(query.offset)
      .limit(query.limit + 1)
      .toArray();
    return pageOf(
      items.map((item) => ({ id: item._id, code: item.code, name: item.name })),
      query,
    );
  });
  app.get(
    '/api/v1/catalog/courses/:courseId/subjects',
    { schema: { tags: ['catalog'] } },
    async (request) => {
      const courseId = routeId(request, 'courseId');
      if (!(await identity.courses.findOne({ _id: courseId, active: true }))) missing();
      const query = parse(pagination, request.query);
      const items = await db.db
        .collection<Academic<SubjectData>>('subjects')
        .find({ courseId, active: true })
        .sort({ code: 1, _id: 1 })
        .skip(query.offset)
        .limit(query.limit + 1)
        .toArray();
      return pageOf(
        items.map((item) => ({ id: item._id, code: item.code, name: item.name })),
        query,
      );
    },
  );
}
