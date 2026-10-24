import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { Sidebar } from '../../components/navigation/Sidebar/Sidebar';
import { navItems } from '../../app/navigation';
import styles from './AppLayout.module.css';
import { useAuth } from '../../features/auth/session/useAuth';
import { paths } from '../../app/paths';
import { ProfileAvatar } from '../../features/account/components/ProfileAvatar';

/** Layout das telas internas: menu lateral + área de conteúdo. */
export function AppLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  const items =
    session?.role === 'teacher'
      ? [
          { label: 'Meu início', icon: 'dashboard', path: paths.teacherHome },
          navItems[0],
          { label: 'Calendário', icon: 'calendario', path: paths.calendar },
          { label: 'Horários', icon: 'alocacoes', path: paths.availability },
        ]
      : navItems;
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <Sidebar items={items} />
      <main id="conteudo" ref={mainRef} className={styles.main} tabIndex={-1}>
        <div className={styles.topbar}>
          <span>
            ProFly <span> / Espaço acadêmico</span>
          </span>
          <Link
            className={styles.session}
            to={paths.account}
            aria-label={`Perfil de ${session?.name}`}
          >
            <ProfileAvatar email={session?.email ?? ''} size={32} />
            <span>
              {session?.name}
              <small>{session?.role === 'teacher' ? 'Professor' : 'Coordenação'}</small>
            </span>
          </Link>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
