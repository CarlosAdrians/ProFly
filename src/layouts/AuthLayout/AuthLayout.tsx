import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';
import { ThemeToggle } from '../../components/ui/ThemeToggle/ThemeToggle';

interface AuthLayoutProps {
  /**
   * `split`: foto do campus à esquerda e cartão sobre fundo azul (Login).
   * `backdrop`: foto do campus esmaecida ao fundo com cartão centralizado (Esqueceu senha).
   */
  variant: 'split' | 'backdrop';
  children: ReactNode;
}

/** Layout das telas de acesso, com o cartão branco e o logo da UNIFACISA. */
export function AuthLayout({ variant, children }: AuthLayoutProps) {
  return (
    <div className={`${styles.layout} ${styles[variant]}`}>
      <div className={styles.theme}>
        <ThemeToggle />
      </div>
      {variant === 'split' && <div className={styles.photo} aria-hidden="true" />}
      <main className={styles.content}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <img
              className={styles.logo}
              src="/images/unifacisa-symbol.png"
              alt="UNIFACISA Centro Universitário"
            />
            <div>
              <strong>ProFly</strong>
              <span>UNIFACISA · Gestão docente</span>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
