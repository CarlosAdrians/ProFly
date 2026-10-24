import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  /**
   * `split`: foto do campus na resolução de origem e formulário de acesso.
   * `backdrop`: formulário de recuperação centralizado, sem foto.
   */
  variant: 'split' | 'backdrop';
  children: ReactNode;
}

/** Layout institucional de acesso e recuperação, com cores semânticas do tema. */
export function AuthLayout({ variant, children }: AuthLayoutProps) {
  return (
    <div className={`${styles.layout} ${styles[variant]}`}>
      {variant === 'split' && (
        <figure className={styles.photo}>
          <img
            src="/images/campus.jpg"
            alt="Entrada do campus da UNIFACISA"
            width="399"
            height="501"
            decoding="async"
            fetchPriority="high"
          />
          <figcaption>UNIFACISA · Centro Universitário</figcaption>
        </figure>
      )}
      <main className={styles.content}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <img
              className={styles.logo}
              src="/images/unifacisa-symbol.png"
              alt="UNIFACISA Centro Universitário"
            />
            <div>
              <strong>UNIFACISA</strong>
              <span>ProFly · Gestão docente</span>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
