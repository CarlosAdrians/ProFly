import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../components/ui/Icon/Icon';
import { Button } from '../components/ui/Button/Button';
import { useApi } from './hooks';
import { useAction } from './actions';
import { api } from './api';
import type { Items, Notice } from './types';
import { ActionFeedback, LoadingError } from './ui';
import s from './Portal.module.css';

export function NotificationsBell() {
  const notices = useApi<Items<Notice>>('/me/notifications');
  const prefs = useApi<{ version: number; notifications: boolean }>('/me/preferences');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const action = useAction();
  const refreshNotices = notices.refresh;
  const unread = notices.data?.items.filter((n) => !n.read).length ?? 0;
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    heading.current?.focus();
    const outside = (e: PointerEvent | FocusEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
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

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') refreshNotices();
    };
    const interval = window.setInterval(refresh, 45000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshNotices]);

  return (
    <div ref={root} className={s.notificationAnchor}>
      <button
        ref={trigger}
        type="button"
        className={s.bellButton}
        aria-label={`Notificações, ${unread} não lidas`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? id : undefined}
        onClick={() => {
          if (!open) {
            notices.refresh();
            prefs.refresh();
          }
          setOpen((v) => !v);
        }}
      >
        <Icon name="bell" size={23} />
        {unread > 0 && (
          <span className={s.notificationCount} aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id={id}
          role="dialog"
          aria-labelledby={`${id}-heading`}
          className={s.notificationPanel}
        >
          <header className={s.notificationHeader}>
            <div>
              <h2 id={`${id}-heading`} ref={heading} tabIndex={-1}>
                Notificações
              </h2>
              <p>
                {unread
                  ? `${unread} ${unread === 1 ? 'aviso não lido' : 'avisos não lidos'}`
                  : 'Tudo em dia'}
              </p>
            </div>
            <button
              type="button"
              className={s.iconButton}
              aria-label="Fechar notificações"
              onClick={close}
            >
              <Icon name="close" size={21} />
            </button>
          </header>
          <div className={s.notificationList}>
            <LoadingError {...notices} retry={notices.refresh} />
            <ActionFeedback action={action} />
            {notices.data?.items.length === 0 && (
              <div className={s.notificationEmpty}>
                <Icon name="bell" size={30} />
                <strong>Nenhuma notificação por aqui</strong>
                <p>Novidades sobre suas solicitações, aulas e atestados aparecem aqui.</p>
              </div>
            )}
            <ul>
              {notices.data?.items.map((n) => (
                <li key={n.id} className={s.notificationItem} data-unread={!n.read}>
                  <Icon
                    name={
                      n.kind === 'SCHEDULE'
                        ? 'calendar'
                        : n.kind === 'ABSENCE'
                          ? 'document'
                          : 'user'
                    }
                    size={21}
                  />
                  <div>
                    <p>{n.title}</p>
                    <time dateTime={n.createdAt}>
                      {new Date(n.createdAt).toLocaleString('pt-BR')}
                    </time>
                    {!n.read && (
                      <Button
                        variant="secondary"
                        loading={action.busy}
                        onClick={() =>
                          void action.run(async () => {
                            try {
                              await api(`/me/notifications/${n.id}/read`, {
                                method: 'POST',
                                body: { expectedVersion: n.version },
                              });
                            } finally {
                              notices.refresh();
                            }
                          })
                        }
                      >
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                  {!n.read && <span className={s.unreadDot} aria-label="Não lida" />}
                </li>
              ))}
            </ul>
          </div>
          <footer className={s.notificationFooter}>
            <LoadingError {...prefs} retry={prefs.refresh} />
            {prefs.data && (
              <div className={s.toggle}>
                <button
                  type="button"
                  role="switch"
                  aria-label="Receber notificações no sistema"
                  aria-checked={prefs.data.notifications}
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await api('/me/preferences', {
                        method: 'PUT',
                        body: {
                          expectedVersion: prefs.data!.version,
                          notifications: !prefs.data!.notifications,
                        },
                      });
                      prefs.refresh();
                    })
                  }
                >
                  <span />
                </button>
                <div>
                  <strong>Receber avisos no ProFly</strong>
                  <p>Essa opção controla somente os avisos no ProFly.</p>
                </div>
              </div>
            )}
          </footer>
        </section>
      )}
    </div>
  );
}
