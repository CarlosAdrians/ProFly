import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { paths } from '../../../app/paths';
import { useAuth } from '../session/useAuth';

/** Bloqueia as rotas internas sem sessão simulada. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to={paths.login} replace />;
  return children;
}
