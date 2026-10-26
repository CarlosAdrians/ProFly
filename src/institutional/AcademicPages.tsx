import { proposedCriteria } from './criteriaModel';
import { useAction } from './actions';
import { useState } from 'react';
import { Button } from '../components/ui/Button/Button';
import { ApiModal as Modal } from './ui';
import { TextField } from '../components/ui/TextField/TextField';
import { Icon } from '../components/ui/Icon/Icon';
import { api } from './api';
import { useApi } from './hooks';
import { useScope, useAcademicReviewer } from './scope';
import { ProfileSummary } from './AccountPages';
import { educationLevels } from './profileModel';
import type {
  Application,
  CatalogItem,
  Criteria,
  Items,
  ReviewDetail,
  Subject,
  User,
} from './types';
import { ActionFeedback, Badge, Heading, LoadingError, Panel, Select } from './ui';
import s from './Portal.module.css';
export function ApiTeachersPage() {
  const canReview = useAcademicReviewer();
  const { courseId } = useScope(),
    applications = useApi<Items<Application>>(
      canReview ? `/courses/${courseId}/applications` : null,
    ),
    teachers = useApi<Items<User>>(courseId ? `/courses/${courseId}/teachers` : null),
    [selected, setSelected] = useState('');
  return (
    <>
      <Heading
        title="Professores"
        description="O próprio professor se cadastra. A coordenação analisa a entrada e os dados do seu curso."
      />
      {!courseId && <p className={s.empty}>Nenhum curso atribuído a esta conta.</p>}
      {canReview && (
        <Panel title="Solicitações por curso">
          <LoadingError {...applications} retry={applications.refresh} />
          {applications.data?.items.length === 0 && (
            <p className={s.empty}>Nenhuma solicitação recebida neste curso.</p>
          )}
          {applications.data?.items.map((a) => (
            <div className={s.row} key={a.id}>
              <div>
                <Badge value={a.status} />
                <p>
                  Recebida em {new Date(a.createdAt).toLocaleDateString('pt-BR')} · Perfil v
                  {a.profileVersion}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setSelected(a.id)}>
                <Icon name="edit" />
                Analisar perfil
              </Button>
            </div>
          ))}
        </Panel>
      )}
      <Panel title="Vínculos aprovados">
        <LoadingError {...teachers} retry={teachers.refresh} />
        {teachers.data?.items.length === 0 && (
          <p className={s.empty}>Nenhum professor aprovado neste curso.</p>
        )}
        {teachers.data?.items.map((t) => (
          <div className={s.row} key={t.id}>
            <div>
              <strong>{t.name}</strong>
              <p>{t.email}</p>
            </div>
            <Badge value="APPROVED" />
          </div>
        ))}
      </Panel>
      <Modal
        open={canReview && !!selected}
        size="wide"
        title="Análise docente por curso"
        onClose={() => setSelected('')}
      >
        {canReview && selected && (
          <ReviewForm
            key={`${courseId}:${selected}`}
            courseId={courseId}
            applicationId={selected}
            onSaved={() => {
              setSelected('');
              applications.refresh();
              teachers.refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function ReviewForm({
  courseId,
  applicationId,
  onSaved,
}: {
  courseId: string;
  applicationId: string;
  onSaved: () => void;
}) {
  const result = useApi<ReviewDetail>(`/courses/${courseId}/applications/${applicationId}`),
    competencies = useApi<Items<CatalogItem>>('/catalog/competencies?limit=100'),
    [decision, setDecision] = useState('APPROVED'),
    [reason, setReason] = useState(''),
    [items, setItems] = useState<Record<string, string>>({}),
    action = useAction();
  const detail = result.data,
    profile = detail?.profile.data;
  const evidence = profile
    ? [
        ...(profile.education ?? []).map((e) => ({
          id: e.id,
          label: `Formação: ${e.field} · ${e.institution}`,
        })),
        ...(profile.knowledge ?? []).map((k) => ({
          id: k.id,
          label: `Conhecimento: ${competencies.data?.items.find((c) => c.id === k.competencyId)?.name ?? 'Item'} · nível ${k.level}`,
        })),
        ...(profile.teaching?.entries ?? []).map((e) => ({
          id: e.id,
          label: `Docência: ${e.activity} · ${e.organization}`,
        })),
        ...(profile.professional?.entries ?? []).map((e) => ({
          id: e.id,
          label: `Prática: ${e.activity} · ${e.organization}`,
        })),
      ]
    : [];
  return (
    <>
      <LoadingError {...result} retry={result.refresh} />
      {detail && profile && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api(`/courses/${courseId}/applications/${applicationId}/review`, {
                method: 'POST',
                body: {
                  expectedVersion: detail.application.version,
                  profileVersion: detail.application.profileVersion,
                  decision,
                  reason,
                  items:
                    decision === 'APPROVED'
                      ? Object.entries(items)
                          .filter(([, status]) => status)
                          .map(([id, status]) => ({ id, status }))
                      : [],
                },
              });
              onSaved();
            });
          }}
        >
          <h2>{detail.teacher.name}</h2>
          <p>{detail.teacher.email}</p>
          <Badge value={detail.application.status} />
          <ProfileSummary data={profile} />
          <h3>Disponibilidade declarada</h3>
          {profile.availability?.windows.map((w) => (
            <p key={w.id}>
              {
                ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][
                  w.weekday - 1
                ]
              }{' '}
              · {w.startsAt}–{w.endsAt} · {w.validFrom} a {w.validUntil}
            </p>
          ))}
          {detail.currentProfileVersion !== detail.application.profileVersion && (
            <p role="alert">O perfil foi alterado. Solicite uma nova submissão antes de decidir.</p>
          )}
          {detail.application.status === 'SUBMITTED' ? (
            <>
              <h3>Confirmação de evidências</h3>
              <p className={s.muted}>
                Aprovar entrada não confirma automaticamente cada competência. Marque somente o que
                foi conferido. Itens sem análise mantêm a recomendação pendente.
              </p>
              {evidence.map((item) => (
                <div className={s.row} key={item.id}>
                  <span>{item.label}</span>
                  <Select
                    label="Análise do item"
                    value={items[item.id] ?? ''}
                    empty="Sem análise"
                    items={[
                      { id: 'CONFIRMED', name: 'Confirmado' },
                      { id: 'REJECTED', name: 'Evidência recusada (dado pendente)' },
                      ...(profile.knowledge?.some((k) => k.id === item.id)
                        ? [{ id: 'ABSENT', name: 'Ausência de conhecimento confirmada' }]
                        : []),
                    ]}
                    onChange={(status) => setItems({ ...items, [item.id]: status })}
                  />
                </div>
              ))}
              <div className={s.stack}>
                <Select
                  label="Decisão de entrada"
                  value={decision}
                  items={[
                    { id: 'APPROVED', name: 'Aprovar neste curso' },
                    { id: 'CHANGES_REQUESTED', name: 'Solicitar ajustes' },
                    { id: 'REJECTED', name: 'Recusar neste curso' },
                  ]}
                  onChange={setDecision}
                />
                <TextField
                  label="Motivo da decisão"
                  required
                  minLength={3}
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <ActionFeedback action={action} />
                <Button
                  type="submit"
                  loading={action.busy}
                  disabled={detail.currentProfileVersion !== detail.application.profileVersion}
                >
                  Registrar análise
                </Button>
              </div>
            </>
          ) : (
            <p className={s.muted}>{detail.application.reason}</p>
          )}
        </form>
      )}
    </>
  );
}
function CriteriaFields({ value, onChange }: { value: Criteria; onChange: (v: Criteria) => void }) {
  const competencies = useApi<Items<CatalogItem>>('/catalog/competencies?limit=100');
  const patch = (p: Partial<Criteria>) => onChange({ ...value, ...p });
  return (
    <section className={s.stack}>
      <h3>Proposta configurável de elegibilidade e score</h3>
      <p className={s.muted}>
        Pesos e requisitos dependem de validação institucional. Esta ficha organiza as regras desta
        disciplina.
      </p>
      <LoadingError {...competencies} retry={competencies.refresh} />
      <Select
        label="Situação da ficha"
        value={value.status}
        items={[
          { id: 'DRAFT', name: 'Proposta em rascunho' },
          { id: 'REVIEWED', name: 'Ficha revisada pela coordenação' },
        ]}
        onChange={(status) => patch({ status: status as Criteria['status'] })}
      />
      <h3>Conhecimentos obrigatórios</h3>
      {value.mandatoryKnowledge.map((item, i) => (
        <div className={s.row} key={i}>
          <Select
            label="Conhecimento obrigatório"
            value={item.competencyId}
            items={competencies.data?.items ?? []}
            onChange={(competencyId) =>
              patch({
                mandatoryKnowledge: value.mandatoryKnowledge.map((v, j) =>
                  j === i ? { ...v, competencyId } : v,
                ),
              })
            }
          />
          <TextField
            label="Nível mínimo"
            type="number"
            min={1}
            max={5}
            value={item.minLevel}
            onChange={(e) =>
              patch({
                mandatoryKnowledge: value.mandatoryKnowledge.map((v, j) =>
                  j === i ? { ...v, minLevel: Number(e.target.value) } : v,
                ),
              })
            }
          />
          <Button
            variant="secondary"
            aria-label="Remover requisito"
            onClick={() =>
              patch({ mandatoryKnowledge: value.mandatoryKnowledge.filter((_, j) => j !== i) })
            }
          >
            <Icon name="trash" />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          patch({
            mandatoryKnowledge: [...value.mandatoryKnowledge, { competencyId: '', minLevel: 3 }],
          })
        }
      >
        Adicionar requisito
      </Button>
      <h3>Conhecimentos desejáveis</h3>
      {value.desiredKnowledge.map((item, i) => (
        <div className={s.subsection} key={i}>
          <div className={s.grid}>
            <Select
              label="Conhecimento desejável"
              value={item.competencyId}
              items={competencies.data?.items ?? []}
              onChange={(competencyId) =>
                patch({
                  desiredKnowledge: value.desiredKnowledge.map((v, j) =>
                    j === i ? { ...v, competencyId } : v,
                  ),
                })
              }
            />
            <TextField
              label="Importância relativa"
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              value={item.weight}
              onChange={(e) =>
                patch({
                  desiredKnowledge: value.desiredKnowledge.map((v, j) =>
                    j === i ? { ...v, weight: Number(e.target.value) } : v,
                  ),
                })
              }
            />
            <TextField
              label="Nível esperado"
              type="number"
              min={1}
              max={5}
              value={item.targetLevel}
              onChange={(e) =>
                patch({
                  desiredKnowledge: value.desiredKnowledge.map((v, j) =>
                    j === i ? { ...v, targetLevel: Number(e.target.value) } : v,
                  ),
                })
              }
            />
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              patch({ desiredKnowledge: value.desiredKnowledge.filter((_, j) => j !== i) })
            }
          >
            <Icon name="trash" />
            Remover desejável
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          patch({
            desiredKnowledge: [
              ...value.desiredKnowledge,
              { competencyId: '', weight: 1, targetLevel: 3 },
            ],
          })
        }
      >
        Adicionar desejável
      </Button>
      <label className={s.check}>
        <input
          type="checkbox"
          checked={!!value.minimumEducation}
          onChange={(e) =>
            patch({
              minimumEducation: e.target.checked ? { level: 'BACHELOR', field: null } : null,
            })
          }
        />
        Exigir formação mínima
      </label>
      {value.minimumEducation && (
        <div className={s.grid}>
          <Select
            label="Formação mínima"
            value={value.minimumEducation.level}
            items={educationLevels}
            onChange={(level) =>
              patch({
                minimumEducation: {
                  ...value.minimumEducation!,
                  level: level as NonNullable<Criteria['minimumEducation']>['level'],
                },
              })
            }
          />
          <TextField
            label="Área exigida (opcional)"
            value={value.minimumEducation.field ?? ''}
            onChange={(e) =>
              patch({
                minimumEducation: { ...value.minimumEducation!, field: e.target.value || null },
              })
            }
          />
        </div>
      )}
      <fieldset className={s.subsection}>
        <legend>Competências pertinentes à experiência</legend>
        {competencies.data?.items.map((c) => (
          <label className={s.check} key={c.id}>
            <input
              type="checkbox"
              checked={value.relevantCompetencyIds.includes(c.id)}
              onChange={(e) =>
                patch({
                  relevantCompetencyIds: e.target.checked
                    ? [...value.relevantCompetencyIds, c.id]
                    : value.relevantCompetencyIds.filter((id) => id !== c.id),
                })
              }
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <div className={s.grid}>
        {(['minimumTeachingSemesters', 'minimumProfessionalMonths'] as const).map((key) => (
          <TextField
            key={key}
            label={
              key === 'minimumTeachingSemesters'
                ? 'Mínimo docente (semestres)'
                : 'Mínimo profissional (meses)'
            }
            type="number"
            min={0}
            max={key === 'minimumTeachingSemesters' ? 80 : 1200}
            value={value[key]}
            onChange={(e) => patch({ [key]: Number(e.target.value) })}
          />
        ))}
      </div>
      <h3>Fatores de pontuação</h3>
      <p className={s.muted}>
        Os pesos devem somar 100; dados desconhecidos não recebem zero nem redistribuem pesos.
      </p>
      <div className={s.grid}>
        {(
          [
            'knowledgeWeight',
            'teachingWeight',
            'professionalWeight',
            'teachingCapSemesters',
            'professionalCapMonths',
          ] as const
        ).map((key) => (
          <TextField
            key={key}
            label={
              {
                knowledgeWeight: 'Peso: conhecimentos',
                teachingWeight: 'Peso: docência',
                professionalWeight: 'Peso: prática profissional',
                teachingCapSemesters: 'Teto docente (semestres)',
                professionalCapMonths: 'Teto profissional (meses)',
              }[key]
            }
            type="number"
            min={key.includes('Weight') ? 0 : 1}
            max={key === 'professionalCapMonths' ? 1200 : 100}
            step={key.includes('Weight') ? 0.01 : 1}
            value={value.score[key]}
            onChange={(e) => patch({ score: { ...value.score, [key]: Number(e.target.value) } })}
          />
        ))}
      </div>
      <TextField
        label="Minutos confirmados equivalentes a um semestre (opcional)"
        type="number"
        min={1}
        max={100000}
        hint="Deixe em branco até a instituição definir a equivalência do histórico."
        value={value.score.confirmedMinutesPerTeachingSemester ?? ''}
        onChange={(e) =>
          patch({
            score: {
              ...value.score,
              confirmedMinutesPerTeachingSemester: e.target.value ? Number(e.target.value) : null,
            },
          })
        }
      />
    </section>
  );
}
export function ApiSubjectsPage() {
  const { courseId } = useScope(),
    result = useApi<Items<Subject>>(courseId ? `/courses/${courseId}/subjects?limit=100` : null),
    [editing, setEditing] = useState<Subject | null | undefined>(undefined),
    [search, setSearch] = useState('');
  return (
    <>
      <Heading
        title="Disciplinas"
        description="Conteúdo, requisitos e critérios de recomendação por curso."
      >
        <Button disabled={!courseId} onClick={() => setEditing(null)}>
          <Icon name="plus" />
          Nova disciplina
        </Button>
      </Heading>
      <TextField
        label="Buscar disciplina"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <LoadingError {...result} retry={result.refresh} />
      <Panel>
        {result.data?.items
          .filter((i) =>
            `${i.name} ${i.code}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
          )
          .map((subject) => (
            <div className={s.row} key={subject.id}>
              <div>
                <strong>{subject.name}</strong>
                <p>
                  {subject.code} · {subject.active ? 'Ativa' : 'Inativa'}
                </p>
                <Badge value={subject.criteria?.status ?? 'CONFIGURATION_PENDING'} />
              </div>
              <Button variant="secondary" onClick={() => setEditing(subject)}>
                <Icon name="edit" />
                Editar disciplina
              </Button>
            </div>
          ))}
        {result.data?.items.length === 0 && (
          <p className={s.empty}>
            Cadastre a primeira disciplina deste curso para receber solicitações de professores.
          </p>
        )}
      </Panel>
      <Modal
        open={editing !== undefined}
        size="wide"
        title={editing ? 'Editar disciplina' : 'Nova disciplina'}
        onClose={() => setEditing(undefined)}
      >
        {editing !== undefined && (
          <SubjectForm
            key={editing?.id ?? courseId}
            courseId={courseId}
            subject={editing}
            onSaved={() => {
              setEditing(undefined);
              result.refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function SubjectForm({
  subject,
  courseId,
  onSaved,
}: {
  subject: Subject | null;
  courseId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(subject?.name ?? ''),
    [code, setCode] = useState(subject?.code ?? ''),
    [active, setActive] = useState(subject?.active ?? true),
    [criteria, setCriteria] = useState<Criteria | null>(subject?.criteria ?? null),
    action = useAction();
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          const data = { name, code, active, criteria };
          await api(`/courses/${courseId}/subjects${subject ? `/${subject.id}` : ''}`, {
            method: subject ? 'PUT' : 'POST',
            body: subject ? { expectedVersion: subject.version, data } : data,
          });
          onSaved();
        });
      }}
    >
      <h2>{subject ? 'Editar disciplina' : 'Nova disciplina'}</h2>
      <div className={s.grid}>
        <TextField
          label="Nome da disciplina"
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
      </div>
      <label className={s.check}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Disciplina ativa
      </label>
      <label className={s.check}>
        <input
          type="checkbox"
          checked={!!criteria}
          onChange={(e) => setCriteria(e.target.checked ? proposedCriteria() : null)}
        />
        Configurar critérios de elegibilidade e score
      </label>
      {criteria && <CriteriaFields value={criteria} onChange={setCriteria} />}
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy}>
        <Icon name="save" />
        Salvar disciplina
      </Button>
    </form>
  );
}
