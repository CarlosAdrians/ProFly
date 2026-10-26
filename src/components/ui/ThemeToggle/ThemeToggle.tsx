import { useEffect, useState } from 'react';
import { applyTheme, preferredDark, THEME_KEY } from './theme';
import styles from './ThemeToggle.module.css';
import { Icon } from '../Icon/Icon';
export function ThemeToggle({ sidebar = false }: { sidebar?: boolean }) {
  const [dark, setDark] = useState(preferredDark);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    applyTheme(dark);
    const refresh = () => {
      const next = preferredDark();
      setDark(next);
      applyTheme(next);
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('profly:theme-changed', refresh);
    const media =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : undefined;
    media?.addEventListener('change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('profly:theme-changed', refresh);
      media?.removeEventListener('change', refresh);
    };
  }, [dark]);
  function toggle() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      setNotice('');
      window.dispatchEvent(new Event('profly:theme-changed'));
    } catch {
      setNotice('Tema alterado. Não foi possível guardar a preferência.');
    }
  }
  return (
    <div className={styles.wrap} data-sidebar={sidebar}>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Modo escuro"
        className={styles.button}
        onClick={toggle}
      >
        <span aria-hidden="true">{dark ? 'Escuro' : 'Claro'}</span>
        <span className={styles.track} aria-hidden="true">
          <Icon name="sun" size={14} />
          <Icon name="moon" size={14} />
          <span className={styles.thumb}>
            <Icon name={dark ? 'moon' : 'sun'} size={15} />
          </span>
        </span>
      </button>
      {notice && <small role="status">{notice}</small>}
    </div>
  );
}
