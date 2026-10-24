import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { readJson, removeItem, writeJson } from '../../../services/storage';
import { authenticate } from '../services/authService';
import { AuthContext, SESSION_KEY } from './authContext';
import type { Session } from './types';

const ROLES: readonly string[] = ['coordinator', 'teacher'];

/** Sessão guardada só é aceita se estiver completa e com um perfil conhecido. */
function readStoredSession(): Session | null {
  const stored = readJson<Partial<Session>>(sessionStorage, SESSION_KEY);
  const valid =
    stored &&
    typeof stored.name === 'string' &&
    typeof stored.email === 'string' &&
    typeof stored.startedAt === 'string' &&
    typeof stored.role === 'string' &&
    ROLES.includes(stored.role);
  return valid ? (stored as Session) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authenticate(email, password);
    writeJson(sessionStorage, SESSION_KEY, next);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    removeItem(sessionStorage, SESSION_KEY);
    setSession(null);
  }, []);

  const updateSession = useCallback(
    (changes: Pick<Session, 'name'> & Partial<Pick<Session, 'email'>>) => {
      if (!session) return;
      const next = { ...session, ...changes };
      writeJson(sessionStorage, SESSION_KEY, next);
      setSession(next);
    },
    [session],
  );

  const value = useMemo(
    () => ({ session, login, logout, updateSession }),
    [session, login, logout, updateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
