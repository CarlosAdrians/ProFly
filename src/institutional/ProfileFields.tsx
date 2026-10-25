import { educationLevels } from './profileModel';

import type { ProfileData, CatalogItem } from './types';
import { useApi } from './hooks';
import { TextField } from '../components/ui/TextField/TextField';
import { Button } from '../components/ui/Button/Button';
import { Icon } from '../components/ui/Icon/Icon';
import { LoadingError, Select } from './ui';
import s from './Portal.module.css';
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(
  (name, i) => ({ id: String(i + 1), name }),
);
const statuses = [
  { id: 'UNKNOWN', name: 'Ainda vou informar' },
  { id: 'NONE', name: 'Ainda não possuo' },
  { id: 'PROVIDED', name: 'Sim, possuo' },
];
export function ProfileFields({
  data,
  onChange,
  section = 'all',
}: {
  data: ProfileData;
  onChange: (value: ProfileData) => void;
  section?: 'academic' | 'availability' | 'all';
}) {
  const competencies = useApi<{ items: CatalogItem[] }>('/catalog/competencies?limit=100');
  const patch = (values: Partial<ProfileData>) => onChange({ ...data, ...values });
  const academic = section !== 'availability',
    availability = section !== 'academic';
  return (
    <div className={s.stack}>
      {academic && (
        <>
          <LoadingError {...competencies} retry={competencies.refresh} />
          <section>
            <h2>Formação acadêmica</h2>
            <p className={s.muted}>
              Cadastre somente formações concluídas. Instituição é a universidade ou escola que
              emitiu seu diploma.
            </p>
            {(data.education ?? []).map((item, i) => (
              <fieldset className={s.subsection} key={item.id}>
                <legend>Formação {i + 1}</legend>
                <div className={s.grid}>
                  <Select
                    label="Titulação"
                    value={item.level}
                    onChange={(level) =>
                      patch({
                        education: data.education!.map((e) =>
                          e.id === item.id ? { ...e, level: level as typeof item.level } : e,
                        ),
                      })
                    }
                    items={educationLevels}
                  />
                  {(['field', 'institution', 'completedYear'] as const).map((field) => (
                    <TextField
                      key={field}
                      label={
                        field === 'field'
                          ? 'Curso ou área de formação'
                          : field === 'institution'
                            ? 'Instituição (ex.: UEPB)'
                            : 'Ano de conclusão'
                      }
                      type={field === 'completedYear' ? 'number' : 'text'}
                      min={field === 'completedYear' ? 1900 : undefined}
                      max={field === 'completedYear' ? new Date().getFullYear() : undefined}
                      maxLength={100}
                      value={item[field]}
                      onChange={(e) =>
                        patch({
                          education: data.education!.map((v) =>
                            v.id === item.id
                              ? {
                                  ...v,
                                  [field]:
                                    field === 'completedYear'
                                      ? Number(e.target.value)
                                      : e.target.value,
                                }
                              : v,
                          ),
                        })
                      }
                    />
                  ))}
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    patch({ education: data.education!.filter((e) => e.id !== item.id) })
                  }
                >
                  <Icon name="trash" />
                  Remover formação
                </Button>
              </fieldset>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                patch({
                  education: [
                    ...(data.education ?? []),
                    {
                      id: crypto.randomUUID(),
                      level: 'BACHELOR',
                      field: '',
                      institution: '',
                      completedYear: new Date().getFullYear(),
                    },
                  ],
                })
              }
            >
              <Icon name="plus" />
              Adicionar formação
            </Button>
          </section>
          <section className={s.subsection}>
            <h2>Conhecimentos</h2>
            <p className={s.muted}>
              Sua declaração será analisada pela coordenação. O nível não equivale a uma aprovação.
            </p>
            {(data.knowledge ?? []).map((item) => (
              <div className={s.row} key={item.id}>
                <div className={s.grid} style={{ flex: 1 }}>
                  <Select
                    label="Conhecimento"
                    value={item.competencyId}
                    items={competencies.data?.items ?? []}
                    onChange={(competencyId) =>
                      patch({
                        knowledge: data.knowledge!.map((k) =>
                          k.id === item.id ? { ...k, competencyId } : k,
                        ),
                      })
                    }
                  />
                  <Select
                    label="Nível declarado"
                    value={String(item.level)}
                    items={[
                      { id: '1', name: '1 · Fundamentos' },
                      { id: '2', name: '2 · Aplicação' },
                      { id: '3', name: '3 · Avançado' },
                      { id: '4', name: '4 · Especialista' },
                      { id: '5', name: '5 · Referência' },
                    ]}
                    onChange={(level) =>
                      patch({
                        knowledge: data.knowledge!.map((k) =>
                          k.id === item.id ? { ...k, level: Number(level) } : k,
                        ),
                      })
                    }
                  />
                </div>
                <Button
                  aria-label="Remover conhecimento"
                  variant="secondary"
                  onClick={() =>
                    patch({ knowledge: data.knowledge!.filter((k) => k.id !== item.id) })
                  }
                >
                  <Icon name="trash" />
                </Button>
              </div>
            ))}
            {!competencies.loading && !competencies.data?.items.length && (
              <p className={s.empty}>
                O administrador precisa cadastrar as competências para preencher esta seção.
              </p>
            )}
            <Button
              variant="secondary"
              disabled={!competencies.data?.items.length}
              onClick={() =>
                patch({
                  knowledge: [
                    ...(data.knowledge ?? []),
                    { id: crypto.randomUUID(), competencyId: '', level: 3 },
                  ],
                })
              }
            >
              <Icon name="plus" />
              Adicionar conhecimento
            </Button>
          </section>
          {(['teaching', 'professional'] as const).map((key) => {
            const section = data[key] ?? { status: 'UNKNOWN' as const, entries: [] };
            const update = (value: typeof section) => patch({ [key]: value });
            return (
              <section className={s.subsection} key={key}>
                <h2>{key === 'teaching' ? 'Experiência docente' : 'Experiência profissional'}</h2>
                <Select
                  label="Você possui essa experiência?"
                  value={section.status}
                  items={statuses}
                  onChange={(status) =>
                    update({
                      status: status as typeof section.status,
                      entries: status === 'PROVIDED' ? section.entries : [],
                    })
                  }
                />
                {section.status === 'PROVIDED' && (
                  <>
                    {section.entries.map((entry, i) => {
                      const edit = (values: Partial<typeof entry>) =>
                        update({
                          ...section,
                          entries: section.entries.map((e) =>
                            e.id === entry.id ? { ...e, ...values } : e,
                          ),
                        });
                      return (
                        <fieldset className={s.subsection} key={entry.id}>
                          <legend>Experiência {i + 1}</legend>
                          <div className={s.grid}>
                            <TextField
                              label="Instituição ou organização"
                              maxLength={100}
                              value={entry.organization}
                              onChange={(e) => edit({ organization: e.target.value })}
                            />
                            <TextField
                              label="Atividade ou disciplinas ministradas"
                              maxLength={100}
                              value={entry.activity}
                              onChange={(e) => edit({ activity: e.target.value })}
                            />
                            <TextField
                              label="Data de início"
                              type="date"
                              max={new Date().toISOString().slice(0, 10)}
                              value={entry.startsOn}
                              onChange={(e) => edit({ startsOn: e.target.value })}
                            />
                            <TextField
                              label="Data de fim (opcional se atual)"
                              type="date"
                              max={new Date().toISOString().slice(0, 10)}
                              value={entry.endsOn ?? ''}
                              onChange={(e) => edit({ endsOn: e.target.value || null })}
                            />
                            <TextField
                              label={key === 'teaching' ? 'Semestres completos' : 'Meses completos'}
                              type="number"
                              min={0}
                              max={key === 'teaching' ? 80 : 1200}
                              value={entry.completedUnits}
                              onChange={(e) => edit({ completedUnits: Number(e.target.value) })}
                            />
                          </div>
                          <fieldset className={s.subsection}>
                            <legend>Conhecimentos relacionados</legend>
                            {(competencies.data?.items ?? []).map((c) => (
                              <label className={s.check} key={c.id}>
                                <input
                                  type="checkbox"
                                  checked={entry.competencyIds.includes(c.id)}
                                  onChange={(e) =>
                                    edit({
                                      competencyIds: e.target.checked
                                        ? [...entry.competencyIds, c.id]
                                        : entry.competencyIds.filter((id) => id !== c.id),
                                    })
                                  }
                                />
                                {c.name}
                              </label>
                            ))}
                          </fieldset>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              update({
                                ...section,
                                entries: section.entries.filter((e) => e.id !== entry.id),
                              })
                            }
                          >
                            <Icon name="trash" />
                            Remover experiência
                          </Button>
                        </fieldset>
                      );
                    })}
                    <Button
                      variant="secondary"
                      onClick={() =>
                        update({
                          ...section,
                          entries: [
                            ...section.entries,
                            {
                              id: crypto.randomUUID(),
                              organization: '',
                              activity: '',
                              competencyIds: [],
                              startsOn: '',
                              endsOn: null,
                              completedUnits: 0,
                            },
                          ],
                        })
                      }
                    >
                      <Icon name="plus" />
                      Adicionar experiência
                    </Button>
                  </>
                )}
              </section>
            );
          })}
        </>
      )}
      {availability && (
        <section className={s.subsection}>
          <h2>Disponibilidade e dedicação</h2>
          <p className={s.muted}>
            Informe horários pretendidos e sua vigência. A escala oficial é publicada pela
            coordenação.
          </p>
          <Select
            label="Disponibilidade"
            value={data.availability?.status ?? 'UNKNOWN'}
            items={[
              { id: 'UNKNOWN', name: 'Ainda vou informar' },
              { id: 'NONE', name: 'Sem disponibilidade neste momento' },
              { id: 'PROVIDED', name: 'Informar horários' },
            ]}
            onChange={(status) =>
              patch({
                availability: {
                  status: status as 'UNKNOWN' | 'NONE' | 'PROVIDED',
                  timeZone: 'America/Fortaleza',
                  windows: status === 'PROVIDED' ? (data.availability?.windows ?? []) : [],
                },
              })
            }
          />
          <p className={s.muted}>Fuso: America/Fortaleza</p>
          {data.availability?.status === 'PROVIDED' && (
            <>
              {data.availability.windows.map((window, i) => {
                const edit = (values: Partial<typeof window>) =>
                  patch({
                    availability: {
                      ...data.availability!,
                      windows: data.availability!.windows.map((w) =>
                        w.id === window.id ? { ...w, ...values } : w,
                      ),
                    },
                  });
                return (
                  <fieldset className={s.subsection} key={window.id}>
                    <legend>Horário pretendido {i + 1}</legend>
                    <div className={s.grid}>
                      <Select
                        label="Dia da semana"
                        value={String(window.weekday)}
                        items={weekdays}
                        onChange={(v) => edit({ weekday: Number(v) })}
                      />
                      <div className={s.grid}>
                        <TextField
                          label="Início"
                          type="time"
                          value={window.startsAt}
                          onChange={(e) => edit({ startsAt: e.target.value })}
                        />
                        <TextField
                          label="Fim"
                          type="time"
                          value={window.endsAt}
                          onChange={(e) => edit({ endsAt: e.target.value })}
                        />
                      </div>
                      <TextField
                        label="Válido de"
                        type="date"
                        value={window.validFrom}
                        onChange={(e) => edit({ validFrom: e.target.value })}
                      />
                      <TextField
                        label="Válido até"
                        type="date"
                        value={window.validUntil}
                        onChange={(e) => edit({ validUntil: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        patch({
                          availability: {
                            ...data.availability!,
                            windows: data.availability!.windows.filter((w) => w.id !== window.id),
                          },
                        })
                      }
                    >
                      <Icon name="trash" />
                      Remover horário
                    </Button>
                  </fieldset>
                );
              })}
              <Button
                variant="secondary"
                onClick={() =>
                  patch({
                    availability: {
                      ...data.availability!,
                      windows: [
                        ...data.availability!.windows,
                        {
                          id: crypto.randomUUID(),
                          weekday: 1,
                          startsAt: '18:30',
                          endsAt: '21:10',
                          validFrom: '',
                          validUntil: '',
                        },
                      ],
                    },
                  })
                }
              >
                <Icon name="plus" />
                Adicionar horário pretendido
              </Button>
            </>
          )}
          <div className={s.subsection}>
            <TextField
              label="Dedicação pretendida (horas por semana, opcional)"
              type="number"
              min={0}
              max={168}
              step={0.25}
              hint="Uma meta pessoal. Não substitui o limite de carga definido pela instituição."
              value={data.desiredWeeklyMinutes === undefined ? '' : data.desiredWeeklyMinutes / 60}
              onChange={(e) => {
                const next = { ...data };
                if (e.target.value === '') delete next.desiredWeeklyMinutes;
                else next.desiredWeeklyMinutes = Number(e.target.value) * 60;
                onChange(next);
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
