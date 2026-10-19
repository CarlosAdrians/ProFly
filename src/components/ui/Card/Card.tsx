import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/** Superfície branca com borda clara e sombra discreta. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className].filter(Boolean).join(' ')} {...rest} />;
}
