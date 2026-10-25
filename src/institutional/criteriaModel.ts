import type { Criteria } from './types';
export function proposedCriteria(): Criteria {
  return {
    status: 'DRAFT',
    mandatoryKnowledge: [],
    desiredKnowledge: [],
    minimumEducation: null,
    relevantCompetencyIds: [],
    minimumTeachingSemesters: 0,
    minimumProfessionalMonths: 0,
    score: {
      knowledgeWeight: 60,
      teachingWeight: 25,
      professionalWeight: 15,
      teachingCapSemesters: 4,
      professionalCapMonths: 24,
      confirmedMinutesPerTeachingSemester: null,
    },
  };
}
