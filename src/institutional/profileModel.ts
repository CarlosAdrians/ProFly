import type { ProfileData } from './types';
export const educationLevels = [
  { id: 'BACHELOR', name: 'Graduação' },
  { id: 'SPECIALIZATION', name: 'Especialização' },
  { id: 'MASTER', name: 'Mestrado' },
  { id: 'DOCTORATE', name: 'Doutorado' },
  { id: 'POSTDOCTORATE', name: 'Pós-doutorado' },
];
export function emptyProfile(): ProfileData {
  return {
    contact: { phone: '' },
    education: [],
    knowledge: [],
    teaching: { status: 'UNKNOWN', entries: [] },
    professional: { status: 'UNKNOWN', entries: [] },
    availability: { status: 'UNKNOWN', timeZone: 'America/Fortaleza', windows: [] },
  };
}
