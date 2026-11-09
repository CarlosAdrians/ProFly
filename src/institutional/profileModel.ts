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
/**
 * Same rule as the server's missingFields: requesting entry in a course needs a complete
 * profile. Checked in the step where the data is filled, not only at the end.
 */
export function missingForRequests(data: ProfileData): string[] {
  const missing: string[] = [];
  if (!data.education?.length) missing.push('pelo menos uma formação concluída');
  if (!data.knowledge?.length) missing.push('pelo menos um conhecimento');
  if (!data.teaching || data.teaching.status === 'UNKNOWN')
    missing.push('se possui experiência docente');
  if (!data.professional || data.professional.status === 'UNKNOWN')
    missing.push('se possui experiência profissional');
  if (!data.availability || data.availability.status === 'UNKNOWN')
    missing.push('sua disponibilidade');
  return missing;
}

/** Problems the server would refuse later, reported in the academic step. */
export function academicProblems(data: ProfileData): string[] {
  const problems: string[] = [];
  for (const key of ['teaching', 'professional'] as const) {
    const section = data[key];
    if (section?.status === 'PROVIDED' && !section.entries.length)
      problems.push(
        `Adicione ao menos uma ${key === 'teaching' ? 'experiência docente' : 'experiência profissional'} ou mude a resposta.`,
      );
    if (section?.entries.some((entry) => !entry.competencyIds.length))
      problems.push(
        `Marque ao menos um conhecimento relacionado em cada ${key === 'teaching' ? 'experiência docente' : 'experiência profissional'}.`,
      );
    if (section?.entries.some((entry) => entry.endsOn && entry.endsOn < entry.startsOn))
      problems.push('A data de fim de uma experiência está antes da data de início.');
  }
  return problems;
}
