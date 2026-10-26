import type { TeacherProfile } from './model';

export interface StoredAccount {
  profile: TeacherProfile;
  salt: number[];
  proof: number[];
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => typeof value[key] === 'string');
const rows = (value: unknown, valid: (row: Record<string, unknown>) => boolean) =>
  Array.isArray(value) && value.every((row) => record(row) && valid(row));
const bytes = (value: unknown, length: number) =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255);

/** Structural checks only: reading an older record must not apply new academic policies. */
function isProfile(value: unknown): value is TeacherProfile {
  if (!record(value)) return false;
  const experience = (item: unknown) =>
    record(item) &&
    strings(item, ['organization', 'activity', 'units']) &&
    ['UNKNOWN', 'NONE', 'PROVIDED'].includes(String(item.status));
  return (
    strings(value, [
      'id',
      'name',
      'email',
      'phone',
      'weeklyHours',
      'createdAt',
      'legalVersion',
      'acceptedAt',
    ]) &&
    Number.isInteger(value.version) &&
    Number(value.version) >= 1 &&
    (value.photo === undefined || typeof value.photo === 'string') &&
    rows(value.education, (row) =>
      strings(row, ['id', 'degree', 'field', 'institution', 'year']),
    ) &&
    rows(value.knowledge, (row) => strings(row, ['id', 'name']) && Number.isInteger(row.level)) &&
    rows(
      value.availability,
      (row) => strings(row, ['id', 'start', 'end']) && Number.isInteger(row.weekday),
    ) &&
    rows(
      value.requests,
      (row) =>
        typeof row.courseId === 'string' &&
        Array.isArray(row.subjects) &&
        row.subjects.every((subject) => typeof subject === 'string') &&
        ['PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(String(row.status)) &&
        ['reason', 'reviewedAt', 'reviewer'].every(
          (key) => row[key] === undefined || typeof row[key] === 'string',
        ),
    ) &&
    experience(value.teaching) &&
    experience(value.professional)
  );
}

export const profileReadError =
  'Não foi possível ler os cadastros deste navegador. Seus dados foram preservados.';
export function parseStoredAccounts(raw: string | null): StoredAccount[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (
      Array.isArray(value) &&
      value.every(
        (item) =>
          record(item) && isProfile(item.profile) && bytes(item.salt, 16) && bytes(item.proof, 32),
      )
    )
      return value;
  } catch {
    /* Preserve the original storage when a record is malformed. */
  }
  throw new Error(profileReadError);
}
