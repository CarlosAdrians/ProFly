import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { postLoginPath } from '../../../app/paths';
import { useAuth } from '../session/useAuth';

/** Evita exibir o login para quem já tem sessão simulada. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session) return <Navigate to={postLoginPath} replace />;
  return children;
}
