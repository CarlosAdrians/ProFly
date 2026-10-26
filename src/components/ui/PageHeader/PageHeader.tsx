import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  /** id do título, para associar à seção da página (aria-labelledby). */
  titleId: string;
  /** Ações alinhadas à direita (ex.: "+ Novo", "Sair da conta"). */
  actions?: ReactNode;
}

/** Cabeçalho das páginas internas: título à esquerda e ações à direita (padrão Canvas). */
export function PageHeader({ title, titleId, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 id={titleId} className={styles.title}>
        {title}
      </h1>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
