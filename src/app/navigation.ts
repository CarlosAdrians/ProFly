import { paths, type AppPath } from './paths';

export interface NavItem {
  label: string;
  /** Nome do arquivo em public/images/icons (sem extensão). */
  icon: string;
  path: AppPath;
}

/**
 * Itens do menu lateral, na ordem do protótipo.
 * Dashboard, Calendário e Alocações estão fora do escopo atual e não aparecem.
 */
export const navItems: NavItem[] = [
  { label: 'Conta', icon: 'conta', path: paths.account },
  { label: 'Professores', icon: 'professores', path: paths.teachers },
  { label: 'Disciplinas', icon: 'disciplinas', path: paths.subjects },
];
