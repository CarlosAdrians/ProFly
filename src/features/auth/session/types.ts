/** Perfis de acesso. Somente o coordenador acessa as telas internas atuais. */
export type UserRole = 'coordinator' | 'teacher';

export interface Session {
  name: string;
  email: string;
  role: UserRole;
  startedAt: string;
}

export interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Atualiza dados exibíveis da sessão atual (ex.: nome alterado na tela Conta). */
  updateSession: (changes: Pick<Session, 'name'>) => void;
}
