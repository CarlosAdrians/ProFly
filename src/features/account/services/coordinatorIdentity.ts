import { demoCoordinator } from '../../../mocks/coordinator';
import { readJson } from '../../../services/storage';
export const ACCOUNT_STORAGE_KEY = 'profly:account';
export interface CoordinatorRecord {
  email: string;
  name: string;
  loginEmail?: string;
  phone?: string;
}
export function coordinatorRecord() {
  const global = readJson<CoordinatorRecord>(localStorage, ACCOUNT_STORAGE_KEY);
  const scoped = readJson<CoordinatorRecord>(
    localStorage,
    `${ACCOUNT_STORAGE_KEY}:${demoCoordinator.email}`,
  );
  const current = global?.email === demoCoordinator.email ? global : scoped;
  return current?.email === demoCoordinator.email &&
    typeof current.name === 'string' &&
    (!current.loginEmail || typeof current.loginEmail === 'string')
    ? current
    : null;
}
export function coordinatorLoginEmail() {
  return coordinatorRecord()?.loginEmail ?? demoCoordinator.email;
}
