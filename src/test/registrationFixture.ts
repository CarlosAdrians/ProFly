import type { RegistrationData } from '../features/registration/model';
export const TEST_PASSWORD = 'Docente2026';
export function registrationFixture(): RegistrationData {
  return {
    name: 'Professor de Teste',
    email: 'professor@profly.test',
    phone: '83900000000',
    education: [
      {
        id: crypto.randomUUID(),
        degree: 'Mestrado',
        field: 'Direito',
        institution: 'Instituição de Teste',
        year: '2020',
      },
    ],
    knowledge: [{ id: crypto.randomUUID(), name: 'Direito Civil', level: 4 }],
    teaching: { status: 'NONE', organization: '', activity: '', units: '' },
    professional: { status: 'NONE', organization: '', activity: '', units: '' },
    availability: [{ id: crypto.randomUUID(), weekday: 0, start: '18:30', end: '21:10' }],
    weeklyHours: '20',
    requests: [
      { courseId: 'direito', subjects: ['Direito Civil I'], status: 'PENDING' },
      { courseId: 'sistemas', subjects: ['Banco de Dados'], status: 'PENDING' },
    ],
  };
}
