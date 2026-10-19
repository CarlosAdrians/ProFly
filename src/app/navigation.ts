import { paths, type AppPath } from './paths';

export interface NavItem {
  label: string;
  /** Nome do arquivo em public/images/icons (sem extensão). */
  icon: string;
  /** Itens sem rota fazem parte do protótipo, mas estão fora do escopo atual. */
  path?: AppPath;
}

/** Itens do menu lateral, na ordem do protótipo. */
export const navItems: NavItem[] = [
  { label: 'Conta', icon: 'conta', path: paths.account },
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Professores', icon: 'professores', path: paths.teachers },
  { label: 'Disciplinas', icon: 'disciplinas', path: paths.subjects },
  { label: 'Calendário', icon: 'calendario' },
  { label: 'Alocações', icon: 'alocacoes' },
];
