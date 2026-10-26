import styles from './Avatar.module.css';

/** Avatar padrão do protótipo (decorativo). */
export function Avatar({
  size = 48,
  src,
  name = '',
}: {
  size?: number;
  src?: string;
  name?: string;
}) {
  return (
    <img
      className={styles.avatar}
      src={src && /^data:image\/(jpeg|png|webp);base64,/.test(src) ? src : '/images/avatar.png'}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
    />
  );
}
