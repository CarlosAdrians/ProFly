import styles from './StagePlaceholder.module.css';

interface StagePlaceholderProps {
  title: string;
  stage: number;
}

/** Marcação provisória de telas cuja implementação está prevista em etapa posterior. */
export function StagePlaceholder({ title, stage }: StagePlaceholderProps) {
  return (
    <section className={styles.panel} aria-labelledby="stage-placeholder-title">
      <h1 id="stage-placeholder-title" className={styles.title}>
        {title}
      </h1>
      <p className={styles.text}>Tela em construção — prevista para a etapa {stage}.</p>
    </section>
  );
}
