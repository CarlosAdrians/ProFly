import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Nome acessível do diálogo. O conteúdo fornece o título visível. */
  title: string;
  children: ReactNode;
  size?: 'normal' | 'wide';
  busy?: boolean;
}

/**
 * Modal baseado no <dialog> nativo: prende o foco, fecha com Esc e
 * devolve o foco ao elemento que o abriu.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'normal',
  busy = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-size={size}
      aria-label={title}
      aria-busy={busy || undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      {open && (
        <div className={styles.content}>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar"
            disabled={busy}
          >
            <span aria-hidden="true">×</span>
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
