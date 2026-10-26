import { StatusPage } from '../app/StatusPage';
import { ProfileMenu } from './ProfileMenu';
import { Scope } from './scope';
import { useState, type CSSProperties } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router';
import { ThemeToggle } from '../components/ui/ThemeToggle/ThemeToggle';
import { Icon } from '../components/ui/Icon/Icon';
import { NotificationsBell } from './NotificationsBell';
import { useApi, useApiSession } from './hooks';
import type { CatalogItem, Items } from './types';
import { LoadingError, Select } from './ui';
import s from './Portal.module.css';

export function ApiGuard() {
  const auth = useApiSession();

  if (auth.loading) return <StatusPage state="loading" />;
  if (auth.error)
    return (
      <StatusPage
        state={auth.maintenance ? 'maintenance' : 'unavailable'}
        onRetry={() => void auth.refresh()}
      />
    );

  return auth.user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PortalLayout() {
  const { user } = useApiSession(),
    courses = useApi<Items<CatalogItem>>('/courses'),
    [selected, setSelected] = useState(''),
    [mode, setMode] = useState(''),
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
              <ProfileMenu
                role={admin ? 'Administrador' : management ? 'Coordenador' : 'Professor'}
              />

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
        </main>
      </div>
    </Scope.Provider>
  );
}
