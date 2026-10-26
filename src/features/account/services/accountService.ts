import { demoCoordinator } from '../../../mocks/coordinator';
import { teachersSeed } from '../../../mocks/teachers';
import { readJson, simulateLatency } from '../../../services/storage';
import { commitLocalChanges } from '../../../services/localTransaction';
import {
  changedEvent,
  listDemoProfiles,
  prepareDemoContact,
  REGISTRATION_KEY,
} from '../../registration/demoService';
import { PHOTO_KEY, photoEvent, preparePhotoMove } from '../photos';
import { validateAccount } from '../validation';
import type { Account, AccountInput } from '../types';
import {
  ACCOUNT_STORAGE_KEY,
  coordinatorLoginEmail,
  coordinatorRecord,
} from './coordinatorIdentity';
export { ACCOUNT_STORAGE_KEY } from './coordinatorIdentity';

interface StoredAccount {
  email: string;
  name: string;
  loginEmail?: string;
  phone?: string;
}
interface SessionIdentity {
  name: string;
  email: string;
}
function readStored(email: string): StoredAccount | null {
  if (email === demoCoordinator.email || email === coordinatorLoginEmail())
    return coordinatorRecord();
  const stored =
    readJson<StoredAccount>(localStorage, `${ACCOUNT_STORAGE_KEY}:${email}`) ??
    readJson<StoredAccount>(localStorage, ACCOUNT_STORAGE_KEY);
  const valid =
    stored &&
    (stored.email === email || stored.loginEmail === email) &&
    typeof stored.name === 'string' &&
    stored.name.trim();
  return valid ? stored : null;
}
function isCoordinator(email: string) {
  return email === demoCoordinator.email || email === coordinatorLoginEmail();
}
function roleFor(email: string) {
  return isCoordinator(email) ? demoCoordinator.role : 'Professor';
}
export async function getAccount(session: SessionIdentity): Promise<Account> {
  const teacher = listDemoProfiles().find((item) => item.email === session.email);
  const stored = readStored(session.email);
  return {
    name: teacher?.name ?? stored?.name ?? session.name,
    email: teacher?.email ?? stored?.loginEmail ?? session.email,
    phone: teacher?.phone ?? stored?.phone,
    role: roleFor(session.email),
  };
}
/** Browser demo only. A production email change requires server-side identity verification. */
export async function updateAccount(email: string, input: AccountInput): Promise<Account> {
  await simulateLatency(300);
  const existing = readStored(email);
  const teacher = listDemoProfiles().find((item) => item.email === email);
  const next = {
    name: input.name.trim().replace(/\s+/g, ' '),
    email: (input.email ?? email).trim().toLowerCase(),
    phone: (input.phone ?? teacher?.phone ?? existing?.phone ?? '').replace(/\D/g, ''),
  };
  const errors = validateAccount(next);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (
    next.email !== email &&
    (next.email === demoCoordinator.email ||
      next.email === coordinatorLoginEmail() ||
      listDemoProfiles().some((item) => item.email === next.email) ||
      teachersSeed.some((item) => item.email === next.email))
  )
    throw new Error('Este e-mail já pertence a outra conta.');
  const coordinator = isCoordinator(email);
  const changes: Record<string, string> = {};
  if (teacher) changes[REGISTRATION_KEY] = prepareDemoContact(email, next)!;
  else {
    const stored: StoredAccount = {
      email: coordinator ? demoCoordinator.email : email,
      name: next.name,
      ...(next.email !== (coordinator ? demoCoordinator.email : email)
        ? { loginEmail: next.email }
        : {}),
      ...(next.phone ? { phone: next.phone } : {}),
    };
    // One coordinator record retains a stable identity while its login email changes.
    changes[coordinator ? ACCOUNT_STORAGE_KEY : `${ACCOUNT_STORAGE_KEY}:${email}`] =
      JSON.stringify(stored);
  }
  if (next.email !== email) changes[PHOTO_KEY] = preparePhotoMove(email, next.email);
  commitLocalChanges(changes);
  window.dispatchEvent(new Event(changedEvent));
  window.dispatchEvent(new Event(photoEvent));
  return { ...next, role: coordinator ? demoCoordinator.role : 'Professor' };
}
