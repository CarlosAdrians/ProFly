import { z } from 'zod';
import { id } from '../shared/http.js';
import { date } from '../shared/temporal.js';
import { offeringInput } from '../academics/contracts.js';
import type { Entity } from '../shared/model.js';
import { roomInput } from './rooms.js';

export const meetingsInput = offeringInput.shape.meetings;
export type Meeting = z.infer<typeof meetingsInput>[number];
export interface Slot {
  startsAt: string;
  endsAt: string;
  date: string;
  minutes: number;
  room?: string | null;
  roomKey?: string | null;
}
export const allocationInput = z.strictObject({
  offeringId: id,
  teacherId: id,
  room: roomInput,
  meetings: meetingsInput.min(1),
});
export type AllocationData = z.infer<typeof allocationInput>;
export interface Allocation extends Entity, AllocationData {
  roomKey?: string | null;
  courseId: string;
  periodId: string;
  subjectId: string;
  groupId: string;
  state: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  slots: Slot[];
}
export interface PublishedAllocation extends Allocation {
  allocationId: string;
  revision: number;
}
export interface Plan extends Entity {
  courseId: string;
  periodId: string;
  draftVersion: number;
  publishedRevision: number;
}
export interface Workload extends Entity {
  teacherId: string;
  weeklyMinutes: number;
  validFrom: string;
  validUntil: string;
  timeZone: string;
}
export const workloadInput = z
  .strictObject({
    expectedVersion: z.number().int().min(0),
    weeklyMinutes: z.number().int().min(1).max(10080),
    validFrom: date,
    validUntil: date,
    timeZone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('pt-BR', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }),
  })
  .refine((v) => v.validFrom <= v.validUntil);
export const absenceInput = z
  .strictObject({
    startsOn: date,
    endsOn: date,
    courseIds: z
      .array(id)
      .min(1)
      .max(20)
      .refine((v) => new Set(v).size === v.length),
  })
  .refine((v) => v.startsOn <= v.endsOn);
export interface Absence extends Entity {
  teacherId: string;
  startsOn: string;
  endsOn: string;
  courseIds: string[];
  decisions: Record<
    string,
    { status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'; by?: string; at?: string }
  >;
  attachment?: { bytes: number; type: string };
}
export interface Occurrence extends Entity {
  room?: string | null;
  allocationId: string;
  courseId: string;
  periodId: string;
  subjectId: string;
  groupId: string;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  date: string;
  minutes: number;
  courseName: string;
  subjectName: string;
  groupName: string;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  replacementId?: string;
  confirmedBy?: string;
}
export interface Notice extends Entity {
  userId: string;
  kind: 'APPLICATION' | 'SCHEDULE' | 'ABSENCE';
  resourceId: string;
  title: string;
  read: boolean;
}
export interface Preference extends Entity {
  notifications: boolean;
}
