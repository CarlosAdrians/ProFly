import { useCallback, useContext, useEffect, useState } from 'react';
import { Auth } from './authContext';
import { api } from './api';
export function useApiSession() {
  const value = useContext(Auth);
  if (!value) throw new Error('API session unavailable');
  return value;
}
export function useApi<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    path: string | null;
    data: T | null;
    error: Error | null;
    loading: boolean;
  }>({ path: null, data: null, error: null, loading: true });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ path, data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            path,
            data: null,
            error: error instanceof Error ? error : new Error('Falha de consulta.'),
            loading: false,
          });
      });
    return () => controller.abort();
  }, [path, attempt]);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : null,
    loading: !!path && (state.path !== path || state.loading),
    refresh,
  };
}
