export interface Session {
  name: string;
  email: string;
  startedAt: string;
}

export interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
