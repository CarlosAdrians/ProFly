import { statusLabels, type EntityStatus } from './status';
import styles from './StatusBadge.module.css';

export function StatusBadge({ status }: { status: EntityStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{statusLabels[status]}</span>;
}
