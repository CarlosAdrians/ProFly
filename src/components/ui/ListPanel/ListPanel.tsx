import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { PageHeader } from '../PageHeader/PageHeader';
import { SearchField } from '../SearchField/SearchField';
import styles from './ListPanel.module.css';

interface ListPanelProps {
  /** Título visível da página. */
  title: string;
  actionLabel: string;
  onAction: () => void;
  searchLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Mensagens de retorno anunciadas por leitores de tela. */
  status?: ReactNode;
  children: ReactNode;
}

/** Página de listagem: título com "+ Novo" ao lado, busca por nome e conteúdo. */
export function ListPanel({
  title,
  actionLabel,
  onAction,
  searchLabel,
  searchValue,
  onSearchChange,
  status,
  children,
}: ListPanelProps) {
  return (
    <section className={styles.page} aria-labelledby="list-panel-title">
      <PageHeader
        title={title}
        titleId="list-panel-title"
        actions={<Button onClick={onAction}>{actionLabel}</Button>}
      />
      <Card className={styles.panel}>
        <SearchField
          label={searchLabel}
          placeholder="Nome"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className={styles.search}
        />
        <div role="status" className={styles.status}>
          {status}
        </div>
        {children}
      </Card>
    </section>
  );
}
