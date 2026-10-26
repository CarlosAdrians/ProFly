import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { NavLink } from 'react-router';
import type { NavItem } from '../../../app/navigation';
import styles from './Sidebar.module.css';
import { ThemeToggle } from '../../ui/ThemeToggle/ThemeToggle';
import { paths } from '../../../app/paths';

interface SidebarProps {
  items: NavItem[];
}

function iconStyle(icon: string): CSSProperties {
  return { '--icon-url': `url('/images/icons/${icon}.png')` } as CSSProperties;
}

export function Sidebar({ items }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') setOpen(false);
  }

  return (
    <header className={styles.sidebar} data-menu-open={open} onKeyDown={handleKeyDown}>
      <div className={styles.brand}>
        <img
          className={styles.symbol}
          src="/images/unifacisa-symbol.png"
          alt="ProFly — UNIFACISA"
        />
        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.menuToggleBars} aria-hidden="true" />
          {open ? 'Fechar menu' : 'Menu'}
        </button>
      </div>

      <nav id={menuId} className={styles.nav} data-open={open} aria-label="Navegação principal">
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.label}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  isActive ? `${styles.item} ${styles.itemActive}` : styles.item
                }
                onClick={() => setOpen(false)}
              >
                <span className={styles.icon} style={iconStyle(item.icon)} aria-hidden="true" />
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.utilities}>
        <nav aria-label="Preferências">
          <NavLink
            to={paths.settings}
            className={({ isActive }) =>
              isActive ? `${styles.item} ${styles.itemActive}` : styles.item
            }
            onClick={() => setOpen(false)}
          >
            <svg
              className={styles.settingsIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m9 3-.5 2-1.8 1-2-.5-2 3.4 1.5 1.5v2.2l-1.5 1.5 2 3.4 2-.5 1.8 1 .5 2h4l.5-2 1.8-1 2 .5 2-3.4-1.5-1.5v-2.2l1.5-1.5-2-3.4-2 .5-1.8-1L13 3Z" />
              <circle cx="11" cy="11.5" r="3" />
            </svg>
            <span className={styles.label}>Ajustes</span>
          </NavLink>
        </nav>
        <ThemeToggle sidebar />
      </div>
    </header>
  );
}
