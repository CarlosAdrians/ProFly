import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/ui/Icon/Icon';
import { useApiSession } from './hooks';
import { useAction } from './actions';
import { ActionFeedback } from './ui';
import s from './Portal.module.css';

export function ProfileMenu({ role }: { role: string }) {
  const { user, logout } = useApiSession();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  const id = useId();
  const action = useAction();
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const outside = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  if (!user) return null;
  return (
    <div className={s.profileAnchor} ref={root}>
      <button
        type="button"
        ref={trigger}
        className={s.profileTrigger}
        aria-label="Abrir menu da conta"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {user.photoVersion > 0 ? (
          <img src={`/api/v1/me/photo?v=${user.photoVersion}`} alt="" />
        ) : (
          <span className={s.profileAvatar}>
            <Icon name="user" size={23} />
          </span>
        )}
        <span className={s.profileName}>
          <strong>{user.name}</strong>
          <small>{role}</small>
        </span>
        <span className={s.profileChevron} aria-hidden="true" />
      </button>
      {open && (
        <section id={id} className={s.profilePanel} role="dialog" aria-label="Menu da conta">
          <p className={s.profileEmail}>{user.email}</p>
          <Link ref={first} to="/conta" onClick={() => setOpen(false)}>
            <Icon name="user" size={18} />
            Minha conta
          </Link>
          <Link to="/conta/privacidade" onClick={() => setOpen(false)}>
            <Icon name="shield" size={18} />
            Meus dados e privacidade
          </Link>
          <button
            type="button"
            className={s.profileLogout}
            disabled={action.busy}
            onClick={() => void action.run(logout)}
          >
            <Icon name="logout" size={18} />
            {action.busy ? 'Encerrando sessão…' : 'Sair da conta'}
          </button>
          <ActionFeedback action={action} />
        </section>
      )}
    </div>
  );
}
