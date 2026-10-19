import { Outlet } from 'react-router';
import { Sidebar } from '../../components/navigation/Sidebar/Sidebar';
import { navItems } from '../../app/navigation';
import styles from './AppLayout.module.css';

/** Layout das telas internas: menu lateral + área de conteúdo. */
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <Sidebar items={navItems} />
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
