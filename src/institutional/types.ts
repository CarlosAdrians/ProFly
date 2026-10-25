import type { ProfileData } from '../../backend/src/teachers/contracts';
import type { Criteria, PeriodData, OfferingData } from '../../backend/src/academics/contracts';
export type { ProfileData, Criteria, PeriodData, OfferingData };
export interface RecordBase {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface CatalogItem extends RecordBase {
  code: string;
  name: string;
  active: boolean;
  courseId?: string;
  roles?: string[];
}
export interface User {
  id: string;
  version: number;
  name: string;
  email: string;
  roles: ('teacher' | 'coordinator' | 'admin')[];
  state: string;
  phone: string | null;
  photoVersion: number;
}
export interface Session {
  user: User;
  csrfToken: string;
  expiresAt: string;
}
export interface Profile extends RecordBase {
  data: ProfileData;
  missingFields: Record<string, string[]>;
}
export interface Application extends RecordBase {
  teacherId: string;
  courseId: string;
  profileVersion: number;
  subjectIds: string[];
  status: 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  reason?: string;
}
export interface ReviewDetail {
  application: Application;
  teacher: Pick<User, 'id' | 'name' | 'email'>;
  profile: { data: ProfileData; profileVersion: number };
  currentProfileVersion: number;
  review: unknown;
}
export type Period = RecordBase & PeriodData;
export type Subject = CatalogItem & { criteria: Criteria | null };
export type Offering = RecordBase & OfferingData & { courseId: string };
export type Meeting = OfferingData['meetings'][number];
export type Allocation = RecordBase & {
  offeringId: string;
  teacherId: string;
  courseId: string;
  periodId: string;
  subjectId: string;
  groupId: string;
  state: string;
  meetings: Meeting[];
  slots: { date: string; startsAt: string; endsAt: string }[];
};
export type Plan = RecordBase & {
  courseId: string;
  periodId: string;
  draftVersion: number;
  publishedRevision: number;
};
export interface Planning {
  allocations: Allocation[];
  published: Allocation[];
  plans: Plan[];
}
export interface Assessment {
  teacherId: string;
  profileVersion: number;
  rulesVersion: number;
  eligibility: string;
  policy: string;
  checks: { id: string; state: string; reason: string }[];
  score: {
    state: string;
    value: number | null;
    factors: { id: string; weight: number; ratio: number | null; points: number | null }[];
  };
}
export type Occurrence = RecordBase & {
  teacherId: string;
  courseId: string;
  subjectId: string;
  groupId: string;
  courseName: string;
  subjectName: string;
  groupName: string;
  date: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
  status: string;
  displayStatus?: string;
  absencePending?: boolean;
};
export type Absence = RecordBase & {
  teacherId: string;
  startsOn: string;
  endsOn: string;
  courseIds?: string[];
  decisions: Record<string, { status: string }>;
  attachment?: { bytes: number; type: string };
};
export type Notice = RecordBase & { title: string; kind: string; read: boolean };
export interface Items<T> {
  items: T[];
}
