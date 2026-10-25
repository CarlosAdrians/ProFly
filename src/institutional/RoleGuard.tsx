import type { ReactNode } from 'react';
import { useApiSession } from './hooks';
export function ForRole({
  roles,
  children,
}: {
  roles: ('teacher' | 'coordinator' | 'admin')[];
  children: ReactNode;
}) {
  const { user } = useApiSession();
  return user?.roles.some((role) => roles.includes(role)) ? (
    <>{children}</>
  ) : (
    <section>
      <h1>Área não disponível para este perfil</h1>
      <p>Use as opções do menu para acessar sua rotina.</p>
    </section>
  );
}
