import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { ClientSession } from 'mongodb';
import type { Config } from '../config.js';
import type { Database } from '../database.js';
import { AppError, conflict, missing } from '../shared/errors.js';
import { equalSecret, hashPassword, token, tokenHash, verifyPassword } from '../shared/crypto.js';
import { audit, entity, lock, type Guard } from '../shared/model.js';
import type { GuardHook } from '../shared/http.js';
import {
  type AccessToken,
  type Actor,
  type Course,
  type Membership,
  type Notifications,
  type Role,
  type Session,
  type User,
  userView,
} from './models.js';

export const SESSION_COOKIE = 'profly_session';
const unauthorized = () => new AppError(401, 'UNAUTHENTICATED', 'Entre na sua conta.');

export class IdentityService {
  constructor(
    readonly database: Database,
    readonly config: Config,
    readonly notifications?: Notifications,
  ) {}
  get users() {
    return this.database.db.collection<User>('users');
  }
  get memberships() {
    return this.database.db.collection<Membership>('memberships');
  }
  get courses() {
    return this.database.db.collection<Course>('courses');
  }

  guard(roles?: Role[]): GuardHook {
    return async (request) => {
      const value = request.cookies[SESSION_COOKIE];
      if (!value || !/^[a-f0-9]{64}$/.test(value)) throw unauthorized();
      const session = await this.database.db
        .collection<Session>('sessions')
        .findOne({ tokenHash: tokenHash(value), expiresAt: { $gt: new Date() } });
      if (!session) throw unauthorized();
      const user = await this.users.findOne({ _id: session.userId, state: 'ACTIVE' });
      if (!user) throw unauthorized();
      if (roles && !roles.some((role) => user.roles.includes(role)))
        throw new AppError(403, 'FORBIDDEN', 'Operacao nao permitida para este perfil.');
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const csrf = request.headers['x-csrf-token'];
        if (typeof csrf !== 'string' || !equalSecret(csrf, session.csrfToken))
          throw new AppError(403, 'CSRF_REQUIRED', 'Atualize a sessao e tente novamente.');
      }
      request.actor = { user, session };
    };
  }

  actor(request: FastifyRequest): Actor {
    if (!request.actor) throw unauthorized();
    return request.actor;
  }

  async course(actor: Actor, courseId: string, session?: ClientSession, allowTeacher = false) {
    const course = await this.courses.findOne({ _id: courseId, active: true }, { session });
    if (!course) missing();
    if (actor.user.roles.includes('admin')) return course;
    const membership = await this.memberships.findOne(
      {
        userId: actor.user._id,
        courseId,
        active: true,
        role: allowTeacher ? { $in: ['teacher', 'coordinator'] } : 'coordinator',
      },
      { session },
    );
    if (!membership) missing();
    return course;
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({ email });
    const valid = await verifyPassword(password, user?.passwordHash);
    if (!valid || !user || user.state === 'DISABLED' || user.state === 'INVITED')
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha invalidos.');
    if (user.state === 'PENDING_EMAIL')
      throw new AppError(
        403,
        'EMAIL_VERIFICATION_REQUIRED',
        'Confirme seu e-mail antes de entrar.',
      );
    const raw = token();
    const session: Session = {
      _id: randomUUID(),
      userId: user._id,
      tokenHash: tokenHash(raw),
      csrfToken: token(),
      expiresAt: new Date(Date.now() + this.config.sessionHours * 3600000),
    };
    // Serialize against disabling/revoking this user; don't create an active session after a stale read.
    const accepted = await this.database.transaction(async (transaction) => {
      await lock(this.database, transaction, `user:${user._id}`);
      const current = await this.users.findOne(
        { _id: user._id, state: 'ACTIVE', passwordHash: user.passwordHash },
        { session: transaction },
      );
      if (!current) throw unauthorized();
      await this.database.db
        .collection<Session>('sessions')
        .insertOne(session, { session: transaction });
      return current;
    });
    return { raw, session, user: userView(accepted) };
  }

  async createToken(userId: string, purpose: AccessToken['purpose'], session: ClientSession) {
    const raw = token();
    await this.database.db.collection<AccessToken>('tokens').insertOne(
      {
        _id: randomUUID(),
        userId,
        purpose,
        tokenHash: tokenHash(raw),
        expiresAt: new Date(Date.now() + (purpose === 'INVITE' ? 48 * 3600000 : 3600000)),
        consumedAt: null,
      },
      { session },
    );
    return raw;
  }

  async activate(raw: string, purpose: 'INVITE' | 'VERIFY_EMAIL', passwordHash?: string) {
    const candidate = await this.database.db
      .collection<AccessToken>('tokens')
      .findOne({ tokenHash: tokenHash(raw), purpose });
    if (!candidate) throw new AppError(410, 'TOKEN_UNAVAILABLE', 'Link invalido ou indisponivel.');
    return this.database.transaction(async (session) => {
      await lock(this.database, session, `user:${candidate.userId}`);
      const proof = await this.database.db
        .collection<AccessToken>('tokens')
        .findOne(
          { _id: candidate._id, purpose, consumedAt: null, expiresAt: { $gt: new Date() } },
          { session },
        );
      const user = await this.users.findOne(
        { _id: candidate.userId, state: purpose === 'INVITE' ? 'INVITED' : 'PENDING_EMAIL' },
        { session },
      );
      if (!proof || !user)
        throw new AppError(410, 'TOKEN_UNAVAILABLE', 'Link invalido ou indisponivel.');
      await this.users.updateOne(
        { _id: user._id },
        {
          $set: {
            state: 'ACTIVE',
            verifiedAt: new Date().toISOString(),
            ...(passwordHash ? { passwordHash } : {}),
            updatedAt: new Date().toISOString(),
          },
          $inc: { version: 1 },
        },
        { session },
      );
      await this.database.db
        .collection<AccessToken>('tokens')
        .updateOne({ _id: proof._id }, { $set: { consumedAt: new Date() } }, { session });
      await audit(this.database, session, user._id, 'IDENTITY_ACTIVATED', user._id);
      return { activated: true };
    });
  }

  async register(input: { name: string; email: string; password: string }) {
    if (!this.notifications)
      throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Envio de verificacao ainda nao configurado.');
    const passwordHash = await hashPassword(input.password);
    const user: User = {
      ...entity(),
      name: input.name,
      email: input.email,
      passwordHash,
      roles: ['teacher'],
      state: 'PENDING_EMAIL',
    };
    const raw = await this.database.transaction(async (session) => {
      await this.users.insertOne(user, { session });
      await this.database.db
        .collection<Guard>('guards')
        .insertOne({ _id: `user:${user._id}`, version: 0 }, { session });
      const raw = await this.createToken(user._id, 'VERIFY_EMAIL', session);
      await audit(this.database, session, user._id, 'REGISTRATION_REQUESTED', user._id);
      return raw;
    });
    try {
      await this.notifications.send({ email: user.email, purpose: 'VERIFY_EMAIL', token: raw });
    } catch {
      throw new AppError(
        503,
        'EMAIL_UNAVAILABLE',
        'Nao foi possivel enviar a verificacao. Solicite novo envio.',
      );
    }
    return { user: userView(user), verificationRequired: true };
  }

  async requestEmail(email: string, purpose: 'RESET' | 'VERIFY_EMAIL') {
    if (!this.notifications)
      throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Envio de e-mail ainda nao configurado.');
    const user = await this.users.findOne({
      email,
      state: purpose === 'RESET' ? 'ACTIVE' : 'PENDING_EMAIL',
    });
    if (user) {
      const raw = await this.database.transaction(async (session) => {
        await lock(this.database, session, `user:${user._id}`);
        await this.database.db
          .collection<AccessToken>('tokens')
          .updateMany(
            { userId: user._id, purpose, consumedAt: null },
            { $set: { consumedAt: new Date() } },
            { session },
          );
        return this.createToken(user._id, purpose, session);
      });
      try {
        await this.notifications.send({ email, purpose, token: raw });
      } catch {
        throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Servico de envio indisponivel.');
      }
    }
    return { message: 'Se houver uma conta elegivel, as instrucoes serao enviadas.' };
  }

  async resetPassword(raw: string, passwordHash: string) {
    const proof = await this.database.db
      .collection<AccessToken>('tokens')
      .findOne({ tokenHash: tokenHash(raw), purpose: 'RESET' });
    if (!proof) throw new AppError(410, 'TOKEN_UNAVAILABLE', 'Link invalido ou indisponivel.');
    await this.database.transaction(async (session) => {
      await lock(this.database, session, `user:${proof.userId}`);
      const current = await this.database.db
        .collection<AccessToken>('tokens')
        .findOne({ _id: proof._id, consumedAt: null, expiresAt: { $gt: new Date() } }, { session });
      const user = await this.users.findOne({ _id: proof.userId, state: 'ACTIVE' }, { session });
      if (!current || !user)
        throw new AppError(410, 'TOKEN_UNAVAILABLE', 'Link invalido ou indisponivel.');
      await this.users.updateOne(
        { _id: user._id },
        { $set: { passwordHash, updatedAt: new Date().toISOString() }, $inc: { version: 1 } },
        { session },
      );
      await this.database.db
        .collection<AccessToken>('tokens')
        .updateOne({ _id: proof._id }, { $set: { consumedAt: new Date() } }, { session });
      await this.database.db
        .collection<Session>('sessions')
        .deleteMany({ userId: user._id }, { session });
      await audit(this.database, session, user._id, 'PASSWORD_RESET', user._id);
    });
  }

  async bootstrap(name: string, email: string, password: string) {
    const passwordHash = await hashPassword(password);
    const user: User = {
      ...entity(),
      name,
      email,
      passwordHash,
      roles: ['admin'],
      state: 'ACTIVE',
      verifiedAt: new Date().toISOString(),
    };
    await this.database.transaction(async (session) => {
      if (await this.users.countDocuments({ roles: 'admin' }, { session }))
        conflict('ADMIN_EXISTS', 'Administrador inicial ja existe.');
      await this.database.db
        .collection<Guard>('guards')
        .insertOne({ _id: 'administrators', version: 0 }, { session });
      await this.database.db
        .collection<Guard>('guards')
        .insertOne({ _id: `user:${user._id}`, version: 0 }, { session });
      await this.users.insertOne(user, { session });
      await audit(this.database, session, user._id, 'BOOTSTRAP_ADMIN', user._id);
    });
    return userView(user);
  }
}
