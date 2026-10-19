import { createLocalCollection } from '../../../services/localCollection';
import { subjectsSeed } from '../../../mocks/subjects';
import type { Subject } from '../types';

export const SUBJECTS_STORAGE_KEY = 'profly:subjects';

/** Disciplinas persistidas no navegador. Substituir por chamadas à API no futuro. */
export const subjectService = createLocalCollection<Subject>(SUBJECTS_STORAGE_KEY, () =>
  subjectsSeed.map((subject) => ({ ...subject })),
);
