import { useAction } from './actions';
import { useState } from 'react';
import { Button } from '../components/ui/Button/Button';
import { TextField } from '../components/ui/TextField/TextField';
import { ApiModal as Modal } from './ui';
import { Icon } from '../components/ui/Icon/Icon';
import { api } from './api';
import { useApi, useApiSession } from './hooks';
import type { CatalogItem, Items, Period, PeriodData, User } from './types';
import { ActionFeedback, Badge, Heading, LoadingError, Panel, Select } from './ui';
import s from './Portal.module.css';
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(
  (name, i) => ({ id: String(i + 1), name }),
);
export function ApiAdminPage() {
  const { user } = useApiSession(),
    [tab, setTab] = useState('courses');
  if (!user?.roles.includes('admin'))
    return <p role="alert">Esta área é exclusiva da administração.</p>;
  return (
    <>
      <Heading
        title="Administração"
        description="Estrutura institucional, responsabilidades e limites de carga."
      />
      <div className={s.actions}>
        {[
          ['courses', 'Cursos'],
          ['coordinators', 'Coordenadores'],
          ['competencies', 'Competências'],
          ['periods', 'Períodos e grade'],
          ['workload', 'Carga docente'],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? 'primary' : 'secondary'}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === 'courses' ? (
        <CourseAdmin />
      ) : tab === 'coordinators' ? (
        <CoordinatorAdmin />
      ) : tab === 'competencies' ? (
        <CompetencyAdmin />
      ) : tab === 'periods' ? (
        <PeriodAdmin />
      ) : (
        <WorkloadAdmin />
      )}
    </>
  );
}
function CourseAdmin() {
  const result = useApi<Items<CatalogItem>>('/admin/courses'),
    [code, setCode] = useState(''),
    [name, setName] = useState(''),
    action = useAction();
  return (
    <Panel title="Cursos">
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await api('/admin/courses', { method: 'POST', body: { code, name } });
            setCode('');
            setName('');
            result.refresh();
          }, 'Curso cadastrado.');
        }}
      >
        <div className={s.grid}>
          <TextField
            label="Nome do curso"
            required
            minLength={3}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Código"
            required
            minLength={2}
            maxLength={20}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <Button type="submit" loading={action.busy}>
          <Icon name="plus" />
          Cadastrar curso
        </Button>
      </form>
      <ActionFeedback action={action} />
      <LoadingError {...result} retry={result.refresh} />
      {result.data?.items.map((c) => (
        <div className={s.row} key={c.id}>
          <div>
            <strong>{c.name}</strong>
            <p>
              {c.code} · {c.active ? 'Ativo' : 'Inativo'}
            </p>
          </div>
          <Button
            variant="secondary"
            loading={action.busy}
            onClick={() =>
              void action.run(async () => {
                await api(`/admin/courses/${c.id}`, {
                  method: 'PATCH',
                  body: { expectedVersion: c.version, active: !c.active },
                });
                result.refresh();
              })
            }
          >
            {c.active ? 'Inativar' : 'Reativar'}
          </Button>
        </div>
      ))}
    </Panel>
  );
}
function CoordinatorAdmin() {
  const courses = useApi<Items<CatalogItem>>('/admin/courses'),
    users = useApi<Items<User>>('/admin/users?limit=100'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [invite, setInvite] = useState(''),
    [scope, setScope] = useState(''),
    action = useAction();
  const assignments = useApi<
    Items<{ id: string; userId: string; version: number; active: boolean }>
  >(scope ? `/courses/${scope}/coordinators` : null);
  return (
    <Panel title="Coordenadores">
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const result = await api<{ inviteToken: string | null }>('/admin/coordinators', {
              method: 'POST',
              body: { name, email, courseIds: selected },
            });
            setInvite(
              result.inviteToken
                ? `${window.location.origin}/ativar-acesso#token=${result.inviteToken}`
                : '',
            );
            users.refresh();
          }, 'Responsabilidades registradas. Uma conta nova precisa ativar o acesso pelo convite.');
        }}
      >
        <div className={s.grid}>
          <TextField
            label="Nome do coordenador"
            required
            minLength={3}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="E-mail do coordenador"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <fieldset className={s.subsection}>
          <legend>Cursos sob responsabilidade</legend>
          {courses.data?.items
            .filter((c) => c.active)
            .map((c) => (
              <label className={s.check} key={c.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, c.id] : selected.filter((id) => id !== c.id),
                    )
                  }
                />
                {c.name}
              </label>
            ))}
        </fieldset>
        <Button type="submit" loading={action.busy}>
          Atribuir coordenação
        </Button>
      </form>
      <ActionFeedback action={action} />
      {invite && (
        <div className={s.notice}>
          <p>Link privado de ativação. Compartilhe somente com o coordenador responsável.</p>
          <Button
            variant="secondary"
            onClick={() =>
              void action.run(async () => {
                await navigator.clipboard.writeText(invite);
              }, 'Link copiado.')
            }
          >
            Copiar convite
          </Button>
          <Button variant="secondary" onClick={() => setInvite('')}>
            Ocultar convite
          </Button>
        </div>
      )}
      <div className={s.subsection}>
        <Select
          label="Consultar responsabilidades de um curso"
          value={scope}
          items={courses.data?.items.filter((c) => c.active) ?? []}
          onChange={setScope}
        />
        <LoadingError {...assignments} retry={assignments.refresh} />
        {assignments.data?.items.map((m) => (
          <div className={s.row} key={m.id}>
            <div>
              <strong>
                {users.data?.items.find((u) => u.id === m.userId)?.name ?? 'Coordenador'}
              </strong>
              <p>{m.active ? 'Responsável ativo' : 'Responsabilidade revogada'}</p>
            </div>
            <Button
              variant="secondary"
              loading={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await api(`/admin/courses/${scope}/coordinators/${m.userId}`, {
                    method: 'PATCH',
                    body: { expectedVersion: m.version, active: !m.active },
                  });
                  assignments.refresh();
                })
              }
            >
              {m.active ? 'Revogar curso' : 'Reativar curso'}
            </Button>
          </div>
        ))}
      </div>
      <h3>Contas institucionais</h3>
      <LoadingError {...users} retry={users.refresh} />
      {users.data?.items.map((u) => (
        <div className={s.row} key={u.id}>
          <div>
            <strong>{u.name}</strong>
            <p>
              {u.email} · {u.state}
            </p>
          </div>
          {['ACTIVE', 'DISABLED'].includes(u.state) && (
            <Button
              variant="secondary"
              loading={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await api(`/admin/users/${u.id}/state`, {
                    method: 'PATCH',
                    body: {
                      expectedVersion: u.version,
                      state: u.state === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                    },
                  });
                  users.refresh();
                })
              }
            >
              {u.state === 'ACTIVE' ? 'Desativar conta' : 'Reativar conta'}
            </Button>
          )}
        </div>
      ))}
    </Panel>
  );
}
function CompetencyAdmin() {
  const result = useApi<Items<CatalogItem>>('/admin/competencies?limit=100'),
    [record, setRecord] = useState<CatalogItem | null | undefined>(),
    [name, setName] = useState(''),
    [code, setCode] = useState(''),
    [active, setActive] = useState(true),
    action = useAction();
  const edit = (item: CatalogItem | null) => {
    setRecord(item);
    setName(item?.name ?? '');
    setCode(item?.code ?? '');
    setActive(item?.active ?? true);
  };
  return (
    <Panel title="Competências">
      <Button onClick={() => edit(null)}>
        <Icon name="plus" />
        Nova competência
      </Button>
      <LoadingError {...result} retry={result.refresh} />
      {result.data?.items.map((c) => (
        <div className={s.row} key={c.id}>
          <div>
            <strong>{c.name}</strong>
            <p>
              {c.code} · {c.active ? 'Ativa' : 'Inativa'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => edit(c)}>
            Editar
          </Button>
        </div>
      ))}
      <Modal
        open={record !== undefined}
        title="Competência"
        busy={action.busy}
        onClose={() => setRecord(undefined)}
      >
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              const data = { code, name, active };
              await api(`/admin/competencies${record ? `/${record.id}` : ''}`, {
                method: record ? 'PUT' : 'POST',
                body: record ? { expectedVersion: record.version, data } : data,
              });
              setRecord(undefined);
              result.refresh();
            });
          }}
        >
          <h2>Competência</h2>
          <TextField
            label="Nome"
            required
            minLength={3}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Código"
            required
            minLength={2}
            maxLength={30}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <label className={s.check}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativa
          </label>
          <ActionFeedback action={action} />
          <Button type="submit" loading={action.busy}>
            Salvar competência
          </Button>
        </form>
      </Modal>
    </Panel>
  );
}
const emptyPeriod = (): PeriodData => ({
  code: '',
  name: '',
  active: true,
  startsOn: '',
  endsOn: '',
  timeZone: 'America/Fortaleza',
  calendarStatus: 'DRAFT',
  blocks: [],
});
function PeriodAdmin() {
  const result = useApi<Items<Period>>('/admin/periods?limit=100'),
    [record, setRecord] = useState<Period | null | undefined>(),
    [data, setData] = useState(emptyPeriod),
    action = useAction();
  const edit = (item: Period | null) => {
    setRecord(item);
    setData(
      item
        ? {
            code: item.code,
            name: item.name,
            active: item.active,
            startsOn: item.startsOn,
            endsOn: item.endsOn,
            timeZone: item.timeZone,
            calendarStatus: item.calendarStatus,
            blocks: item.blocks,
          }
        : emptyPeriod(),
    );
  };
  return (
    <Panel title="Períodos e grade institucional">
      <Button onClick={() => edit(null)}>
        <Icon name="plus" />
        Novo período
      </Button>
      <LoadingError {...result} retry={result.refresh} />
      {result.data?.items.map((p) => (
        <div className={s.row} key={p.id}>
          <div>
            <strong>{p.name}</strong>
            <p>
              {p.startsOn} a {p.endsOn}
            </p>
            <Badge value={p.calendarStatus} />
          </div>
          <Button variant="secondary" onClick={() => edit(p)}>
            Editar período
          </Button>
        </div>
      ))}
      <Modal
        open={record !== undefined}
        title="Período e grade"
        size="wide"
        busy={action.busy}
        onClose={() => setRecord(undefined)}
      >
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api(`/admin/periods${record ? `/${record.id}` : ''}`, {
                method: record ? 'PUT' : 'POST',
                body: record ? { expectedVersion: record.version, data } : data,
              });
              setRecord(undefined);
              result.refresh();
            });
          }}
        >
          <h2>Período e grade</h2>
          <div className={s.grid}>
            <TextField
              label="Nome do período"
              required
              minLength={3}
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
            <TextField
              label="Código do período"
              required
              minLength={2}
              value={data.code}
              onChange={(e) => setData({ ...data, code: e.target.value })}
            />
            <TextField
              label="Início do período"
              type="date"
              required
              value={data.startsOn}
              onChange={(e) => setData({ ...data, startsOn: e.target.value })}
            />
            <TextField
              label="Fim do período"
              type="date"
              required
              value={data.endsOn}
              onChange={(e) => setData({ ...data, endsOn: e.target.value })}
            />
          </div>
          <Select
            label="Situação da grade"
            value={data.calendarStatus}
            items={[
              { id: 'DRAFT', name: 'Em elaboração' },
              { id: 'REVIEWED', name: 'Grade revisada' },
            ]}
            onChange={(v) =>
              setData({ ...data, calendarStatus: v as PeriodData['calendarStatus'] })
            }
          />
          <p className={s.muted}>
            Fuso America/Fortaleza. Cadastre os blocos oficiais; intervalos são os espaços entre
            blocos.
          </p>
          {data.blocks.map((block, i) => (
            <div className={s.subsection} key={i}>
              <div className={s.grid}>
                <Select
                  label="Dia"
                  value={String(block.weekday)}
                  items={weekdays}
                  onChange={(v) =>
                    setData({
                      ...data,
                      blocks: data.blocks.map((b, j) =>
                        i === j ? { ...b, weekday: Number(v) } : b,
                      ),
                    })
                  }
                />
                <Select
                  label="Turno"
                  value={block.shift}
                  items={[
                    { id: 'MORNING', name: 'Manhã' },
                    { id: 'AFTERNOON', name: 'Tarde' },
                    { id: 'NIGHT', name: 'Noite' },
                  ]}
                  onChange={(v) =>
                    setData({
                      ...data,
                      blocks: data.blocks.map((b, j) =>
                        i === j ? { ...b, shift: v as typeof b.shift } : b,
                      ),
                    })
                  }
                />
                <TextField
                  label="Início do bloco"
                  type="time"
                  required
                  value={block.startsAt}
                  onChange={(e) =>
                    setData({
                      ...data,
                      blocks: data.blocks.map((b, j) =>
                        i === j ? { ...b, startsAt: e.target.value } : b,
                      ),
                    })
                  }
                />
                <TextField
                  label="Fim do bloco"
                  type="time"
                  required
                  value={block.endsAt}
                  onChange={(e) =>
                    setData({
                      ...data,
                      blocks: data.blocks.map((b, j) =>
                        i === j ? { ...b, endsAt: e.target.value } : b,
                      ),
                    })
                  }
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => setData({ ...data, blocks: data.blocks.filter((_, j) => j !== i) })}
              >
                Remover bloco
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              setData({
                ...data,
                blocks: [...data.blocks, { weekday: 1, startsAt: '', endsAt: '', shift: 'NIGHT' }],
              })
            }
          >
            <Icon name="plus" />
            Adicionar bloco oficial
          </Button>
          <ActionFeedback action={action} />
          <Button type="submit" loading={action.busy}>
            Salvar período
          </Button>
        </form>
      </Modal>
    </Panel>
  );
}
function WorkloadAdmin() {
  const users = useApi<Items<User>>('/admin/users?limit=100'),
    [selected, setSelected] = useState(''),
    record = useApi<{
      version: number;
      weeklyMinutes?: number;
      validFrom?: string;
      validUntil?: string;
      timeZone?: string;
    }>(selected ? `/admin/teachers/${selected}/workload` : null);
  return (
    <Panel title="Limite institucional de carga">
      <p className={s.muted}>
        O limite vale para o professor em todos os cursos. Dedicação pretendida é uma meta pessoal
        separada.
      </p>
      <Select
        label="Professor"
        value={selected}
        items={users.data?.items.filter((u) => u.roles.includes('teacher')) ?? []}
        onChange={setSelected}
      />
      <LoadingError {...record} retry={record.refresh} />
      {record.data && (
        <WorkloadForm
          key={`${selected}:${record.data.version}`}
          teacherId={selected}
          record={record.data}
          onSaved={record.refresh}
        />
      )}
    </Panel>
  );
}
function WorkloadForm({
  teacherId,
  record,
  onSaved,
}: {
  teacherId: string;
  record: { version: number; weeklyMinutes?: number; validFrom?: string; validUntil?: string };
  onSaved: () => void;
}) {
  const [hours, setHours] = useState(
      record.weeklyMinutes === undefined ? '' : String(record.weeklyMinutes / 60),
    ),
    [from, setFrom] = useState(record.validFrom ?? ''),
    [until, setUntil] = useState(record.validUntil ?? ''),
    action = useAction();
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api(`/admin/teachers/${teacherId}/workload`, {
            method: 'PUT',
            body: {
              expectedVersion: record.version,
              weeklyMinutes: Number(hours) * 60,
              validFrom: from,
              validUntil: until,
              timeZone: 'America/Fortaleza',
            },
          });
          onSaved();
        }, 'Limite institucional salvo.');
      }}
    >
      <TextField
        label="Limite semanal (horas de relógio)"
        required
        type="number"
        min={0.25}
        max={168}
        step={0.25}
        value={hours}
        onChange={(e) => setHours(e.target.value)}
      />
      <div className={s.grid}>
        <TextField
          label="Válido de"
          required
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          label="Válido até"
          required
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
        />
      </div>
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy}>
        Salvar limite de carga
      </Button>
    </form>
  );
}
