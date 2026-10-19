import type { ReactNode } from 'react';
import styles from './Alert.module.css';

interface AlertProps {
  variant: 'error' | 'success';
  children: ReactNode;
}

/**
 * Mensagem de retorno. Erros usam role="alert"; mensagens de sucesso devem ficar
 * dentro de uma região role="status" já presente na página para serem anunciadas.
 */
export function Alert({ variant, children }: AlertProps) {
  return (
    <div
      className={`${styles.alert} ${styles[variant]}`}
      role={variant === 'error' ? 'alert' : undefined}
    >
      {children}
    </div>
  );
}
