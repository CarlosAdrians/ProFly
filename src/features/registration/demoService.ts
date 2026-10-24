import { useEffect, useState } from 'react';
import { demoCoordinator } from '../../mocks/coordinator';
import { teachersSeed } from '../../mocks/teachers';
import type { TeacherProfile, RegistrationData, CourseRequest } from './model';
import type { Availability } from './model';
import { validateRegistration } from './validation';
import { LEGAL_VERSION } from '../legal/content';
import { coordinatorLoginEmail } from '../account/services/coordinatorIdentity';

export const REGISTRATION_KEY = 'profly:demo:registrations:v1';
export const changedEvent = 'profly:profile-changed';
interface StoredAccount {
  profile: TeacherProfile;
  salt: number[];
  proof: number[];
}
function accounts(): StoredAccount[] {
  const value = localStorage.getItem(REGISTRATION_KEY);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) => item?.profile?.email && Array.isArray(item.salt) && Array.isArray(item.proof),
      )
    )
      return parsed;
  } catch {
    /* Corrupted personal data must not be overwritten by a new registration. */
  }
  throw new Error(
    'Não foi possível ler os cadastros deste navegador. Seus dados foram preservados.',
  );
}
function persist(value: StoredAccount[]) {
  try {
    localStorage.setItem(REGISTRATION_KEY, JSON.stringify(value));
  } catch {
    throw new Error('Não foi possível salvar. Verifique o espaço disponível no navegador.');
  }
  window.dispatchEvent(new Event(changedEvent));
}
async function passwordProof(password: string, salt: number[]) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return [
    ...new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations: 210000 },
        key,
        256,
      ),
    ),
  ];
}
/** Explicit browser-only demonstration adapter; not production authentication or authorization. */
export async function registerDemo(
  data: RegistrationData,
  password: string,
  confirmation: string,
  terms: boolean,
  privacy: boolean,
) {
  for (let step = 0; step < 4; step++) {
    const errors = validateRegistration(data, step, password, confirmation, terms, privacy);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  }
  const email = data.email.trim().toLowerCase();
  const before = accounts();
  if (
    email === demoCoordinator.email ||
    email === coordinatorLoginEmail() ||
    teachersSeed.some((item) => item.email === email) ||
    before.some((item) => item.profile.email === email)
  )
    throw new Error('Este e-mail já possui um cadastro. Entre na sua conta.');
  const salt = [...crypto.getRandomValues(new Uint8Array(16))];
  const proof = await passwordProof(password, salt);
  // Re-read after hashing: concurrent submissions in this tab cannot overwrite each other.
  const current = accounts();
  if (current.some((item) => item.profile.email === email))
    throw new Error('Este e-mail já está cadastrado.');
  const now = new Date().toISOString();
  const profile: TeacherProfile = {
    ...data,
    name: data.name.trim(),
    email,
    phone: data.phone.replace(/\D/g, ''),
    requests: data.requests.map(({ courseId, subjects }) => ({
      courseId,
      subjects: [...subjects],
      status: 'PENDING',
    })),
    id: crypto.randomUUID(),
    version: 1,
    createdAt: now,
    acceptedAt: now,
    legalVersion: LEGAL_VERSION,
  };
  persist([...current, { profile, salt, proof }]);
  return profile;
}
export async function authenticateDemoTeacher(email: string, password: string) {
  const account = accounts().find((item) => item.profile.email === email.trim().toLowerCase());
  if (!account) return null;
  const proof = await passwordProof(password, account.salt);
  if (proof.some((byte, index) => byte !== account.proof[index])) return null;
  return account.profile;
}
export function listDemoProfiles(): TeacherProfile[] {
  return accounts().map((item) => item.profile);
}
/** Prepares one storage write; identity and photo migration are committed together by the account adapter. */
export function prepareDemoContact(
  email: string,
  input: { name: string; email: string; phone: string },
) {
  const current = accounts();
  const entry = current.find((item) => item.profile.email === email);
  if (!entry) return undefined;
  entry.profile = { ...entry.profile, ...input, version: entry.profile.version + 1 };
  return JSON.stringify(current);
}
export function saveDemoAvailability(
  email: string,
  availability: Availability[],
  weeklyHours: string,
  expectedVersion: number,
) {
  const current = accounts();
  const account = current.find((item) => item.profile.email === email);
  if (!account) throw new Error('Perfil não encontrado nesta conta.');
  if (account.profile.version !== expectedVersion)
    throw new Error('Seu perfil mudou em outra tela. Atualize a página antes de salvar.');
  if (new Set(availability.map((item) => item.id)).size !== availability.length)
    throw new Error('Confira os horários informados.');
  const errors = validateRegistration({ ...account.profile, availability, weeklyHours }, 2);
  if (errors.availability || errors.weeklyHours)
    throw new Error(errors.availability || errors.weeklyHours);
  account.profile = {
    ...account.profile,
    availability: availability.map((item) => ({ ...item })),
    weeklyHours,
    version: account.profile.version + 1,
  };
  persist(current);
  return account.profile;
}
export function reviewDemoRequest(
  email: string,
  courseId: string,
  decision: Exclude<CourseRequest['status'], 'PENDING'>,
  reason: string,
  expectedVersion: number,
) {
  if (reason.trim().length < 3) throw new Error('Informe o motivo da decisão.');
  const current = accounts();
  const account = current.find((item) => item.profile.email === email);
  const request = account?.profile.requests.find((item) => item.courseId === courseId);
  if (!account || !request) throw new Error('Solicitação não encontrada.');
  if (account.profile.version !== expectedVersion || request.status !== 'PENDING')
    throw new Error('A solicitação mudou. Atualize a tela antes de decidir.');
  request.status = decision;
  request.reason = reason.trim();
  request.reviewer = demoCoordinator.email;
  request.reviewedAt = new Date().toISOString();
  account.profile.version++;
  persist(current);
}
export function useDemoProfiles() {
  const read = () => {
    try {
      return { profiles: listDemoProfiles(), error: '' };
    } catch (error) {
      return {
        profiles: [] as TeacherProfile[],
        error: error instanceof Error ? error.message : 'Não foi possível carregar os perfis.',
      };
    }
  };
  const [value, setValue] = useState(read);
  useEffect(() => {
    const refresh = () => setValue(read());
    window.addEventListener(changedEvent, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(changedEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return value;
}
