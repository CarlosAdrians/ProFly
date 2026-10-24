import { randomUUID } from 'node:crypto';
import type { ClientSession } from 'mongodb';
import type { Database } from '../database.js';

export interface Entity {
  _id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Audit extends Entity {
  actorId: string;
  action: string;
  resourceId: string;
  courseId?: string;
}

export function entity(id: string = randomUUID()): Entity {
  const now = new Date().toISOString();
  return { _id: id, version: 1, createdAt: now, updatedAt: now };
}

export function view<T extends Entity>(record: T) {
  const { _id, ...data } = record;
  return { id: _id, ...data };
}

export async function audit(
  database: Database,
  session: ClientSession,
  actorId: string,
  action: string,
  resourceId: string,
  courseId?: string,
) {
  await database.db
    .collection<Audit>('audit')
    .insertOne(
      { ...entity(), actorId, action, resourceId, ...(courseId ? { courseId } : {}) },
      { session },
    );
}

export interface Guard {
  _id: string;
  version: number;
}
export async function lock(database: Database, session: ClientSession, ...resources: string[]) {
  for (const id of [...new Set(resources)].sort()) {
    const result = await database.db
      .collection<Guard>('guards')
      .updateOne({ _id: id }, { $inc: { version: 1 } }, { session });
    if (!result.matchedCount) throw new Error('Resource guard is missing.');
  }
}
