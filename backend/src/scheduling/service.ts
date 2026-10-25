import type { ClientSession } from 'mongodb';
import type { IdentityService } from '../identity/service.js';
import type { Actor } from '../identity/models.js';
import type { Academic } from '../academics/routes.js';
import type { OfferingData, PeriodData, SubjectData } from '../academics/contracts.js';
import type { Review, TeacherProfile } from '../teachers/models.js';
import { AppError, conflict, missing } from '../shared/errors.js';
import { audit, entity, lock, view } from '../shared/model.js';
import { evaluate } from './engine.js';
import { expand, overlaps } from './temporal.js';
import type {
  Absence,
  Allocation,
  AllocationData,
  Notice,
  Occurrence,
  Plan,
  Preference,
  PublishedAllocation,
  Workload,
} from './models.js';

export async function notify(
  identity: IdentityService,
  session: ClientSession,
  userId: string,
  kind: Notice['kind'],
  resourceId: string,
  title: string,
) {
  const prefs = await identity.database.db
    .collection<Preference>('preferences')
    .findOne({ _id: userId }, { session });
  if (prefs?.notifications === false) return;
  await identity.database.db
    .collection<Notice>('notices')
    .insertOne({ ...entity(), userId, kind, resourceId, title, read: false }, { session });
}
export class SchedulingService {
  constructor(
    readonly identity: IdentityService,
    readonly now: () => Date = () => new Date(),
  ) {}
  get database() {
    return this.identity.database;
  }
  get allocations() {
    return this.database.db.collection<Allocation>('allocations');
  }
  get published() {
    return this.database.db.collection<PublishedAllocation>('publishedAllocations');
  }
  get occurrences() {
    return this.database.db.collection<Occurrence>('occurrences');
  }
  get plans() {
    return this.database.db.collection<Plan>('plans');
  }
  async authorized<T>(
    actor: Actor,
    courseId: string,
    operation: (session: ClientSession) => Promise<T>,
  ) {
    return this.database.transaction(async (session) => {
      await lock(
        this.database,
        session,
        'academics',
        `user:${actor.user._id}`,
        `course:${courseId}`,
      );
      if (
        !(await this.identity.users.findOne({ _id: actor.user._id, state: 'ACTIVE' }, { session }))
      )
        throw new AppError(401, 'UNAUTHENTICATED', 'Entre na sua conta.');
      await this.identity.course(actor, courseId, session);
      return operation(session);
    });
  }
  async context(courseId: string, data: AllocationData, session: ClientSession) {
    const db = this.database.db;
    const offering = await db
      .collection<Academic<OfferingData>>('offerings')
      .findOne({ _id: data.offeringId, courseId, active: true }, { session });
    if (!offering) missing();
    const period = await db
      .collection<Academic<PeriodData>>('periods')
      .findOne({ _id: offering.periodId, active: true }, { session });
    const subject = await db
      .collection<Academic<SubjectData>>('subjects')
      .findOne({ _id: offering.subjectId, courseId, active: true }, { session });
    const group = await db
      .collection<Academic<{ name: string; periodId: string; active: boolean }>>('groups')
      .findOne(
        { _id: offering.groupId, courseId, periodId: offering.periodId, active: true },
        { session },
      );
    if (!period || !subject || !group) missing();
    for (const m of data.meetings)
      if (
        m.validFrom < period.startsOn ||
        m.validUntil > period.endsOn ||
        !period.blocks.some(
          (b) => b.weekday === m.weekday && b.startsAt === m.startsAt && b.endsAt === m.endsAt,
        )
      )
        throw new AppError(
          422,
          'INVALID_MEETINGS',
          'Encontro fora da grade ou vigencia do periodo.',
        );
    const slots = expand(data.meetings, period.timeZone);
    if (!slots.length)
      throw new AppError(422, 'EMPTY_SCHEDULE', 'Nenhum encontro nas datas selecionadas.');
    return { offering, period, subject, group, slots };
  }
  async assessment(
    courseId: string,
    data: AllocationData,
    session: ClientSession,
    excludeId?: string,
    ignorePublishedPlan?: string,
  ) {
    const context = await this.context(courseId, data, session);
    const db = this.database.db;
    if (
      !(await this.identity.memberships.findOne(
        { userId: data.teacherId, courseId, role: 'teacher', active: true },
        { session },
      ))
    )
      missing();
    await lock(this.database, session, `user:${data.teacherId}`);
    const [user, membership, profile, workload, absences, history] = await Promise.all([
      this.identity.users.findOne(
        { _id: data.teacherId, state: 'ACTIVE', roles: 'teacher' },
        { session },
      ),
      this.identity.memberships.findOne(
        { userId: data.teacherId, courseId, role: 'teacher', active: true },
        { session },
      ),
      db.collection<TeacherProfile>('profiles').findOne({ _id: data.teacherId }, { session }),
      db.collection<Workload>('workloads').findOne({ _id: data.teacherId }, { session }),
      db.collection<Absence>('absences').find({ teacherId: data.teacherId }, { session }).toArray(),
      this.occurrences
        .find(
          { teacherId: data.teacherId, subjectId: context.subject._id, status: 'COMPLETED' },
          { session },
        )
        .toArray(),
    ]);
    if (!user || !membership) missing();
    const review = profile
      ? await db.collection<Review>('reviews').findOne(
          {
            teacherId: data.teacherId,
            courseId,
            profileVersion: profile.version,
            subjectIds: context.subject._id,
          },
          { session },
        )
      : null;
    const draft = await this.allocations
      .find(
        {
          _id: { $ne: excludeId ?? '' },
          state: { $ne: 'CANCELLED' },
          $or: [{ teacherId: data.teacherId }, { groupId: context.group._id }],
        },
        { session },
      )
      .toArray();
    const published = await this.published
      .find(
        {
          allocationId: { $ne: excludeId ?? '' },
          ...(ignorePublishedPlan ? { planId: { $ne: ignorePublishedPlan } } : {}),
          $or: [{ teacherId: data.teacherId }, { groupId: context.group._id }],
        },
        { session },
      )
      .toArray();
    const occupied = [...draft, ...published];
    const retained =
      excludeId && !ignorePublishedPlan
        ? await this.published
            .find({ allocationId: excludeId, teacherId: data.teacherId }, { session })
            .toArray()
        : [];
    const result = evaluate({
      teacherId: data.teacherId,
      offeringId: data.offeringId,
      profileVersion: profile?.version ?? null,
      rulesVersion: context.subject.version,
      criteria: context.subject.criteria,
      period: context.period,
      profile: profile?.data ?? null,
      review,
      member: !!user && !!membership,
      groupConflict: context.slots
        .filter((slot) => slot.endsAt > this.now().toISOString())
        .some((s) =>
          occupied
            .filter((a) => a.groupId === context.group._id)
            .some((a) => a.slots.some((o) => overlaps(s, o))),
        ),
      slots: context.slots.filter((slot) => slot.endsAt > this.now().toISOString()),
      occupied: occupied.filter((a) => a.teacherId === data.teacherId).flatMap((a) => a.slots),
      reservedLoad: [
        ...occupied.filter((a) => a.teacherId === data.teacherId),
        ...retained,
      ].flatMap((a) => a.slots),
      workload,
      absences,
      history,
    });
    return {
      result: {
        ...result,
        evaluationScope: 'FUTURE_MEETINGS',
        evaluatedSlotCount: context.slots.filter((slot) => slot.endsAt > this.now().toISOString())
          .length,
        excludedPastCount: context.slots.filter((slot) => slot.endsAt <= this.now().toISOString())
          .length,
      },
      context,
    };
  }
  async save(
    actor: Actor,
    courseId: string,
    data: AllocationData,
    expectedVersion: number,
    allocationId?: string,
  ) {
    return this.authorized(actor, courseId, async (session) => {
      const old = allocationId
        ? await this.allocations.findOne({ _id: allocationId, courseId }, { session })
        : null;
      if (allocationId && !old) missing();
      if ((old?.version ?? 0) !== expectedVersion) conflict('STALE_VERSION');
      const { result, context } = await this.assessment(courseId, data, session, allocationId);
      if (result.eligibility !== 'ELIGIBLE')
        throw new AppError(
          409,
          'ALLOCATION_NOT_ELIGIBLE',
          'A alocacao exige elegibilidade confirmada.',
          { eligibility: result.checks.filter((c) => c.state !== 'PASS').map((c) => c.reason) },
        );
      const now = this.now().toISOString();
      const samePast = (
        a: { startsAt: string; endsAt: string },
        b: { startsAt: string; endsAt: string },
      ) => a.startsAt === b.startsAt && a.endsAt === b.endsAt;
      if (
        context.slots.some(
          (s) =>
            s.startsAt <= now &&
            (!old ||
              old.teacherId !== data.teacherId ||
              old.offeringId !== data.offeringId ||
              !old.slots.some((previous) => samePast(s, previous))),
        ) ||
        old?.slots.some(
          (s) => s.startsAt <= now && !context.slots.some((next) => samePast(s, next)),
        )
      )
        throw new AppError(
          422,
          'PAST_SCHEDULE',
          'Datas passadas devem ser preservadas e nao podem receber novas alocacoes.',
        );
      const record: Allocation = {
        ...(old ?? entity()),
        ...data,
        courseId,
        periodId: context.offering.periodId,
        subjectId: context.subject._id,
        groupId: context.group._id,
        state: 'DRAFT',
        slots: context.slots,
        version: (old?.version ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      await this.allocations.replaceOne({ _id: record._id }, record, { session, upsert: !old });
      await this.bump(courseId, record.periodId, session);
      if (old && old.periodId !== record.periodId) await this.bump(courseId, old.periodId, session);
      await this.database.db
        .collection<{ _id: string } & Record<string, unknown>>('evaluations')
        .insertOne({ ...entity(), courseId, allocationId: record._id, ...result }, { session });
      await audit(this.database, session, actor.user._id, 'ALLOCATION_SAVED', record._id, courseId);
      return view(record);
    });
  }
  async bump(courseId: string, periodId: string, session: ClientSession) {
    const key = `${courseId}:${periodId}`;
    const previous = await this.plans.findOne({ _id: key }, { session });
    const plan: Plan = {
      ...(previous ?? entity(key)),
      courseId,
      periodId,
      draftVersion: (previous?.draftVersion ?? 0) + 1,
      publishedRevision: previous?.publishedRevision ?? 0,
      version: (previous?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.plans.replaceOne({ _id: key }, plan, { session, upsert: !previous });
    return plan;
  }
  async publish(actor: Actor, courseId: string, periodId: string, expectedVersion: number) {
    return this.authorized(actor, courseId, async (session) => {
      const key = `${courseId}:${periodId}`;
      const plan = await this.plans.findOne({ _id: key }, { session });
      if (!plan) missing();
      if (plan.version !== expectedVersion) conflict('STALE_VERSION');
      const records = await this.allocations
        .find({ courseId, periodId, state: { $ne: 'CANCELLED' } }, { session })
        .sort({ _id: 1 })
        .toArray();
      const revision = plan.publishedRevision + 1;
      const assessments: ReturnType<typeof evaluate>[] = [];
      const retainedHistoricalIds: string[] = [];
      for (const record of records) {
        if (record.slots.every((slot) => slot.endsAt <= this.now().toISOString())) {
          const previous = await this.published.findOne(
            {
              allocationId: record._id,
              teacherId: record.teacherId,
              offeringId: record.offeringId,
            },
            { session },
          );
          if (!previous || JSON.stringify(previous.slots) !== JSON.stringify(record.slots))
            conflict(
              'PAST_PUBLICATION',
              'Encontros encerrados so podem ser preservados da publicacao anterior.',
            );
          retainedHistoricalIds.push(record._id);
          continue;
        }
        const { result } = await this.assessment(courseId, record, session, record._id, key);
        assessments.push(result);
        if (result.eligibility !== 'ELIGIBLE')
          conflict('PUBLICATION_NOT_ELIGIBLE', 'Reavalie as alocacoes antes de publicar.');
      }
      const previous = await this.published.find({ courseId, periodId }, { session }).toArray();
      await this.published.deleteMany({ courseId, periodId }, { session });
      if (records.length)
        await this.published.insertMany(
          records.map((r) => ({
            ...r,
            allocationId: r._id,
            revision,
            planId: key,
            state: 'PUBLISHED' as const,
          })),
          { session },
        );
      await this.database.db
        .collection<{ _id: string } & Record<string, unknown>>('publicationVersions')
        .insertOne(
          {
            ...entity(),
            planId: key,
            revision,
            actorId: actor.user._id,
            allocations: records,
            assessments,
            retainedHistoricalIds,
          },
          { session },
        );
      const now = this.now().toISOString();
      const activeKeys = new Set(
        records.flatMap((r) =>
          r.slots.map((s) => `${r._id}:${r.teacherId}:${s.startsAt}:${s.endsAt}`),
        ),
      );
      const current = await this.occurrences
        .find({ courseId, periodId, status: 'PLANNED', startsAt: { $gt: now } }, { session })
        .toArray();
      for (const occurrence of current)
        if (
          !activeKeys.has(
            `${occurrence.allocationId}:${occurrence.teacherId}:${occurrence.startsAt}:${occurrence.endsAt}`,
          )
        )
          await this.occurrences.updateOne(
            { _id: occurrence._id },
            {
              $set: {
                status: records.some((r) => r._id === occurrence.allocationId)
                  ? 'RESCHEDULED'
                  : 'CANCELLED',
                updatedAt: now,
              },
              $inc: { version: 1 },
            },
            { session },
          );
      const course = await this.identity.courses.findOne({ _id: courseId }, { session });
      for (const record of records) {
        const subject = await this.database.db
          .collection<Academic<{ name: string }>>('subjects')
          .findOne({ _id: record.subjectId }, { session });
        const group = await this.database.db
          .collection<Academic<{ name: string }>>('groups')
          .findOne({ _id: record.groupId }, { session });
        for (const slot of record.slots) {
          const match = {
            allocationId: record._id,
            teacherId: record.teacherId,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
          };
          const existing = await this.occurrences.findOne(match, { session });
          if (!existing)
            await this.occurrences.insertOne(
              {
                ...entity(),
                ...match,
                courseId,
                periodId,
                subjectId: record.subjectId,
                groupId: record.groupId,
                ...slot,
                courseName: course!.name,
                subjectName: subject!.name,
                groupName: group!.name,
                status: 'PLANNED',
              },
              { session },
            );
          else if (existing.status === 'CANCELLED' || existing.status === 'RESCHEDULED') {
            if (existing.startsAt <= now)
              conflict(
                'HISTORICAL_OCCURRENCE',
                'Uma ocorrencia passada nao pode ser reativada por publicacao.',
              );
            await this.occurrences.updateOne(
              { _id: existing._id },
              { $set: { status: 'PLANNED', updatedAt: now }, $inc: { version: 1 } },
              { session },
            );
          }
        }
        await this.allocations.updateOne(
          { _id: record._id },
          { $set: { state: 'PUBLISHED', updatedAt: now }, $inc: { version: 1 } },
          { session },
        );
      }
      for (const teacherId of new Set([...records, ...previous].map((r) => r.teacherId)))
        await notify(
          this.identity,
          session,
          teacherId,
          'SCHEDULE',
          key,
          'Sua escala foi publicada ou atualizada.',
        );
      await this.plans.updateOne(
        { _id: key },
        { $set: { publishedRevision: revision, updatedAt: now }, $inc: { version: 1 } },
        { session },
      );
      await audit(this.database, session, actor.user._id, 'SCHEDULE_PUBLISHED', key, courseId);
      return {
        revision,
        plan: view({ ...plan, version: plan.version + 1, publishedRevision: revision }),
        count: records.length,
      };
    });
  }
}
