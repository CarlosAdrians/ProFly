import styles from './Avatar.module.css';

/** Avatar padrão do protótipo (decorativo). */
export function Avatar({ size = 60 }: { size?: number }) {
  return (
    <img
      className={styles.avatar}
      src="/images/avatar.png"
      alt=""
      width={size}
      height={size}
      loading="lazy"
    />
  );
}
