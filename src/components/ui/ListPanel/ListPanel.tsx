import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { SearchField } from '../SearchField/SearchField';
import styles from './ListPanel.module.css';

interface ListPanelProps {
  /** Título da página (oculto visualmente, como no protótipo). */
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

/** Painel das telas de listagem: botão "+ Novo", busca por nome e conteúdo. */
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
    <section className={styles.panel} aria-labelledby="list-panel-title">
      <h1 id="list-panel-title" className="visually-hidden">
        {title}
      </h1>
      <Button variant="success" className={styles.action} onClick={onAction}>
        {actionLabel}
      </Button>
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
    </section>
  );
}
