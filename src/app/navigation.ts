import { paths, type AppPath } from './paths';

export interface NavItem {
  label: string;
  /** Nome do arquivo em public/images/icons (sem extensão). */
  icon: string;
  path: AppPath;
}

/** Menu da coordenacao. O layout seleciona as entradas proprias do professor. */
export const navItems: NavItem[] = [
  { label: 'Conta', icon: 'conta', path: paths.account },
  { label: 'Professores', icon: 'professores', path: paths.teachers },
  { label: 'Disciplinas', icon: 'disciplinas', path: paths.subjects },
  { label: 'Calendário', icon: 'calendario', path: paths.calendar },
  { label: 'Alocações', icon: 'alocacoes', path: paths.allocations },
];
