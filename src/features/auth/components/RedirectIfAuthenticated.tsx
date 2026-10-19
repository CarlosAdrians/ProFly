import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { postLoginPath } from '../../../app/paths';
import { useAuth } from '../session/useAuth';

/**
 * Evita exibir o login para quem já tem sessão de coordenador. Outros perfis ainda
 * não têm telas próprias e permanecem no login (sem laço de redirecionamento).
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.role === 'coordinator') return <Navigate to={postLoginPath} replace />;
  return children;
}
