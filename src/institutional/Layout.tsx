import { useAction } from './actions';
import { Scope } from './scope';

import { useState } from 'react';

import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router';

import { ThemeToggle } from '../components/ui/ThemeToggle/ThemeToggle';

import { Icon } from '../components/ui/Icon/Icon';

import { Button } from '../components/ui/Button/Button';

import { api } from './api';

import { useApi, useApiSession } from './hooks';

import type { CatalogItem, Items, Notice } from './types';

import { ActionFeedback, LoadingError, Select } from './ui';

import s from './Portal.module.css';

export function ApiGuard() {
  const auth = useApiSession();

  if (auth.loading)
    return (
      <main className="environmentNotice" role="status">
        Conferindo sua sessão…
      </main>
    );

  if (auth.error)
    return (
      <main className="environmentNotice">
        <h1>Servidor indisponível</h1>

        <p role="alert">{auth.error}</p>

        <Button onClick={() => void auth.refresh()}>Tentar novamente</Button>
      </main>
    );

  return auth.user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PortalLayout() {
  const { user, logout } = useApiSession(),
    courses = useApi<Items<CatalogItem>>('/courses'),
    notices = useApi<Items<Notice>>('/me/notifications'),
    [selected, setSelected] = useState(''),
    [mode, setMode] = useState(''),
    action = useAction(),
    location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  const canManage = user.roles.some((r) => r === 'admin' || r === 'coordinator');

  const teacher = user.roles.includes('teacher') && (mode === 'teacher' || !canManage),
    management = canManage && !teacher,
    admin = user.roles.includes('admin');

  const availableCourses = (courses.data?.items ?? []).filter((c) =>
    teacher ? c.roles?.includes('teacher') : admin || c.roles?.includes('coordinator'),
  );

  const courseId = availableCourses.some((c) => c.id === selected)
    ? selected
    : (availableCourses[0]?.id ?? '');

  const links = [
    { to: '/inicio', label: 'Meu início', icon: 'graduation' as const },

    { to: '/conta', label: 'Conta', icon: 'user' as const },

    ...(management
      ? [
          { to: '/professores', label: 'Professores', icon: 'userPlus' as const },

          { to: '/disciplinas', label: 'Disciplinas', icon: 'book' as const },
        ]
      : []),

    { to: '/calendario', label: 'Calendário', icon: 'calendar' as const },

    ...(management ? [{ to: '/alocacoes', label: 'Alocações', icon: 'grip' as const }] : []),

    ...(teacher ? [{ to: '/horarios', label: 'Disponibilidade', icon: 'clock' as const }] : []),

    { to: '/historico', label: 'Histórico', icon: 'book' as const },

    { to: '/ausencias', label: 'Ausências', icon: 'shield' as const },

    ...(admin ? [{ to: '/administracao', label: 'Administração', icon: 'shield' as const }] : []),

    { to: '/configuracoes', label: 'Ajustes', icon: 'edit' as const },
  ];

  return (
    <Scope.Provider value={{ courseId, courses: availableCourses, asTeacher: teacher }}>
      <div className={s.shell}>
        <nav className={s.sidebar} aria-label="Menu principal">
          <img src="/images/unifacisa-symbol.png" alt="UNIFACISA" />

          <div className={s.navLinks}>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to}>
                <Icon name={link.icon} size={27} />

                {link.label}
              </NavLink>
            ))}
          </div>

          <div>
            <ThemeToggle sidebar />
          </div>
        </nav>

        <main className={s.content}>
          <title>
            {links.find((link) => link.to === location.pathname)?.label ?? 'ProFly'} | ProFly
          </title>
          <div className={s.topbar}>
            <span>
              <strong>ProFly</strong> / Espaço acadêmico
            </span>

            <div className={s.identity}>
              {user.photoVersion > 0 && (
                <img src={`/api/v1/me/photo?v=${user.photoVersion}`} alt="" />
              )}

              <div>
                <strong>{user.name}</strong>

                <br />

                {admin ? 'Administrador' : management ? 'Coordenador' : 'Professor'}
              </div>

              <Link
                to="/notificacoes"

                aria-label={`Notificações, ${notices.data?.items.filter((n) => !n.read).length ?? 0} não lidas`}
              >
                <Icon name="bell" />

                {notices.data?.items.filter((n) => !n.read).length ?? ''}
              </Link>
            </div>
          </div>

          {canManage && user.roles.includes('teacher') && (
            <Select
              label="Área de trabalho"
              value={teacher ? 'teacher' : 'management'}
              items={[
                { id: 'management', name: 'Coordenação e administração' },
                { id: 'teacher', name: 'Minha rotina docente' },
              ]}
              onChange={setMode}
            />
          )}

          {management && location.pathname !== '/administracao' && (
            <div style={{ maxWidth: 360, marginBottom: 24 }}>
              <Select
                label="Curso de trabalho"

                value={courseId}

                items={availableCourses}

                onChange={setSelected}
              />

              <LoadingError {...courses} retry={courses.refresh} />
            </div>
          )}

          <Outlet />

          <ActionFeedback action={action} />

          <div className={s.actions}>
            <Button
              variant="secondary"

              loading={action.busy}

              onClick={() => void action.run(logout)}
            >
              <Icon name="logout" />
              Sair da conta
            </Button>

            <Link to="/privacidade">Privacidade</Link>
          </div>
        </main>
      </div>
    </Scope.Provider>
  );
}

export function NotificationsPage() {
  const result = useApi<Items<Notice>>('/me/notifications'),
    action = useAction();

  return (
    <>
      <h1>Notificações</h1>

      <ActionFeedback action={action} />

      <LoadingError {...result} retry={result.refresh} />

      {result.data?.items.length === 0 && (
        <p className={s.empty}>Você não tem avisos recebidos. As preferências ficam em Ajustes.</p>
      )}

      {result.data?.items.map((n) => (
        <article className={s.row} key={n.id}>
          <div>
            <strong>{n.title}</strong>

            <p>{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
          </div>

          {!n.read && (
            <Button
              variant="secondary"

              loading={action.busy}

              onClick={() =>
                void action.run(async () => {
                  await api(`/me/notifications/${n.id}/read`, {
                    method: 'POST',

                    body: { expectedVersion: n.version },
                  });

                  result.refresh();
                })
              }
            >
              Marcar como lida
            </Button>
          )}
        </article>
      ))}
    </>
  );
}
