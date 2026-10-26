import { useAction } from './actions';
import { today } from './dates';
import { useState } from 'react';
import { Button } from '../components/ui/Button/Button';
import { TextField } from '../components/ui/TextField/TextField';
import { ApiModal as Modal } from './ui';
import { Icon } from '../components/ui/Icon/Icon';
import { api } from './api';
import { useApi } from './hooks';
import { useScope } from './scope';
import type {
  Allocation,
  Assessment,
  CatalogItem,
  Items,
  Meeting,
  Offering,
  Period,
  Planning,
  Subject,
  User,
} from './types';
import { ActionFeedback, Badge, Heading, LoadingError, Panel, Select } from './ui';
import s from './Portal.module.css';
import { RoomLabel } from './RoomLabel';
export function MeetingFields({
  meetings,
  onChange,
  period,
}: {
  meetings: Meeting[];
  onChange: (meetings: Meeting[]) => void;
  period: Period | undefined;
}) {
  const blocks =
    period?.blocks.map((b, i) => ({
      id: String(i),
      name: `${['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][b.weekday - 1]} · ${b.startsAt}–${b.endsAt}`,
    })) ?? [];
  return (
    <section>
      <h3>Encontros da oferta</h3>
      {!period && <p className={s.muted}>Selecione uma oferta ou período com grade cadastrada.</p>}
      {meetings.map((m, i) => {
        const match = period?.blocks.findIndex(
          (b) => b.weekday === m.weekday && b.startsAt === m.startsAt && b.endsAt === m.endsAt,
        );
        const edit = (values: Partial<Meeting>) =>
          onChange(meetings.map((v) => (v.id === m.id ? { ...v, ...values } : v)));
        return (
          <fieldset className={s.subsection} key={m.id}>
            <legend>Encontro {i + 1}</legend>
            <Select
              label="Bloco da grade"
              value={match !== undefined && match >= 0 ? String(match) : ''}
              items={blocks}
              required
              onChange={(v) => {
                if (v === '') return;
                const block = period?.blocks[Number(v)];
                if (block)
                  edit({ weekday: block.weekday, startsAt: block.startsAt, endsAt: block.endsAt });
              }}
            />
            <div className={s.grid}>
              <TextField
                label="Primeira data da vigência"
                required
                type="date"
                min={period?.startsOn}
                max={period?.endsOn}
                value={m.validFrom}
                onChange={(e) => edit({ validFrom: e.target.value })}
              />
              <TextField
                label="Última data da vigência"
                required
                type="date"
                min={m.validFrom || period?.startsOn}
                max={period?.endsOn}
                value={m.validUntil}
                onChange={(e) => edit({ validUntil: e.target.value })}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => onChange(meetings.filter((v) => v.id !== m.id))}
            >
              <Icon name="trash" />
              Remover encontro
            </Button>
          </fieldset>
        );
      })}
      <Button
        variant="secondary"
        disabled={!period?.blocks.length}
        onClick={() => {
          const block = period!.blocks[0];
          if (block)
            onChange([
              ...meetings,
              {
                id: crypto.randomUUID(),
                weekday: block.weekday,
                startsAt: block.startsAt,
                endsAt: block.endsAt,
                validFrom: period!.startsOn < today() ? today() : period!.startsOn,
                validUntil: period!.endsOn,
              },
            ]);
        }}
      >
        <Icon name="plus" />
        Adicionar encontro
      </Button>
    </section>
  );
}
export function AssessmentView({ value }: { value: Assessment }) {
  return (
    <section>
      <div className={s.row}>
        <Badge value={value.eligibility} />
        <strong>
          {value.score.value === null
            ? 'Score pendente'
            : `${value.score.value.toLocaleString('pt-BR')} / 100`}
        </strong>
      </div>
      <p className={s.muted}>
        Proposta configurável · Perfil v{value.profileVersion} · Critérios v{value.rulesVersion}
      </p>
      <ol className={s.tree}>
        {value.checks.map((c) => (
          <li key={c.id}>
            <Badge value={c.state} />
            <p>
              {c.reason}
              <code>
                {c.state === 'PASS'
                  ? 'Sim · seguir'
                  : c.state === 'FAIL'
                    ? 'Não · impedimento identificado'
                    : 'Condição ainda sem resposta conclusiva'}
              </code>
            </p>
          </li>
        ))}
      </ol>
      <h3>Fatores acadêmicos</h3>
      {value.score.factors.map((f) => (
        <div className={s.row} key={f.id}>
          <span>
            {(
              {
                knowledge: 'Conhecimentos',
                teaching: 'Experiência docente',
                professional: 'Experiência profissional',
              } as Record<string, string>
            )[f.id] ?? f.id}
          </span>
          <strong>{f.points === null ? 'Pendente' : `${f.points} de ${f.weight}`}</strong>
        </div>
      ))}
      <p className={s.muted}>
        O índice não é uma probabilidade de sucesso e não atribui aulas automaticamente.
      </p>
    </section>
  );
}
export function AllocationForm({
  record,
  onSaved,
  offeringPreset,
}: {
  record: Allocation | null;
  onSaved: () => void;
  offeringPreset?: string;
}) {
  const { courseId } = useScope(),
    offerings = useApi<Items<Offering>>(`/courses/${courseId}/offerings?limit=100`),
    teachers = useApi<Items<User>>(`/courses/${courseId}/teachers`),
    periods = useApi<Items<Period>>('/periods');
  const [offeringId, setOffering] = useState(record?.offeringId ?? offeringPreset ?? ''),
    [teacherId, setTeacher] = useState(record?.teacherId ?? ''),
    [room, setRoom] = useState(record?.room ?? ''),
    [meetings, setMeetings] = useState<Meeting[]>(record?.meetings ?? []),
    [assessment, setAssessment] = useState<Assessment | null>(null),
    [candidates, setCandidates] = useState<(Assessment & { name: string })[]>([]),
    action = useAction();
  const offering = offerings.data?.items.find((o) => o.id === offeringId),
    period = periods.data?.items.find((p) => p.id === offering?.periodId);
  const payload = { offeringId, teacherId, meetings, room: room.trim() || null };
  const assess = async () => {
    setAssessment(
      await api<Assessment>(`/courses/${courseId}/eligibility`, {
        method: 'POST',
        body: { ...payload, ...(record ? { allocationId: record.id } : {}) },
      }),
    );
  };
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api(`/courses/${courseId}/allocations${record ? `/${record.id}` : ''}`, {
            method: record ? 'PUT' : 'POST',
            body: record ? { expectedVersion: record.version, data: payload } : payload,
          });
          onSaved();
        });
      }}
    >
      <h2>{record ? 'Editar alocação' : 'Nova alocação'}</h2>
      <p className={s.muted}>
        Salvar cria uma reserva em rascunho. O professor acompanha somente a última publicação.
      </p>
      <LoadingError {...offerings} retry={offerings.refresh} />
      <Select
        label="Oferta de disciplina e turma"
        required
        value={offeringId}
        items={offerings.data?.items.filter((o) => o.active) ?? []}
        onChange={(id) => {
          setOffering(id);
          setMeetings(offerings.data?.items.find((o) => o.id === id)?.meetings ?? []);
          setAssessment(null);
          setCandidates([]);
        }}
      />
      <Select
        label="Professor aprovado no curso"
        required
        value={teacherId}
        items={teachers.data?.items ?? []}
        onChange={(id) => {
          setTeacher(id);
          setAssessment(null);
        }}
      />
      <TextField
        label="Sala"
        placeholder="Ex.: 201"
        maxLength={80}
        value={room}
        onChange={(event) => {
          setRoom(event.target.value);
          setAssessment(null);
          setCandidates([]);
        }}
      />
      <p className={s.muted}>
        Informe o nome ou número da sala. Se ainda não estiver definida, deixe em branco. A sala
        aparecerá para o professor após a publicação.
      </p>
      <MeetingFields
        meetings={meetings}
        period={period}
        onChange={(v) => {
          setMeetings(v);
          setAssessment(null);
          setCandidates([]);
        }}
      />
      <ActionFeedback action={action} />
      <div className={s.actions}>
        <Button
          variant="secondary"
          loading={action.busy}
          disabled={!teacherId || !offeringId || !meetings.length}
          onClick={() => void action.run(assess)}
        >
          <Icon name="shield" />
          Conferir elegibilidade
        </Button>
        <Button
          variant="secondary"
          loading={action.busy}
          disabled={!offeringId || !meetings.length}
          onClick={() =>
            void action.run(async () => {
              const response = await api<{
                items: (Assessment & { name: string; rank: number | null })[];
              }>(`/courses/${courseId}/recommendations`, {
                method: 'POST',
                body: {
                  offeringId,
                  meetings,
                  room: room.trim() || null,
                  ...(record ? { allocationId: record.id } : {}),
                },
              });
              const results = response.items;
              setCandidates(results);
            })
          }
        >
          Comparar professores
        </Button>
      </div>
      {candidates.map((c) => (
        <div className={s.row} key={c.teacherId}>
          <div>
            <strong>{c.name}</strong>
            <p>
              <Badge value={c.eligibility} />{' '}
              {c.score.value === null ? 'Score pendente' : `${c.score.value} pontos`}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setTeacher(c.teacherId);
              setAssessment(c);
            }}
          >
            Ver motivos
          </Button>
        </div>
      ))}
      {assessment && <AssessmentView value={assessment} />}
      <Button
        type="submit"
        loading={action.busy}
        disabled={!teacherId || !offeringId || !meetings.length}
      >
        <Icon name="save" />
        Salvar rascunho
      </Button>
    </form>
  );
}
export function ApiAllocationsPage() {
  const { courseId } = useScope(),
    planning = useApi<Planning>(courseId ? `/courses/${courseId}/planning` : null),
    subjects = useApi<Items<Subject>>(courseId ? `/courses/${courseId}/subjects?limit=100` : null),
    teachers = useApi<Items<User>>(courseId ? `/courses/${courseId}/teachers` : null),
    periods = useApi<Items<Period>>('/periods'),
    [editing, setEditing] = useState<Allocation | null | undefined>(),
    [setup, setSetup] = useState(false),
    [publishing, setPublishing] = useState<string | null>(null),
    action = useAction();
  return (
    <>
      <Heading
        title="Alocações"
        description="Planeje, confira os candidatos e publique uma revisão estável."
      >
        <Button disabled={!courseId} onClick={() => setEditing(null)}>
          <Icon name="plus" />
          Nova alocação
        </Button>
      </Heading>
      <div className={s.actions}>
        <Button variant="secondary" disabled={!courseId} onClick={() => setSetup(true)}>
          Turmas e ofertas
        </Button>
      </div>
      <LoadingError {...planning} retry={planning.refresh} />
      <ActionFeedback action={action} />
      <Panel title="Rascunhos e publicações">
        {planning.data?.plans.map((p) => (
          <div className={s.row} key={p.id}>
            <div>
              <strong>
                {periods.data?.items.find((v) => v.id === p.periodId)?.name ?? 'Período'}
              </strong>
              <p>
                Rascunho v{p.draftVersion} · Publicação{' '}
                {p.publishedRevision || 'ainda não realizada'}
              </p>
            </div>
            <Button onClick={() => setPublishing(p.periodId)}>Publicar revisão</Button>
          </div>
        ))}
        {planning.data?.allocations.length === 0 && (
          <p className={s.empty}>
            Crie turmas e ofertas, confira os critérios e monte sua primeira alocação.
          </p>
        )}
        {planning.data?.allocations.map((a) => (
          <div className={s.row} key={a.id}>
            <div>
              <strong>
                {subjects.data?.items.find((v) => v.id === a.subjectId)?.name ?? 'Disciplina'}
              </strong>
              <p>
                {teachers.data?.items.find((t) => t.id === a.teacherId)?.name ?? 'Professor'} ·{' '}
                {a.slots.length} encontros
              </p>
              <Badge value={a.state} />
              <p>
                <RoomLabel room={a.room} />
              </p>
            </div>
            <div className={s.actions}>
              <Button variant="secondary" onClick={() => setEditing(a)}>
                <Icon name="edit" />
                Editar
              </Button>
              <Button
                variant="secondary"
                loading={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api(`/courses/${courseId}/allocations/${a.id}`, {
                      method: 'DELETE',
                      body: { expectedVersion: a.version },
                    });
                    planning.refresh();
                  }, 'Rascunho removido. A escala publicada permanece até uma nova publicação.')
                }
              >
                <Icon name="trash" />
                Remover rascunho
              </Button>
            </div>
          </div>
        ))}
      </Panel>
      <Modal
        open={editing !== undefined}
        title="Alocação"
        size="wide"
        onClose={() => setEditing(undefined)}
      >
        {editing !== undefined && (
          <AllocationForm
            key={editing?.id ?? courseId}
            record={editing}
            onSaved={() => {
              setEditing(undefined);
              planning.refresh();
            }}
          />
        )}
      </Modal>
      <Modal open={setup} title="Turmas e ofertas" size="wide" onClose={() => setSetup(false)}>
        {setup && <PlanningSetup courseId={courseId} />}
      </Modal>
      <Modal
        open={!!publishing}
        title="Publicar revisão"
        busy={action.busy}
        onClose={() => setPublishing(null)}
      >
        <h2>Publicar escala</h2>
        <p>
          Todos os rascunhos deste curso e período serão revalidados. Os professores passarão a
          acompanhar esta revisão. Se houver conflito ou pendência, a publicação anterior será
          preservada.
        </p>
        <ActionFeedback action={action} />
        <Button
          loading={action.busy}
          onClick={() =>
            void action.run(async () => {
              const plan = planning.data?.plans.find((p) => p.periodId === publishing);
              if (!plan) throw new Error('Atualize o planejamento.');
              await api(`/courses/${courseId}/periods/${plan.periodId}/publish`, {
                method: 'POST',
                body: { expectedVersion: plan.version },
              });
              setPublishing(null);
              planning.refresh();
            }, 'Escala publicada com sucesso.')
          }
        >
          Confirmar publicação
        </Button>
      </Modal>
    </>
  );
}
function PlanningSetup({ courseId }: { courseId: string }) {
  const groups = useApi<Items<CatalogItem & { periodId: string }>>(
      `/courses/${courseId}/groups?limit=100`,
    ),
    subjects = useApi<Items<Subject>>(`/courses/${courseId}/subjects?limit=100`),
    periods = useApi<Items<Period>>('/periods'),
    offerings = useApi<Items<Offering>>(`/courses/${courseId}/offerings?limit=100`),
    [mode, setMode] = useState('group'),
    [editing, setEditing] = useState<{ id: string; version: number } | null>(null),
    [active, setActive] = useState(true),
    [name, setName] = useState(''),
    [code, setCode] = useState(''),
    [periodId, setPeriod] = useState(''),
    [groupId, setGroup] = useState(''),
    [subjectId, setSubject] = useState(''),
    [meetings, setMeetings] = useState<Meeting[]>([]),
    action = useAction();
  return (
    <div className={s.stack}>
      <h2>Turmas e ofertas do curso</h2>
      <p className={s.muted}>
        Uma oferta combina disciplina, turma, período e todos os encontros. A grade institucional é
        configurada pela administração.
      </p>
      <Select
        label="Cadastrar"
        value={mode}
        items={[
          { id: 'group', name: 'Turma' },
          { id: 'offering', name: 'Oferta de disciplina' },
        ]}
        onChange={(value) => {
          setMode(value);
          setEditing(null);
          setName('');
          setCode('');
          setPeriod('');
          setGroup('');
          setSubject('');
          setMeetings([]);
          setActive(true);
        }}
      />
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(
            async () => {
              const data = {
                code,
                name,
                active,
                periodId,
                ...(mode === 'offering' ? { groupId, subjectId, meetings } : {}),
              };
              await api(
                `/courses/${courseId}/${mode === 'group' ? 'groups' : 'offerings'}${editing ? `/${editing.id}` : ''}`,
                {
                  method: editing ? 'PUT' : 'POST',
                  body: editing ? { expectedVersion: editing.version, data } : data,
                },
              );
              groups.refresh();
              offerings.refresh();
              setName('');
              setCode('');
              setEditing(null);
              setActive(true);
            },
            editing
              ? 'Estrutura atualizada.'
              : mode === 'group'
                ? 'Turma cadastrada.'
                : 'Oferta cadastrada.',
          );
        }}
      >
        <TextField
          label={mode === 'group' ? 'Nome da turma' : 'Nome da oferta'}
          required
          minLength={3}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Código"
          required
          minLength={2}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Select
          label="Período"
          value={periodId}
          required
          items={periods.data?.items ?? []}
          onChange={(id) => {
            setPeriod(id);
            setGroup('');
            setMeetings([]);
          }}
        />
        {mode === 'offering' && (
          <>
            <Select
              label="Disciplina"
              required
              value={subjectId}
              items={subjects.data?.items.filter((v) => v.active) ?? []}
              onChange={setSubject}
            />
            <Select
              label="Turma"
              required
              value={groupId}
              items={groups.data?.items.filter((v) => v.periodId === periodId && v.active) ?? []}
              onChange={setGroup}
            />
            <MeetingFields
              meetings={meetings}
              onChange={setMeetings}
              period={periods.data?.items.find((p) => p.id === periodId)}
            />
          </>
        )}
        <label className={s.check}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{' '}
          Cadastro ativo
        </label>
        <ActionFeedback action={action} />
        <Button type="submit" loading={action.busy}>
          <Icon name="save" />{' '}
          {editing ? 'Salvar alterações' : `Cadastrar ${mode === 'group' ? 'turma' : 'oferta'}`}
        </Button>
        {editing && (
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(null);
              setName('');
              setCode('');
              setActive(true);
            }}
          >
            Cancelar edição
          </Button>
        )}
      </form>
      <h3>Estrutura cadastrada</h3>
      {groups.data?.items.map((g) => (
        <div className={s.row} key={g.id}>
          <span>
            {g.name} · {g.code} · {g.active ? 'Ativa' : 'Inativa'}
          </span>
          <Button
            variant="secondary"
            onClick={() => {
              setMode('group');
              setEditing(g);
              setName(g.name);
              setCode(g.code);
              setPeriod(g.periodId);
              setActive(g.active);
            }}
          >
            <Icon name="edit" />
            Editar turma {g.code}
          </Button>
        </div>
      ))}
      {offerings.data?.items.map((o) => (
        <div className={s.row} key={o.id}>
          <span>
            {o.name} · {o.meetings.length} encontros semanais · {o.active ? 'Ativa' : 'Inativa'}
          </span>
          <Button
            variant="secondary"
            onClick={() => {
              setMode('offering');
              setEditing(o);
              setName(o.name);
              setCode(o.code);
              setPeriod(o.periodId);
              setGroup(o.groupId);
              setSubject(o.subjectId);
              setMeetings(o.meetings);
              setActive(o.active);
            }}
          >
            <Icon name="edit" />
            Editar oferta {o.code}
          </Button>
        </div>
      ))}
    </div>
  );
}
