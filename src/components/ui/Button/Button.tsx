import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger';
  /** Mostra estado de carregamento e bloqueia novos cliques. */
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = 'primary',
  loading = false,
  loadingText,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
