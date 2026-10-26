/** Perfis de acesso. Coordenador e professor possuem telas e destinos distintos. */
export type UserRole = 'coordinator' | 'teacher';

export interface Session {
  name: string;
  email: string;
  role: UserRole;
  startedAt: string;
}

export interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
  /** Atualiza dados exibíveis da sessão atual (ex.: nome alterado na tela Conta). */
  updateSession: (changes: Pick<Session, 'name'> & Partial<Pick<Session, 'email'>>) => void;
}
