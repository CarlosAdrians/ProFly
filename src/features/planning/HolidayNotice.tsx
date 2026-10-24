import { Link } from 'react-router';
import { PB_SOURCE, type Holiday } from './holidays';
import styles from './HolidayNotice.module.css';
export function HolidayNotice({
  items,
  status,
  onRefresh,
}: {
  items: Holiday[];
  status: string;
  onRefresh: () => void;
}) {
  const unavailable = status.includes('indisponível');
  const loading = status.includes('Consultando');
  return (
    <section className={styles.notice} aria-label="Feriados e datas do período">
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.symbol} aria-hidden="true">
            ▦
          </span>
          <div>
            <h2>Feriados e datas</h2>
            <p>Datas de referência para organizar suas aulas.</p>
          </div>
        </div>
        <span className={styles.status} data-warning={unavailable} role="status">
          {unavailable
            ? 'Consulta incompleta'
            : loading
              ? 'Consultando datas'
              : 'Datas de referência'}
        </span>
      </div>
      {items.length ? (
        <div className={styles.dates}>
          {items.map((item) => (
            <a
              key={`${item.date}-${item.name}`}
              href={item.source}
              target="_blank"
              rel="noreferrer"
              className={styles.date}
            >
              <span className={styles.dateBadge}>
                <strong>{Number(item.date.slice(8))}</strong>
                <small>
                  {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(
                    new Date(`${item.date}T12:00:00`),
                  )}
                </small>
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.scope === 'Confirmar localmente'
                    ? 'Confirmar com a instituição'
                    : `Feriado · ${item.scope}`}
                </small>
              </span>
              <span className={styles.external} aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>
          {unavailable || loading
            ? 'As datas deste período ainda não puderam ser conferidas.'
            : 'Nenhuma data de referência carregada para este período.'}
        </p>
      )}
      <details className={styles.details}>
        <summary>Sobre essas datas</summary>
        <div>
          <p>{status}</p>
          <p>
            São referências para organizar a agenda. Feriados municipais e recessos da faculdade
            ainda precisam de revisão. Nenhuma aula é cancelada automaticamente.
          </p>
          <p>
            <a
              href="https://brasilapi.com.br/docs#tag/Feriados-Nacionais"
              target="_blank"
              rel="noreferrer"
            >
              BrasilAPI
            </a>{' '}
            e{' '}
            <a href={PB_SOURCE} target="_blank" rel="noreferrer">
              referência estadual da Paraíba
            </a>
            .
          </p>
          <button type="button" onClick={onRefresh}>
            Atualizar consulta
          </button>
          <Link to="/configuracoes">Preferências do calendário</Link>
        </div>
      </details>
    </section>
  );
}
