import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  /**
   * `split`: composição original, com foto à esquerda e cartão sobre fundo azul.
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
        <picture className={styles.photo}>
          <source type="image/webp" srcSet="/images/campus-hd.webp" />
          <img
            src="/images/campus-hd.jpg"
            alt="Entrada do campus da UNIFACISA"
            width="1119"
            height="1405"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
      )}
      <main className={styles.content}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <img
              className={styles.logo}
              src={
                variant === 'split' ? '/images/unifacisa-logo.png' : '/images/unifacisa-symbol.png'
              }
              alt="UNIFACISA Centro Universitário"
            />
            {variant === 'backdrop' && (
              <div>
                <strong>UNIFACISA</strong>
                <span>ProFly · Gestão docente</span>
              </div>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
