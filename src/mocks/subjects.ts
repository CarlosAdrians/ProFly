import type { Subject } from '../features/subjects/types';

/** Disciplinas fictícias do curso de Direito, com códigos ilustrativos. */
export const subjectsSeed: Subject[] = [
  { id: 's01', name: 'Introdução ao Estudo do Direito', code: 'DIR101', status: 'active' },
  { id: 's02', name: 'Teoria Geral do Estado', code: 'DIR102', status: 'active' },
  { id: 's03', name: 'Filosofia do Direito', code: 'DIR103', status: 'inactive' },
  { id: 's04', name: 'Direito Civil I', code: 'DIR201', status: 'active' },
  { id: 's05', name: 'Direito Penal I', code: 'DIR202', status: 'active' },
  { id: 's06', name: 'Direito Constitucional I', code: 'DIR203', status: 'active' },
  { id: 's07', name: 'Direito Processual Civil I', code: 'DIR301', status: 'active' },
  { id: 's08', name: 'Direito do Trabalho I', code: 'DIR302', status: 'active' },
  { id: 's09', name: 'Direito Empresarial', code: 'DIR303', status: 'active' },
  { id: 's10', name: 'Direito Tributário', code: 'DIR401', status: 'active' },
  { id: 's11', name: 'Direito Administrativo', code: 'DIR402', status: 'active' },
  { id: 's12', name: 'Ética Profissional', code: 'DIR501', status: 'inactive' },
];
