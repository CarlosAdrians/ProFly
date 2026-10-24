export interface Education {
  id: string;
  degree: string;
  field: string;
  institution: string;
  year: string;
}
export interface Knowledge {
  id: string;
  name: string;
  level: number;
}
export interface Experience {
  status: 'UNKNOWN' | 'NONE' | 'PROVIDED';
  organization: string;
  activity: string;
  units: string;
}
export interface Availability {
  id: string;
  weekday: number;
  start: string;
  end: string;
}
export interface CourseRequest {
  courseId: string;
  subjects: string[];
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  reason?: string;
  reviewedAt?: string;
  reviewer?: string;
}
export interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  photo?: string;
  education: Education[];
  knowledge: Knowledge[];
  teaching: Experience;
  professional: Experience;
  requests: CourseRequest[];
  availability: Availability[];
  weeklyHours: string;
}
export interface TeacherProfile extends RegistrationData {
  id: string;
  createdAt: string;
  version: number;
  legalVersion: string;
  acceptedAt: string;
}
export const emptyExperience = (): Experience => ({
  status: 'UNKNOWN',
  organization: '',
  activity: '',
  units: '',
});
export function emptyRegistration(): RegistrationData {
  return {
    name: '',
    email: '',
    phone: '',
    education: [{ id: crypto.randomUUID(), degree: '', field: '', institution: '', year: '' }],
    knowledge: [],
    teaching: emptyExperience(),
    professional: emptyExperience(),
    requests: [],
    availability: [],
    weeklyHours: '',
  };
}
