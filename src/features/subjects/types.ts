import type { EntityStatus } from '../../components/ui/StatusBadge/status';

/** Cadastro de disciplina: nome e código (levantamento de requisitos). */
export interface Subject {
  id: string;
  name: string;
  /** Código em maiúsculas, único entre todas as disciplinas. */
  code: string;
  status: EntityStatus;
}

export type SubjectInput = Omit<Subject, 'id' | 'status'>;
