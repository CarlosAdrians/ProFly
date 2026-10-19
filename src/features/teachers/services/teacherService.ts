import { createLocalCollection } from '../../../services/localCollection';
import { teachersSeed } from '../../../mocks/teachers';
import type { Teacher } from '../types';

export const TEACHERS_STORAGE_KEY = 'profly:teachers';

/** Professores persistidos no navegador. Substituir por chamadas à API no futuro. */
export const teacherService = createLocalCollection<Teacher>(TEACHERS_STORAGE_KEY, () =>
  teachersSeed.map((teacher) => ({ ...teacher })),
);
