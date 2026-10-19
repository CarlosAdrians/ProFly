import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { readJson, removeItem, writeJson } from '../../../services/storage';
import { authenticate } from '../services/authService';
import { AuthContext, SESSION_KEY } from './authContext';
import type { Session } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() =>
    readJson<Session>(sessionStorage, SESSION_KEY),
  );

  const login = useCallback(async (email: string, password: string) => {
    const next = await authenticate(email, password);
    writeJson(sessionStorage, SESSION_KEY, next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    removeItem(sessionStorage, SESSION_KEY);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
