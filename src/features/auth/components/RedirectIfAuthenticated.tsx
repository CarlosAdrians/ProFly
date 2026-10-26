import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { paths, postLoginPath } from '../../../app/paths';
import { useAuth } from '../session/useAuth';

/**
 * Evita exibir o login para quem já tem sessão de coordenador. Outros perfis ainda
 * não têm telas próprias e permanecem no login (sem laço de redirecionamento).
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.role === 'coordinator') return <Navigate to={postLoginPath} replace />;
  if (session?.role === 'teacher') return <Navigate to={paths.teacherHome} replace />;
  return children;
}
