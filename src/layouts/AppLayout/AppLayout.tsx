import { Outlet } from 'react-router';
import { Sidebar } from '../../components/navigation/Sidebar/Sidebar';
import { navItems } from '../../app/navigation';
import styles from './AppLayout.module.css';
import { useAuth } from '../../features/auth/session/useAuth';
import { paths } from '../../app/paths';
import { ThemeToggle } from '../../components/ui/ThemeToggle/ThemeToggle';

/** Layout das telas internas: menu lateral + área de conteúdo. */
export function AppLayout() {
  const { session } = useAuth();
  const items =
    session?.role === 'teacher'
      ? [
          { label: 'Meu início', icon: 'dashboard', path: paths.teacherHome },
          navItems[0],
          { label: 'Calendário', icon: 'calendario', path: paths.calendar },
        ]
      : navItems;
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <Sidebar items={items} />
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        <div className={styles.topbar}>
          <span>
            ProFly <span> / Espaço acadêmico</span>
          </span>
          <ThemeToggle />
        </div>
        <Outlet />
        <footer className={styles.demoFooter}>
          Demonstração local · Dados de exemplo e alterações salvos neste navegador.
        </footer>
      </main>
    </div>
  );
}
