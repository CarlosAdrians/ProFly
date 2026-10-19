import type { EntityStatus } from '../../components/ui/StatusBadge/status';

/** Campos do cadastro de professor definidos no levantamento e no protótipo. */
export interface Teacher {
  id: string;
  name: string;
  email: string;
  /** Telefone de contato, apenas dígitos (com DDD). */
  phone: string;
  area: string;
  weeklyHours: number;
  status: EntityStatus;
}

export type TeacherInput = Omit<Teacher, 'id' | 'status'>;
