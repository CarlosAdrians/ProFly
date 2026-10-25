import { useAction } from './actions';
import { Scope } from './scope';
import { useState, type CSSProperties } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router';
import { ThemeToggle } from '../components/ui/ThemeToggle/ThemeToggle';
import { Icon } from '../components/ui/Icon/Icon';
import { Button } from '../components/ui/Button/Button';
import { NotificationsBell } from './NotificationsBell';
import { useApi, useApiSession } from './hooks';
import type { CatalogItem, Items } from './types';
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
    { to: '/inicio', label: 'Meu início', icon: 'dashboard' as const },

    { to: '/conta', label: 'Conta', icon: 'conta' as const },

    ...(management
      ? [
          { to: '/professores', label: 'Professores', icon: 'professores' as const },

          { to: '/disciplinas', label: 'Disciplinas', icon: 'disciplinas' as const },
        ]
      : []),

    { to: '/calendario', label: 'Calendário', icon: 'calendario' as const },

    ...(management ? [{ to: '/alocacoes', label: 'Alocações', icon: 'alocacoes' as const }] : []),

    ...(teacher ? [{ to: '/horarios', label: 'Disponibilidade', icon: 'alocacoes' as const }] : []),

    { to: '/historico', label: 'Histórico', icon: 'historico' as const },

    { to: '/ausencias', label: 'Atestados', icon: 'document' as const },

    ...(admin ? [{ to: '/administracao', label: 'Administração', icon: 'shield' as const }] : []),
  ];

  return (
    <Scope.Provider value={{ courseId, courses: availableCourses, asTeacher: teacher }}>
      <div className={s.shell}>
        <nav className={s.sidebar} aria-label="Menu principal">
          <img src="/images/unifacisa-symbol.png" alt="UNIFACISA" />

          <div className={s.navLinks}>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.icon === 'document' || link.icon === 'shield' || link.icon === 'historico' ? (
                  <Icon name={link.icon === 'historico' ? 'clock' : link.icon} size={32} />
                ) : (
                  <span
                    className={s.legacyIcon}
                    style={
                      { '--icon-url': `url('/images/icons/${link.icon}.png')` } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                )}

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

              <NotificationsBell />
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

          {management &&
            !location.pathname.startsWith('/administracao') &&
            location.pathname !== '/conta/privacidade' && (
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
          </div>
        </main>
      </div>
    </Scope.Provider>
  );
}
