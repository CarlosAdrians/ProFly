import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Texto de apoio exibido abaixo do campo e associado a ele. */
  hint?: string;
  /** Elemento exibido dentro do campo, à direita (ex.: botão de mostrar senha). */
  endAdornment?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/** Campo com rótulo no estilo do protótipo: fundo cinza, faixa azul à esquerda. */
export function TextField({
  label,
  error,
  hint,
  endAdornment,
  id,
  className,
  ref,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-erro`;
  const hintId = `${inputId}-dica`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div
        className={styles.control}
        data-invalid={Boolean(error)}
        data-readonly={Boolean(rest.readOnly)}
      >
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...rest}
        />
        {endAdornment}
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
