import { MongoClient, type ClientSession, type Db } from 'mongodb';
import type { Config } from './config.js';

export class Database {
  readonly client: MongoClient;
  readonly db: Db;

  constructor(config: Pick<Config, 'mongoUri' | 'database'>) {
    this.client = new MongoClient(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
      maxPoolSize: 10,
    });
    this.db = this.client.db(config.database);
  }

  async connect() {
    await this.client.connect();
    const topology = await this.db.command({ hello: 1 });
    if (!topology.setName && topology.msg !== 'isdbgrid') {
      await this.close();
      throw new Error('MongoDB deve oferecer transacoes (replica set ou cluster compativel).');
    }
    await this.ensureIndexes();
  }

  async ensureIndexes() {
    await this.db
      .collection<{ _id: string; version: number }>('guards')
      .updateOne({ _id: 'academics' }, { $setOnInsert: { version: 0 } }, { upsert: true });
    await this.db.collection('competencies').createIndex({ code: 1 }, { unique: true });
    await this.db.collection('periods').createIndex({ code: 1 }, { unique: true });
    await this.db
      .collection('offerings')
      .createIndex({ courseId: 1, periodId: 1, code: 1 }, { unique: true });
    await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await this.db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
    await this.db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await this.db.collection('tokens').createIndex({ tokenHash: 1 }, { unique: true });
    await this.db.collection('tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await this.db.collection('courses').createIndex({ code: 1 }, { unique: true });
    await this.db
      .collection('memberships')
      .createIndex({ userId: 1, courseId: 1, role: 1 }, { unique: true });
    await this.db
      .collection('applications')
      .createIndex({ teacherId: 1, courseId: 1 }, { unique: true });
    await this.db.collection('subjects').createIndex({ courseId: 1, code: 1 }, { unique: true });
    await this.db
      .collection('groups')
      .createIndex({ courseId: 1, periodId: 1, code: 1 }, { unique: true });
    await this.db
      .collection('reviews')
      .createIndex({ teacherId: 1, courseId: 1, profileVersion: 1 }, { unique: true });
    await this.db.collection('allocations').createIndex({ courseId: 1, periodId: 1, state: 1 });
    await this.db.collection('occurrences').createIndex({ teacherId: 1, startsAt: -1, _id: -1 });
  }

  async transaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    return this.client.withSession((session) =>
      session.withTransaction(() => operation(session), {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        maxCommitTimeMS: 5000,
      }),
    );
  }

  async ping() {
    await this.db.command({ ping: 1 });
  }
  async close() {
    await this.client.close();
  }
}
