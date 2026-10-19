import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

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
      {variant === 'split' && <div className={styles.photo} aria-hidden="true" />}
      <main className={styles.content}>
        <div className={styles.card}>
          <img
            className={styles.logo}
            src="/images/unifacisa-logo.png"
            alt="UNIFACISA Centro Universitário"
          />
          {children}
        </div>
      </main>
    </div>
  );
}
