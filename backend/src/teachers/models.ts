import type { Entity } from '../shared/model.js';
import type { ProfileData } from './contracts.js';

export interface TeacherProfile extends Entity {
  data: ProfileData;
}
export interface ProfileSnapshot extends Entity {
  teacherId: string;
  profileVersion: number;
  source: 'TEACHER_DECLARED';
  data: ProfileData;
}
export interface Application extends Entity {
  teacherId: string;
  courseId: string;
  profileVersion: number;
  subjectIds: string[];
  status: 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  reviewerId?: string;
  reason?: string;
  reviewedAt?: string;
}
export interface Review extends Entity {
  teacherId: string;
  courseId: string;
  profileVersion: number;
  reviewerId: string;
  applicationId: string;
  subjectIds: string[];
  items: { id: string; status: 'CONFIRMED' | 'REJECTED' | 'ABSENT' }[];
  experienceDeclarations: {
    teaching: 'UNKNOWN' | 'NONE' | 'PROVIDED';
    professional: 'UNKNOWN' | 'NONE' | 'PROVIDED';
  };
}
