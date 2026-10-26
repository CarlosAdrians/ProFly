import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Oculta o texto do cabeçalho (mantido para leitores de tela). */
  hideHeader?: boolean;
  align?: 'start' | 'center';
  /** Impede a quebra de linha do conteúdo (ex.: "20 Horas/Semanais"). */
  nowrap?: boolean;
}

interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
}

/**
 * Tabela no estilo do protótipo. Em telas pequenas, cada linha vira um cartão
 * com o nome da coluna ao lado do valor.
 */
function cellClass<T>(column: Column<T>): string | undefined {
  const classes = [column.align === 'center' && styles.center, column.nowrap && styles.nowrap];
  return classes.filter(Boolean).join(' ') || undefined;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyMessage,
}: DataTableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === 'center' ? styles.center : undefined}
              >
                {column.hideHeader ? (
                  <span className="visually-hidden">{column.header}</span>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={styles.empty} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    data-label={column.hideHeader ? undefined : column.header}
                    className={cellClass(column)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
