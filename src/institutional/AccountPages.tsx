import { AvailabilityBoard, TeacherNote, HistoryTimeline } from './TeacherAgenda';
import agenda from './TeacherAgenda.module.css';
import { RoomLabel } from './RoomLabel';
import { useAction } from './actions';
import { dayLabel, timeLabel, today } from './dates';
import { addDate } from './calendarModel';
import { CoordinatorOverview, UpcomingClasses } from './HomePages';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/Button/Button';
import { TextField } from '../components/ui/TextField/TextField';
import { PasswordField } from '../components/ui/PasswordField/PasswordField';
import { Icon } from '../components/ui/Icon/Icon';
import { ApiModal as Modal } from './ui';
import { AccountPhoto } from '../features/account/components/AccountPhoto';
import { api } from './api';
import { useApi, useApiSession } from './hooks';
import { useScope } from './scope';
import { ProfileFields } from './ProfileFields';
import { CourseRequestsFields, type RequestDraft } from './AuthPages';
import type {
  Application,
  CatalogItem,
  Items,
  Occurrence,
  Profile,
  ProfileData,
  User,
} from './types';
import { ActionFeedback, Badge, Heading, LoadingError, Panel, Select } from './ui';
import s from './Portal.module.css';
export function ProfileSummary({ data }: { data: ProfileData }) {
  const competencies = useApi<Items<CatalogItem>>('/catalog/competencies?limit=100');
  return (
    <div className={s.grid}>
      <section>
        <h3>Formação</h3>
        {data.education?.map((e) => (
          <p key={e.id}>
            <strong>{e.field}</strong>
            <br />
            {e.institution} · {e.completedYear}
          </p>
        ))}
        {!data.education?.length && <p className={s.muted}>Ainda não informada.</p>}
      </section>
      <section>
        <h3>Conhecimentos declarados</h3>
        {data.knowledge?.map((k) => (
          <p key={k.id}>
            {competencies.data?.items.find((c) => c.id === k.competencyId)?.name ?? 'Conhecimento'}{' '}
            <span className={s.badge}>Nível {k.level}</span>
          </p>
        ))}
      </section>
      {(['teaching', 'professional'] as const).map((key) => (
        <section key={key}>
          <h3>{key === 'teaching' ? 'Experiência docente' : 'Experiência profissional'}</h3>
          <p className={s.muted}>
            {data[key]?.status === 'NONE'
              ? 'Sem experiência declarada'
              : data[key]?.status === 'UNKNOWN' || !data[key]
                ? 'Ainda não informada'
                : 'Informações declaradas'}
          </p>
          {data[key]?.entries.map((e) => (
            <p key={e.id}>
              <strong>{e.activity}</strong>
              <br />
              {e.organization} · {e.completedUnits} {key === 'teaching' ? 'semestres' : 'meses'}
              <br />
              {dayLabel(e.startsOn)} a {e.endsOn ? dayLabel(e.endsOn) : 'atual'}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
function ProfileEdit({
  profile,
  onSaved,
  availability = false,
}: {
  profile: Profile;
  onSaved: () => void;
  availability?: boolean;
}) {
  const [data, setData] = useState(profile.data),
    action = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api('/me/profile', {
            method: 'PUT',
            body: { expectedVersion: profile.version, data },
          });
          onSaved();
        });
      }}
    >
      <p className={s.muted}>
        Alterações do perfil precisam de nova submissão e análise dos cursos. Publicações anteriores
        são preservadas.
      </p>
      <ProfileFields
        data={data}
        onChange={setData}
        section={availability ? 'availability' : 'all'}
      />
      <ActionFeedback action={action} />
      <div className={s.actions}>
        <Button type="submit" loading={action.busy}>
          <Icon name="save" />
          Salvar perfil
        </Button>
      </div>
    </form>
  );
}
export function ApiAccountPage() {
  const auth = useApiSession(),
    profile = useApi<Profile>(auth.user?.roles.includes('teacher') ? '/me/profile' : null),
    [editing, setEditing] = useState(false),
    [profileOpen, setProfileOpen] = useState(false),
    [emailOpen, setEmailOpen] = useState(false);
  if (!auth.user) return null;
  const user = auth.user;
  return (
    <>
      <Heading title="Conta" description="Sua identidade e seus dados acadêmicos." />
      <Panel>
        <div className={s.accountIdentity}>
          <AccountPhoto
            name={user.name}
            value={user.photoVersion ? `/api/v1/me/photo?v=${user.photoVersion}` : undefined}
            onChange={async (value) => {
              if (value) {
                const blob = await (await fetch(value)).blob();
                const form = new FormData();
                form.append('file', blob, 'perfil.jpg');
                await api('/me/photo', { method: 'POST', body: form });
              } else await api('/me/photo', { method: 'DELETE', body: {} });
              await auth.refresh();
            }}
          />
          <div>
            <h2>{user.name}</h2>
            <p className={s.muted}>{user.email}</p>
            <p className={s.muted}>
              {user.roles
                .map((r) =>
                  r === 'teacher' ? 'Professor' : r === 'admin' ? 'Administrador' : 'Coordenador',
                )
                .join(', ')}
            </p>
          </div>
        </div>
        <div className={s.row}>
          <span>Telefone</span>
          <strong>{user.phone ?? 'Não informado'}</strong>
        </div>
        <div className={s.actions}>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Icon name="edit" />
            Editar dados
          </Button>
          <Button variant="secondary" onClick={() => setEmailOpen(true)}>
            <Icon name="shield" />
            Alterar e-mail
          </Button>
        </div>
      </Panel>
      {user.roles.includes('teacher') && (
        <Panel title="Perfil acadêmico">
          <LoadingError {...profile} retry={profile.refresh} />
          {profile.data && (
            <>
              <ProfileSummary data={profile.data.data} />
              <div className={s.actions}>
                <Button variant="secondary" onClick={() => setProfileOpen(true)}>
                  <Icon name="edit" />
                  Editar perfil acadêmico
                </Button>
                <Link to="/horarios">Minha disponibilidade</Link>
              </div>
            </>
          )}
        </Panel>
      )}
      <AccountSecurity />
      <Panel title="Seus dados e privacidade">
        <p>
          Consulte uma cópia dos seus dados e acompanhe pedidos de acesso, correção e outros
          direitos.
        </p>
        <Link to="/conta/privacidade" className={s.privacyLink}>
          <Icon name="shield" />
          Gerenciar meus dados
        </Link>
      </Panel>
      <div className={s.legalLinks}>
        <Link to="/termos">Termos de uso</Link>
        <Link to="/privacidade">Política de privacidade</Link>
      </div>
      <Modal open={editing} title="Editar dados" onClose={() => setEditing(false)}>
        {editing && (
          <AccountForm
            user={user}
            onSaved={async () => {
              await auth.refresh();
              setEditing(false);
            }}
          />
        )}
      </Modal>
      <Modal open={emailOpen} title="Alterar e-mail" onClose={() => setEmailOpen(false)}>
        {emailOpen && <EmailForm user={user} />}
      </Modal>
      <Modal
        open={profileOpen}
        size="wide"
        title="Editar perfil acadêmico"
        onClose={() => setProfileOpen(false)}
      >
        {profileOpen && profile.data && (
          <ProfileEdit
            profile={profile.data}
            onSaved={() => {
              profile.refresh();
              setProfileOpen(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}
function AccountForm({ user, onSaved }: { user: User; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone ?? ''),
    action = useAction();
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api('/me/account', {
            method: 'PUT',
            body: { expectedVersion: user.version, name, phone },
          });
          await onSaved();
        });
      }}
    >
      <h2>Dados cadastrais</h2>
      <TextField
        label="Nome completo"
        required
        minLength={3}
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label="Telefone com DDD"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy}>
        <Icon name="save" />
        Salvar dados
      </Button>
    </form>
  );
}
function EmailForm({ user }: { user: User }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    action = useAction();
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api('/me/email-change', {
            method: 'POST',
            body: { expectedVersion: user.version, email, password },
          });
          setPassword('');
        }, 'Confirme o link no novo endereço. Seu e-mail atual permanece válido até a confirmação, que encerrará suas sessões.');
      }}
    >
      <h2>Alterar e-mail de acesso</h2>
      <p className={s.muted}>
        Confirme sua senha atual. A mudança só acontece após verificar o novo endereço.
      </p>
      <TextField
        label="Novo e-mail"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordField
        label="Senha atual"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy}>
        Enviar confirmação
      </Button>
    </form>
  );
}
export function ApiAvailabilityPage() {
  const profile = useApi<Profile>('/me/profile');
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Heading
        title="Minha disponibilidade"
        description="Seus horários pretendidos, separados da escala publicada."
      >
        <Button disabled={!profile.data} onClick={() => setEditing(true)}>
          <Icon name="edit" />
          Editar disponibilidade
        </Button>
      </Heading>
      <LoadingError {...profile} retry={profile.refresh} />
      {profile.data && (
        <>
          <TeacherNote scene="morning" title="Sua semana começa com os horários que você informa.">
            Defina os dias, as faixas de horário e a vigência. Você pode revisar sua disponibilidade
            sempre que precisar.
          </TeacherNote>
          <AvailabilityBoard data={profile.data.data} />
          <Modal
            open={editing}
            size="wide"
            title="Editar disponibilidade"
            onClose={() => setEditing(false)}
          >
            {editing && (
              <ProfileEdit
                key={profile.data.version}
                profile={profile.data}
                availability
                onSaved={() => {
                  setEditing(false);
                  profile.refresh();
                }}
              />
            )}
          </Modal>
        </>
      )}
    </>
  );
}
export function RequestsPanel() {
  const applications = useApi<Items<Application>>('/me/applications'),
    catalog = useApi<Items<CatalogItem>>('/catalog/courses'),
    profile = useApi<Profile>('/me/profile'),
    [requests, setRequests] = useState<RequestDraft[]>([]),
    [open, setOpen] = useState(false),
    action = useAction();
  return (
    <Panel title="Participação nos cursos">
      <LoadingError {...applications} retry={applications.refresh} />
      {applications.data?.items.length === 0 && (
        <p className={s.empty}>
          Nenhuma solicitação enviada. Complete seu perfil e selecione os cursos em que deseja
          atuar.
        </p>
      )}
      {applications.data?.items.map((a) => (
        <div className={s.row} key={a.id}>
          <div>
            <strong>{catalog.data?.items.find((c) => c.id === a.courseId)?.name ?? 'Curso'}</strong>
            {a.reason && <p>{a.reason}</p>}
            <p>Perfil enviado: versão {a.profileVersion}</p>
          </div>
          <Badge value={a.status} />
        </div>
      ))}
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Icon name="plus" />
        Solicitar entrada ou reenviar perfil
      </Button>
      <Modal
        open={open}
        title="Solicitações por curso"
        size="wide"
        busy={action.busy}
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              if (!profile.data) throw new Error('Aguarde a consulta do perfil.');
              if (!requests.length) throw new Error('Selecione um curso e uma disciplina.');
              for (const request of requests) {
                const previous = applications.data?.items.find(
                  (a) => a.courseId === request.courseId,
                );
                await api(`/me/applications/${request.courseId}`, {
                  method: 'POST',
                  body: {
                    expectedVersion: previous?.version ?? 0,
                    profileVersion: profile.data.version,
                    subjectIds: request.subjectIds,
                  },
                });
                applications.refresh();
              }
              setRequests([]);
              setOpen(false);
            });
          }}
        >
          <CourseRequestsFields requests={requests} onChange={setRequests} />
          <ActionFeedback action={action} />
          <Button type="submit" loading={action.busy}>
            Enviar para análise
          </Button>
        </form>
      </Modal>
    </Panel>
  );
}
function weekRange() {
  const day = new Date(`${today()}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const from = day.toISOString().slice(0, 10);
  day.setUTCDate(day.getUTCDate() + 6);
  return { from, until: day.toISOString().slice(0, 10) };
}
export function TeacherOverview() {
  const range = weekRange(),
    profile = useApi<Profile>('/me/profile'),
    schedule = useApi<Items<Occurrence>>(`/me/schedule?from=${range.from}&until=${range.until}`),
    history = useApi<Items<Occurrence>>('/me/history'),
    upcoming = useApi<Items<Occurrence>>(
      `/me/schedule?from=${today()}&until=${addDate(today(), 28)}`,
    );
  const minutes = schedule.data?.items
    .filter((o) => o.status === 'COMPLETED')
    .reduce((n, o) => n + o.minutes, 0);
  return (
    <>
      <Heading title="Meu início" description="Sua rotina docente, a partir da escala publicada." />
      <div className={s.homeLayout}>
        <Panel title="Próximas aulas">
          <div className={s.sectionCaption}>
            <span>Escala publicada · próximos 28 dias</span>
            <Link to="/calendario">Ver calendário</Link>
          </div>
          <LoadingError {...upcoming} retry={upcoming.refresh} />
          {upcoming.data &&
          !upcoming.data.items.some(
            (o) => o.status === 'PLANNED' && o.endsAt > new Date().toISOString(),
          ) ? (
            <div className={s.agendaEmpty}>
              <Icon name="calendar" size={32} />
              <h3>Sua agenda está livre por enquanto</h3>
              <p>Quando a coordenação publicar suas próximas aulas, elas aparecerão aqui.</p>
              <Link to="/horarios">Conferir disponibilidade</Link>
            </div>
          ) : (
            <UpcomingClasses
              items={(upcoming.data?.items ?? [])
                .filter((o) => o.status === 'PLANNED' && o.endsAt > new Date().toISOString())
                .slice(0, 5)}
            />
          )}
        </Panel>
        <Panel title="Minha semana">
          <p className={s.muted}>
            {dayLabel(range.from)} a {dayLabel(range.until)}
          </p>
          <LoadingError {...schedule} retry={schedule.refresh} />
          {schedule.data && (
            <div className={s.weekWorkload}>
              <div>
                <span>Programadas</span>
                <strong>
                  {(
                    schedule.data.items
                      .filter((o) => o.status === 'PLANNED' || o.status === 'COMPLETED')
                      .reduce((sum, o) => sum + o.minutes, 0) / 60
                  ).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                  h
                </strong>
              </div>
              <div>
                <span>Realizadas</span>
                <strong>
                  {((minutes ?? 0) / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h
                </strong>
              </div>
            </div>
          )}
          <LoadingError {...profile} retry={profile.refresh} />
          {minutes !== undefined && (
            <>
              {profile.data?.data.desiredWeeklyMinutes !== undefined ? (
                <>
                  <p>
                    Meta pretendida: {profile.data.data.desiredWeeklyMinutes / 60} h por semana.
                  </p>
                  {profile.data.data.desiredWeeklyMinutes > 0 && (
                    <progress
                      className={s.progress}
                      max={profile.data.data.desiredWeeklyMinutes}
                      value={Math.min(minutes, profile.data.data.desiredWeeklyMinutes)}
                      aria-label="Horas confirmadas em relação à dedicação pretendida"
                    />
                  )}
                </>
              ) : (
                <p className={s.muted}>A meta semanal é opcional e ainda não foi informada.</p>
              )}
            </>
          )}
          <Link to="/horarios">Revisar disponibilidade</Link>
        </Panel>
      </div>
      <div className={s.quickLinks}>
        <Link to="/conta">
          <Icon name="user" size={24} />
          <span>
            <strong>Meu perfil</strong>
            <small>Formação, conhecimentos e dados de acesso</small>
          </span>
          <Icon name="arrowRight" />
        </Link>
        <Link to="/ausencias">
          <Icon name="document" size={24} />
          <span>
            <strong>Enviar atestado</strong>
            <small>Comunique o afastamento à coordenação</small>
          </span>
          <Icon name="arrowRight" />
        </Link>
      </div>
      <Panel title="Últimas 10 aulas">
        <LoadingError {...history} retry={history.refresh} />
        <OccurrenceList items={history.data?.items ?? []} />
        <Link to="/historico">Ver histórico completo</Link>
      </Panel>
      <RequestsPanel />
    </>
  );
}
export function OccurrenceList({ items }: { items: Occurrence[] }) {
  return items.length === 0 ? (
    <p className={s.empty}>Nenhuma ocorrência encontrada neste período.</p>
  ) : (
    <>
      {items.map((o) => (
        <div className={s.row} key={o.id}>
          <div>
            <strong>{o.subjectName}</strong>
            <p>
              {o.courseName} · {o.groupName}
            </p>
            <p>
              <RoomLabel room={o.room} />
            </p>
            <p>
              {dayLabel(o.date)} · {timeLabel(o.startsAt)}–{timeLabel(o.endsAt)}
            </p>
          </div>
          <Badge value={o.displayStatus ?? o.status} />
        </div>
      ))}
    </>
  );
}
export function HistoryPage() {
  const { courseId } = useScope(),
    teacher = useScope().asTeacher,
    [cursor, setCursor] = useState(''),
    [course, setCourse] = useState(''),
    [rescheduling, setRescheduling] = useState<Occurrence | null>(null),
    [replacementId, setReplacement] = useState(''),
    catalog = useApi<Items<CatalogItem>>(teacher ? '/courses' : null);
  const result = useApi<Items<Occurrence> & { next: { before: string; cursorId: string } | null }>(
      teacher
        ? `/me/history?limit=20${cursor}${course ? `&courseId=${course}` : ''}`
        : courseId
          ? `/courses/${courseId}/occurrences`
          : null,
    ),
    action = useAction();
  return (
    <>
      <Heading
        title="Histórico de aulas"
        description="Aula planejada com data passada permanece a confirmar."
      />
      {teacher && (
        <TeacherNote scene="history" title="Cada aula tem seu registro.">
          Consulte os encontros anteriores e acompanhe o que foi realizado, cancelado ou ainda
          aguarda confirmação da coordenação.
        </TeacherNote>
      )}
      {teacher && (
        <div className={agenda.historyFilter}>
          <Select
            label="Filtrar por curso"
            empty="Todos os cursos"
            value={course}
            items={catalog.data?.items ?? []}
            onChange={(value) => {
              setCourse(value);
              setCursor('');
            }}
          />
        </div>
      )}
      <LoadingError {...result} retry={result.refresh} />
      <ActionFeedback action={action} />
      <Panel>
        {teacher ? (
          !result.loading &&
          !result.error && (
            <HistoryTimeline key={`${cursor}:${course}`} items={result.data?.items ?? []} />
          )
        ) : (
          <OccurrenceList items={result.data?.items ?? []} />
        )}
        {!teacher &&
          result.data?.items
            .filter((o) => o.status === 'PLANNED')
            .map((o) => (
              <div className={s.row} key={`action-${o.id}`}>
                <span>
                  {o.subjectName} · {dayLabel(o.date)}
                </span>
                <div className={s.actions}>
                  <Button
                    variant="secondary"
                    disabled={o.endsAt > new Date().toISOString() || action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await api(`/courses/${courseId}/occurrences/${o.id}/status`, {
                          method: 'POST',
                          body: { expectedVersion: o.version, status: 'COMPLETED' },
                        });
                        result.refresh();
                      })
                    }
                  >
                    Confirmar realizada
                  </Button>
                  <Button
                    variant="secondary"
                    loading={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await api(`/courses/${courseId}/occurrences/${o.id}/status`, {
                          method: 'POST',
                          body: { expectedVersion: o.version, status: 'CANCELLED' },
                        });
                        result.refresh();
                      })
                    }
                  >
                    Cancelar aula
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={action.busy}
                    onClick={() => {
                      setRescheduling(o);
                      setReplacement('');
                    }}
                  >
                    <Icon name="calendar" /> Vincular reposição
                  </Button>
                </div>
              </div>
            ))}
        {teacher && (
          <div className={s.actions}>
            <Button variant="secondary" disabled={!cursor} onClick={() => setCursor('')}>
              Mais recentes
            </Button>
            <Button
              variant="secondary"
              disabled={!result.data?.next}
              onClick={() => {
                const next = result.data?.next;
                if (next)
                  setCursor(`&before=${encodeURIComponent(next.before)}&cursorId=${next.cursorId}`);
              }}
            >
              Próximas aulas do histórico
            </Button>
          </div>
        )}
      </Panel>
      <Modal
        open={!!rescheduling}
        title="Vincular reposição"
        busy={action.busy}
        onClose={() => setRescheduling(null)}
      >
        <h2>Reposição da aula</h2>
        <p>
          Primeiro publique o novo encontro no calendário. Depois selecione uma aula posterior, da
          mesma turma, disciplina e professor.
        </p>
        <Select
          label="Encontro publicado para reposição"
          value={replacementId}
          required
          items={(result.data?.items ?? [])
            .filter(
              (o) =>
                rescheduling &&
                o.id !== rescheduling.id &&
                o.status === 'PLANNED' &&
                o.teacherId === rescheduling.teacherId &&
                o.subjectId === rescheduling.subjectId &&
                o.groupId === rescheduling.groupId &&
                o.startsAt > rescheduling.startsAt,
            )
            .map((o) => ({
              id: o.id,
              name: `${dayLabel(o.date)} · ${timeLabel(o.startsAt)}–${timeLabel(o.endsAt)} · ${o.groupName}`,
            }))}
          onChange={setReplacement}
        />
        <ActionFeedback action={action} />
        <Button
          loading={action.busy}
          disabled={!replacementId}
          onClick={() =>
            void action.run(async () => {
              await api(`/courses/${courseId}/occurrences/${rescheduling!.id}/status`, {
                method: 'POST',
                body: {
                  expectedVersion: rescheduling!.version,
                  status: 'RESCHEDULED',
                  replacementId,
                },
              });
              setRescheduling(null);
              result.refresh();
            }, 'Reposição vinculada. A aula original permanece no histórico.')
          }
        >
          Confirmar reposição
        </Button>
      </Modal>
    </>
  );
}
function AccountSecurity() {
  const action = useAction(),
    [password, setPassword] = useState(''),
    [newPassword, setNewPassword] = useState(''),
    auth = useApiSession();
  return (
    <>
      <Panel title="Alterar senha">
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api('/me/password', { method: 'POST', body: { password, newPassword } });
              setPassword('');
              setNewPassword('');
              await auth.refresh();
            });
          }}
        >
          <PasswordField
            label="Senha atual"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordField
            label="Nova senha"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className={s.muted}>Ao trocar a senha, todas as sessões serão encerradas.</p>
          <Button type="submit" loading={action.busy}>
            Salvar nova senha
          </Button>
        </form>
      </Panel>
    </>
  );
}
export function ApiHomePage() {
  return useScope().asTeacher ? <TeacherOverview /> : <CoordinatorOverview />;
}
