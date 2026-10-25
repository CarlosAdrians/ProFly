import { Auth } from './authContext';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, setCsrf } from './api';
import type { Session, User } from './types';
export function ApiSessionProvider({ children }: { children: ReactNode }) {
  const generation = useRef(0);
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const accept = useCallback((session: Session) => {
    setCsrf(session.csrfToken);
    setUser(session.user);
    setLoading(false);
    setError('');
  }, []);
  const refresh = useCallback(async () => {
    try {
      accept(await api<Session>('/auth/session'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setCsrf('');
        setUser(null);
        setError('');
      } else setError(e instanceof Error ? e.message : 'Servidor indisponível.');
    } finally {
      setLoading(false);
    }
  }, [accept]);
  useEffect(() => {
    const controller = new AbortController(),
      epoch = generation.current;
    api<Session>('/auth/session', { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted && epoch === generation.current) {
          accept(value);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (controller.signal.aborted || epoch !== generation.current) return;
        if (e instanceof ApiError && e.status === 401) {
          setCsrf('');
          setUser(null);
        } else setError(e instanceof Error ? e.message : 'Servidor indisponível.');
        setLoading(false);
      });
    return () => controller.abort();
  }, [accept]);
  useEffect(() => {
    const expired = () => {
      generation.current++;
      setCsrf('');
      setUser(null);
      setLoading(false);
      setError('');
    };
    window.addEventListener('profly:session-expired', expired);
    return () => window.removeEventListener('profly:session-expired', expired);
  }, []);
  const login = async (email: string, password: string) => {
    generation.current++;
    accept(await api<Session>('/auth/login', { method: 'POST', body: { email, password } }));
  };
  const logout = async () => {
    generation.current++;
    await api('/auth/logout', { method: 'POST', body: {} });
    setCsrf('');
    setUser(null);
  };
  return (
    <Auth.Provider value={{ user, loading, error, refresh, login, logout }}>
      {children}
    </Auth.Provider>
  );
}
