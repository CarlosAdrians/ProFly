import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ClientSession } from 'mongodb';
import type { IdentityService } from '../identity/service.js';
import type { Actor, User } from '../identity/models.js';
import { listQuery, pageOf } from '../shared/pagination.js';
import { parse } from '../shared/errors.js';
import { command, email, name, routeId } from '../shared/http.js';
import { AppError, conflict, missing } from '../shared/errors.js';
import { audit, entity, lock, view, type Guard } from '../shared/model.js';
import {
  missingFields,
  reviewApplication,
  saveProfile,
  submitApplication,
  type ProfileData,
} from './contracts.js';
import type { Application, ProfileSnapshot, Review, TeacherProfile } from './models.js';
import { notify } from '../scheduling/service.js';

export function teacherRoutes(app: FastifyInstance, identity: IdentityService) {
  const db = identity.database;
  const profiles = db.db.collection<TeacherProfile>('profiles');
  const snapshots = db.db.collection<ProfileSnapshot>('profileVersions');
  const applications = db.db.collection<Application>('applications');
  const reviews = db.db.collection<Review>('reviews');
  const teacher = identity.guard(['teacher']);
  const coordinator = identity.guard(['coordinator', 'admin']);
  const academicReviewer = identity.guard(['coordinator']);
  const snapshotId = (teacherId: string, version: number) => `${teacherId}:${version}`;

  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/teachers/invites',
    z.strictObject({ name, email }),
    async (request, reply, body) => {
      const actor = identity.actor(request);
      const courseId = routeId(request, 'courseId');
      const result = await db.transaction(async (session) => {
        await identity.course(actor, courseId, session);
        const existing = await identity.users.findOne({ email: body.email }, { session });
        await lock(
          db,
          session,
          `course:${courseId}`,
          `user:${actor.user._id}`,
          ...(existing ? [`user:${existing._id}`] : []),
        );
        await active(actor, session);
        await identity.course(actor, courseId, session);
        if (existing?.state === 'DISABLED') conflict('ACCOUNT_DISABLED', 'Conta desativada.');
        const user: User = existing ?? {
          ...entity(),
          name: body.name,
          email: body.email,
          roles: ['teacher'],
          state: 'INVITED',
        };
        if (!existing) {
          await identity.users.insertOne(user, { session });
          await db.db
            .collection<Guard>('guards')
            .insertOne({ _id: `user:${user._id}`, version: 0 }, { session });
        } else if (!user.roles.includes('teacher')) {
          await identity.users.updateOne(
            { _id: user._id },
            {
              $addToSet: { roles: 'teacher' },
              $set: { updatedAt: new Date().toISOString() },
              $inc: { version: 1 },
            },
            { session },
          );
        }
        const inviteToken =
          user.state === 'INVITED' ? await identity.createToken(user._id, 'INVITE', session) : null;
        await audit(db, session, actor.user._id, 'TEACHER_INVITED', user._id, courseId);
        return {
          teacher: { id: user._id, name: user.name, email: user.email, state: user.state },
          inviteToken,
          academicApprovalRequired: true,
        };
      });
      return reply.code(201).send(result);
    },
    coordinator,
    'teachers',
  );

  async function active(actor: Actor, session: ClientSession) {
    const current = await identity.users.findOne(
      { _id: actor.user._id, state: 'ACTIVE' },
      { session },
    );
    if (!current) throw new AppError(401, 'UNAUTHENTICATED', 'Entre na sua conta.');
  }
  async function references(data: ProfileData, session: ClientSession) {
    const ids = [
      ...new Set([
        ...(data.knowledge ?? []).map((i) => i.competencyId),
        ...(data.teaching?.entries ?? []).flatMap((i) => i.competencyIds),
        ...(data.professional?.entries ?? []).flatMap((i) => i.competencyIds),
      ]),
    ];
    if (
      ids.length &&
      (await db.db
        .collection<{ _id: string; active: boolean }>('competencies')
        .countDocuments({ _id: { $in: ids }, active: true }, { session })) !== ids.length
    )
      throw new AppError(422, 'INVALID_REFERENCE', 'Confira as competencias selecionadas.', {
        knowledge: ['Competencia indisponivel.'],
      });
  }

  app.get(
    '/api/v1/me/profile',
    { preHandler: teacher, schema: { tags: ['teachers'] } },
    async (request) => {
      const record = await profiles.findOne({ _id: identity.actor(request).user._id });
      return {
        ...(record ? view(record) : { id: identity.actor(request).user._id, version: 0, data: {} }),
        source: 'TEACHER_DECLARED',
        missingFields: missingFields(record?.data ?? {}),
      };
    },
  );
  command(
    app,
    'PUT',
    '/api/v1/me/profile',
    saveProfile,
    async (request, _reply, body) => {
      const actor = identity.actor(request);
      return db.transaction(async (session) => {
        await lock(db, session, 'academics', `user:${actor.user._id}`);
        await active(actor, session);
        await references(body.data, session);
        const previous = await profiles.findOne({ _id: actor.user._id }, { session });
        if ((previous?.version ?? 0) !== body.expectedVersion) conflict('STALE_VERSION');
        const record: TeacherProfile = {
          ...(previous ?? entity(actor.user._id)),
          data: body.data,
          version: (previous?.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        await profiles.replaceOne({ _id: record._id }, record, { upsert: true, session });
        await snapshots.insertOne(
          {
            ...entity(snapshotId(record._id, record.version)),
            teacherId: record._id,
            profileVersion: record.version,
            source: 'TEACHER_DECLARED',
            data: record.data,
          },
          { session },
        );
        await audit(db, session, actor.user._id, 'PROFILE_SAVED', record._id);
        return {
          ...view(record),
          source: 'TEACHER_DECLARED',
          missingFields: missingFields(record.data),
        };
      });
    },
    teacher,
    'teachers',
  );

  app.get(
    '/api/v1/me/applications',
    { preHandler: teacher, schema: { tags: ['applications'] } },
    async (request) => {
      const page = parse(listQuery, request.query);
      const values = await applications
        .find({ teacherId: identity.actor(request).user._id })
        .sort({ updatedAt: -1, _id: 1 })
        .skip(page.offset)
        .limit(page.limit + 1)
        .toArray();
      return pageOf(values.map(view), page);
    },
  );

  command(
    app,
    'POST',
    '/api/v1/me/applications/:courseId',
    submitApplication,
    async (request, reply, body) => {
      const actor = identity.actor(request);
      const courseId = routeId(request, 'courseId');
      const result = await db.transaction(async (session) => {
        const course = await identity.courses.findOne({ _id: courseId, active: true }, { session });
        if (!course) missing();
        await lock(db, session, 'academics', `course:${courseId}`, `user:${actor.user._id}`);
        await active(actor, session);
        const profile = await profiles.findOne({ _id: actor.user._id }, { session });
        if (!profile || profile.version !== body.profileVersion) conflict('STALE_PROFILE');
        const fields = missingFields(profile.data);
        if (Object.keys(fields).length)
          throw new AppError(
            422,
            'PROFILE_INCOMPLETE',
            'Complete os dados antes de enviar.',
            fields,
          );
        await references(profile.data, session);
        const subjects = db.db.collection<{ _id: string; courseId: string; active: boolean }>(
          'subjects',
        );
        if (
          (await subjects.countDocuments(
            { _id: { $in: body.subjectIds }, courseId, active: true },
            { session },
          )) !== body.subjectIds.length
        )
          throw new AppError(422, 'INVALID_REFERENCE', 'Disciplinas indisponiveis para o curso.', {
            subjectIds: ['Confira as disciplinas selecionadas.'],
          });
        const previous = await applications.findOne(
          { teacherId: actor.user._id, courseId },
          { session },
        );
        if ((previous?.version ?? 0) !== body.expectedVersion) conflict('STALE_VERSION');
        if (
          (previous?.status === 'SUBMITTED' || previous?.status === 'APPROVED') &&
          previous.profileVersion === profile.version
        )
          conflict('APPLICATION_ALREADY_SUBMITTED');
        const record: Application = {
          ...(previous ?? entity()),
          teacherId: actor.user._id,
          courseId,
          profileVersion: profile.version,
          subjectIds: body.subjectIds,
          status: 'SUBMITTED',
          version: (previous?.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        delete record.reviewerId;
        delete record.reason;
        delete record.reviewedAt;
        await applications.replaceOne({ _id: record._id }, record, { session, upsert: true });
        await audit(db, session, actor.user._id, 'APPLICATION_SUBMITTED', record._id, courseId);
        const coordinators = await identity.memberships
          .find({ courseId, role: 'coordinator', active: true }, { session })
          .toArray();
        for (const member of coordinators)
          await notify(
            identity,
            session,
            member.userId,
            'APPLICATION',
            record._id,
            'Uma solicitacao docente aguarda analise.',
          );
        return view(record);
      });
      return reply.code(201).send(result);
    },
    teacher,
    'applications',
  );

  app.get(
    '/api/v1/courses/:courseId/applications',
    { preHandler: academicReviewer, schema: { tags: ['applications'] } },
    async (request) => {
      const courseId = routeId(request, 'courseId');
      await identity.coordinatedCourse(identity.actor(request), courseId);
      const page = parse(listQuery, request.query);
      const values = await applications
        .find({ courseId })
        .sort({ updatedAt: -1, _id: 1 })
        .skip(page.offset)
        .limit(page.limit + 1)
        .toArray();
      return pageOf(values.map(view), page);
    },
  );
  app.get(
    '/api/v1/courses/:courseId/applications/:applicationId',
    { preHandler: academicReviewer, schema: { tags: ['applications'] } },
    async (request) => {
      const courseId = routeId(request, 'courseId');
      await identity.coordinatedCourse(identity.actor(request), courseId);
      const application = await applications.findOne({
        _id: routeId(request, 'applicationId'),
        courseId,
      });
      if (!application) missing();
      const snapshot = await snapshots.findOne({
        _id: snapshotId(application.teacherId, application.profileVersion),
      });
      if (!snapshot) missing();
      const current = await profiles.findOne({ _id: application.teacherId });
      const user = await identity.users.findOne({ _id: application.teacherId });
      return {
        application: view(application),
        teacher: user ? { id: user._id, name: user.name, email: user.email } : null,
        profile: view(snapshot),
        currentProfileVersion: current?.version ?? null,
        review: await reviews
          .findOne({
            teacherId: application.teacherId,
            courseId,
            profileVersion: application.profileVersion,
          })
          .then((record) => (record ? view(record) : null)),
      };
    },
  );
  command(
    app,
    'POST',
    '/api/v1/courses/:courseId/applications/:applicationId/review',
    reviewApplication,
    async (request, _reply, body) => {
      const actor = identity.actor(request);
      const courseId = routeId(request, 'courseId');
      const applicationId = routeId(request, 'applicationId');
      return db.transaction(async (session) => {
        await identity.coordinatedCourse(actor, courseId, session);
        const application = await applications.findOne(
          { _id: applicationId, courseId },
          { session },
        );
        if (!application) missing();
        await lock(
          db,
          session,
          'academics',
          `course:${courseId}`,
          `user:${actor.user._id}`,
          `user:${application.teacherId}`,
        );
        await active(actor, session);
        await identity.coordinatedCourse(actor, courseId, session);
        if (application.version !== body.expectedVersion) conflict('STALE_VERSION');
        if (application.status !== 'SUBMITTED') conflict('APPLICATION_ALREADY_REVIEWED');
        const current = await profiles.findOne({ _id: application.teacherId }, { session });
        if (
          !current ||
          current.version !== application.profileVersion ||
          current.version !== body.profileVersion
        )
          conflict('STALE_PROFILE', 'O perfil mudou. Solicite uma nova submissao.');
        const ids = new Set(
          [
            ...(current.data.education ?? []),
            ...(current.data.knowledge ?? []),
            ...(current.data.teaching?.entries ?? []),
            ...(current.data.professional?.entries ?? []),
          ].map((item) => item.id),
        );
        if (body.items.some((item) => !ids.has(item.id)))
          throw new AppError(422, 'INVALID_REVIEW_ITEM', 'Item nao pertence ao perfil submetido.');
        if (
          body.items.some(
            (item) =>
              item.status === 'ABSENT' && !current.data.knowledge?.some((k) => k.id === item.id),
          )
        )
          throw new AppError(
            422,
            'INVALID_REVIEW_ITEM',
            'Ausencia confirmada se aplica somente a conhecimento.',
          );
        if (body.decision !== 'APPROVED' && body.items.length)
          throw new AppError(422, 'INVALID_REVIEW', 'Confirmacao de dados exige aprovacao.');
        if (body.decision === 'APPROVED') {
          await references(current.data, session);
          await reviews.insertOne(
            {
              ...entity(),
              teacherId: application.teacherId,
              courseId,
              profileVersion: current.version,
              reviewerId: actor.user._id,
              applicationId,
              subjectIds: application.subjectIds,
              items: body.items,
              experienceDeclarations: {
                teaching: current.data.teaching!.status,
                professional: current.data.professional!.status,
              },
            },
            { session },
          );
          const previous = await identity.memberships.findOne(
            { userId: application.teacherId, courseId, role: 'teacher' },
            { session },
          );
          if (previous)
            await identity.memberships.updateOne(
              { _id: previous._id },
              {
                $set: { active: true, updatedAt: new Date().toISOString() },
                $inc: { version: 1 },
              },
              { session },
            );
          else
            await identity.memberships.insertOne(
              {
                ...entity(),
                userId: application.teacherId,
                courseId,
                role: 'teacher',
                active: true,
              },
              { session },
            );
        }
        const updated = await applications.findOneAndUpdate(
          { _id: applicationId, version: body.expectedVersion },
          {
            $set: {
              status: body.decision,
              reviewerId: actor.user._id,
              reason: body.reason,
              reviewedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            $inc: { version: 1 },
          },
          { session, returnDocument: 'after' },
        );
        if (!updated) conflict('STALE_VERSION');
        await notify(
          identity,
          session,
          application.teacherId,
          'APPLICATION',
          applicationId,
          'Sua solicitacao de entrada foi analisada.',
        );
        await audit(
          db,
          session,
          actor.user._id,
          `APPLICATION_${body.decision}`,
          applicationId,
          courseId,
        );
        return view(updated);
      });
    },
    academicReviewer,
    'applications',
  );
}
