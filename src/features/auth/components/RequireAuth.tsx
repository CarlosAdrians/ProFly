import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { paths } from '../../../app/paths';
import { useAuth } from '../session/useAuth';
import type { UserRole } from '../session/types';

interface RequireAuthProps {
  /** Perfis com acesso; as telas internas atuais são exclusivas da coordenação. */
  allowedRoles?: UserRole[];
  children: ReactNode;
}

/** Bloqueia as rotas internas sem sessão ou com perfil sem permissão. */
export function RequireAuth({ allowedRoles = ['coordinator'], children }: RequireAuthProps) {
  const { session } = useAuth();
  if (!session || !allowedRoles.includes(session.role)) {
    return <Navigate to={paths.login} replace />;
  }
  return children;
}
