import type { Entity } from '../shared/model.js';

export type Role = 'admin' | 'coordinator' | 'teacher';
export interface User extends Entity {
  name: string;
  email: string;
  roles: Role[];
  state: 'INVITED' | 'PENDING_EMAIL' | 'ACTIVE' | 'DISABLED';
  passwordHash?: string;
  verifiedAt?: string;
}
export interface Session {
  _id: string;
  userId: string;
  tokenHash: string;
  csrfToken: string;
  expiresAt: Date;
}
export interface AccessToken {
  _id: string;
  userId: string;
  tokenHash: string;
  purpose: 'INVITE' | 'VERIFY_EMAIL' | 'RESET';
  expiresAt: Date;
  consumedAt: Date | null;
}
export interface Course extends Entity {
  code: string;
  name: string;
  active: boolean;
}
export interface Membership extends Entity {
  userId: string;
  courseId: string;
  role: 'coordinator' | 'teacher';
  active: boolean;
}
export interface Actor {
  user: User;
  session: Session;
}

export interface Notifications {
  send(message: { email: string; purpose: 'VERIFY_EMAIL' | 'RESET'; token: string }): Promise<void>;
}

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor | null;
  }
}

export function userView(user: User) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    state: user.state,
    version: user.version,
  };
}
