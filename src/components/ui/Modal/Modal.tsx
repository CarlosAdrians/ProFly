import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Título lido por leitores de tela (o protótipo não exibe título visível). */
  title: string;
  children: ReactNode;
  size?: 'normal' | 'wide';
}

/**
 * Modal baseado no <dialog> nativo: prende o foco, fecha com Esc e
 * devolve o foco ao elemento que o abriu.
 */
export function Modal({ open, onClose, title, children, size = 'normal' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-size={size}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.content}>
          <h2 className="visually-hidden">{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <span aria-hidden="true">×</span>
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
