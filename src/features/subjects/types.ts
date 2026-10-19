import type { EntityStatus } from '../../components/ui/StatusBadge/status';

/** Cadastro de disciplina: nome e código (levantamento de requisitos). */
export interface Subject {
  id: string;
  name: string;
  /** Gerado pelo sistema ao cadastrar (ex.: DIR502); nunca é alterado depois. */
  code: string;
  status: EntityStatus;
}

/** Dados informados pelo usuário: apenas o nome. */
export type SubjectInput = Pick<Subject, 'name'>;
