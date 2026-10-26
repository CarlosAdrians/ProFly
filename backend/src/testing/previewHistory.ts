import { createHash } from 'node:crypto';
import type { Config } from '../config.js';
import type { Database } from '../database.js';
import type { Course, Membership, User } from '../identity/models.js';
import type { Occurrence } from '../scheduling/models.js';
import { audit, entity, lock, type Entity } from '../shared/model.js';

/** Test data preparation only. Not registered as an HTTP route or imported by the server. */
export async function seedPreviewHistory(database: Database, config: Config, teacherId: string) {
  if (
    config.environment !== 'test' ||
    !/^profly_ui_[a-f0-9]{32}_test$/.test(config.database) ||
    database.db.databaseName !== config.database ||
    !/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(config.mongoUri) ||
    config.privacy.approved ||
    config.privacy.healthUploads !== 'SYNTHETIC_ONLY'
  )
    throw new Error('Historico permitido somente na previa sintetica local isolada.');

  return database.transaction(async (session) => {
    await lock(database, session, 'academics');
    const users = database.db.collection<User>('users');
    const teacher = await users.findOne(
      { _id: teacherId, email: 'docente.ui@profly.test', state: 'ACTIVE', roles: 'teacher' },
      { session },
    );
    const coordinator = await users.findOne(
      { email: 'coordenacao.ui@profly.test', state: 'ACTIVE', roles: 'coordinator' },
      { session },
    );
    const course = await database.db
      .collection<Course>('courses')
      .findOne({ code: 'DIR-UI', active: true }, { session });
    if (!teacher || !coordinator || !course)
      throw new Error('Identidades sinteticas indisponiveis.');
    await lock(database, session, `user:${teacherId}`, `course:${course._id}`);
    const memberships = database.db.collection<Membership>('memberships');
    for (const [userId, role] of [
      [teacher._id, 'teacher'],
      [coordinator._id, 'coordinator'],
    ] as const)
      if (
        !(await memberships.findOne(
          { userId, courseId: course._id, role, active: true },
          { session },
        ))
      )
        throw new Error('Vinculo sintetico ativo obrigatorio.');
    const subjects = await database.db
      .collection<Entity & { courseId: string; code: string; name: string; active: boolean }>(
        'subjects',
      )
      .find({ courseId: course._id, active: true }, { session })
      .sort({ code: 1 })
      .toArray();
    if (!subjects.length) throw new Error('Disciplina sintetica indisponivel.');
    // Stable UUIDs make repeat runs idempotent, including across different days.
    const stableId = (key: string) => {
      const hex = createHash('sha256')
        .update(`preview-history-v1:${teacherId}:${key}`)
        .digest('hex');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    };
    const ids = [0, 1, 2, 3, 4].map((i) => stableId(`lesson-${i}`));
    const occurrences = database.db.collection<Occurrence>('occurrences');
    const existing = await occurrences.countDocuments({ _id: { $in: ids } }, { session });
    if (existing === 5) return { created: 0, preserved: 5 };
    if (existing)
      throw new Error('Historico sintetico parcial; revise sem sobrescrever registros.');
    const localDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const monday = new Date(`${localDay}T12:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1) - 7);
    const day = (offset: number) => {
      const d = new Date(monday);
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const periodId = stableId('period'),
      groupId = stableId('group');
    // This isolated import represents old records; public scheduling still rejects past allocations.
    await database.db
      .collection<Entity & Record<string, unknown>>('periods')
      .insertOne(
        {
          ...entity(periodId),
          code: 'UI-HISTORY-V1',
          name: 'Histórico fictício',
          active: false,
          startsOn: day(0),
          endsOn: day(5),
          timeZone: 'America/Fortaleza',
          calendarStatus: 'REVIEWED',
          blocks: [{ weekday: 1, startsAt: '08:00', endsAt: '08:50', shift: 'MORNING' }],
        },
        { session },
      );
    await database.db
      .collection<Entity & Record<string, unknown>>('groups')
      .insertOne(
        {
          ...entity(groupId),
          code: 'UI-HISTORY-V1',
          name: 'Turma de teste · Histórico',
          active: false,
          courseId: course._id,
          periodId,
        },
        { session },
      );
    const times = ['08:00', '14:00', '18:30', '09:00', '15:00'];
    const statuses: Occurrence['status'][] = [
      'COMPLETED',
      'COMPLETED',
      'CANCELLED',
      'COMPLETED',
      'PLANNED',
    ];
    await occurrences.insertMany(
      ids.map((id, index) => {
        const subject = subjects[index % subjects.length]!;
        const startsAt = new Date(`${day(index)}T${times[index]}:00-03:00`);
        return {
          ...entity(id),
          allocationId: stableId(`archived-allocation-${index}`),
          courseId: course._id,
          periodId,
          groupId,
          teacherId,
          subjectId: subject._id,
          courseName: course.name,
          subjectName: subject.name,
          groupName: 'Turma de teste · Histórico',
          date: day(index),
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + 50 * 60000).toISOString(),
          minutes: 50,
          status: statuses[index]!,
          ...(statuses[index] !== 'PLANNED' ? { confirmedBy: coordinator._id } : {}),
        };
      }),
      { session },
    );
    await audit(
      database,
      session,
      coordinator._id,
      'SYNTHETIC_HISTORY_PREPARED',
      teacherId,
      course._id,
    );
    return { created: 5, preserved: 0 };
  });
}
