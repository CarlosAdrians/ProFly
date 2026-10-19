import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { NavLink } from 'react-router';
import type { NavItem } from '../../../app/navigation';
import styles from './Sidebar.module.css';

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
    <header className={styles.sidebar} onKeyDown={handleKeyDown}>
      <div className={styles.brand}>
        <img
          className={styles.symbol}
          src="/images/navbar-symbol.png"
          alt="ProFly — Direito UNIFACISA"
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
              {item.path ? (
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
              ) : (
                <span
                  className={`${styles.item} ${styles.itemDisabled}`}
                  aria-disabled="true"
                  title="Disponível em uma etapa futura"
                >
                  <span className={styles.icon} style={iconStyle(item.icon)} aria-hidden="true" />
                  <span className={styles.label}>{item.label}</span>
                  <span className="visually-hidden"> (indisponível nesta etapa)</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
