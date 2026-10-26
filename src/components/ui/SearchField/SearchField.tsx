import { useId, type InputHTMLAttributes } from 'react';
import styles from './SearchField.module.css';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Rótulo para leitores de tela; o protótipo mostra apenas o placeholder. */
  label: string;
}

export function SearchField({ label, className, ...rest }: SearchFieldProps) {
  const id = useId();
  return (
    <div className={[styles.search, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15 15l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input id={id} type="search" className={styles.input} {...rest} />
    </div>
  );
}
