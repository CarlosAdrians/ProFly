import { createLocalCollection } from '../../../services/localCollection';
import { subjectsSeed } from '../../../mocks/subjects';
import { nextSubjectCode } from '../codeGenerator';
import type { Subject, SubjectInput } from '../types';

export const SUBJECTS_STORAGE_KEY = 'profly:subjects';

const collection = createLocalCollection<Subject>(
  SUBJECTS_STORAGE_KEY,
  () => subjectsSeed.map((subject) => ({ ...subject })),
  {
    strict: true,
    validate: (value): value is Subject[] =>
      Array.isArray(value) &&
      value.every(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.code === 'string' &&
          ['active', 'inactive'].includes(item.status),
      ),
  },
);

/** Disciplinas persistidas no navegador. Substituir por chamadas à API no futuro. */
export const subjectService = {
  ...collection,

  /**
   * Cadastra uma disciplina ativa com código gerado no momento de salvar,
   * a partir de todas as disciplinas guardadas (ativas e inativas).
   */
  async createWithGeneratedCode(input: SubjectInput): Promise<Subject> {
    const existing = await collection.list();
    const code = nextSubjectCode(existing.map((subject) => subject.code));
    return collection.create({ ...input, code, status: 'active' });
  },
};
