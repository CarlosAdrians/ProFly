import { useAction } from './actions';
import { dayLabel } from './dates';
import { useState } from 'react';
import { Button } from '../components/ui/Button/Button';
import { ApiModal as Modal } from './ui';
import { TextField } from '../components/ui/TextField/TextField';
import { Icon } from '../components/ui/Icon/Icon';
import { api, download } from './api';
import { useApi } from './hooks';
import { useScope } from './scope';
import type { Absence, CatalogItem, Items, User } from './types';
import { ActionFeedback, Badge, Heading, LoadingError, Panel } from './ui';
import s from './Portal.module.css';
export function ApiAbsencesPage() {
  const { courseId } = useScope(),
    teacher = useScope().asTeacher,
    result = useApi<Items<Absence>>(
      teacher ? '/me/absences' : courseId ? `/courses/${courseId}/absences` : null,
    ),
    courses = useApi<Items<CatalogItem>>(teacher ? '/courses' : null),
    teachers = useApi<Items<User>>(!teacher && courseId ? `/courses/${courseId}/teachers` : null),
    [open, setOpen] = useState(false),
    action = useAction();
  return (
    <>
      <Heading
        title={teacher ? 'Minhas ausências' : 'Ausências do curso'}
        description="O afastamento é temporário e não reduz a compatibilidade acadêmica."
      >
        {teacher && (
          <Button onClick={() => setOpen(true)}>
            <Icon name="plus" />
            Informar ausência
          </Button>
        )}
      </Heading>
      <LoadingError {...result} retry={result.refresh} />
      <ActionFeedback action={action} />
      <Panel>
        {result.data?.items.length === 0 && (
          <p className={s.empty}>Nenhuma comunicação de ausência recebida.</p>
        )}
        {result.data?.items.map((record) => (
          <article className={s.subsection} key={record.id}>
            <h2>
              {teacher
                ? 'Comunicação de ausência'
                : (teachers.data?.items.find((t) => t.id === record.teacherId)?.name ??
                  'Professor do curso')}
            </h2>
            <p>
              {dayLabel(record.startsOn)} a {dayLabel(record.endsOn)}
            </p>
            {Object.entries(record.decisions).map(([id, decision]) => (
              <div className={s.row} key={id}>
                <span>
                  {courses.data?.items.find((c) => c.id === id)?.name ?? 'Análise do curso'}
                </span>
                <Badge value={decision.status} />
              </div>
            ))}
            <div className={s.actions}>
              {record.attachment ? (
                <Button
                  variant="secondary"
                  loading={action.busy}
                  onClick={() =>
                    void action.run(() =>
                      download(
                        `${teacher ? '/me' : `/courses/${courseId}`}/absences/${record.id}/attachment`,
                      ),
                    )
                  }
                >
                  <Icon name="shield" />
                  Baixar atestado privado
                </Button>
              ) : teacher &&
                Object.values(record.decisions).every((d) => d.status === 'SUBMITTED') ? (
                <label className={s.select}>
                  Anexar atestado (opcional)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={action.busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void action.run(async () => {
                          if (file.size > 5 * 1024 * 1024)
                            throw new Error('Selecione uma imagem de até 5 MB.');
                          const data = new FormData();
                          data.append('file', file);
                          await api(`/me/absences/${record.id}/attachment`, {
                            method: 'POST',
                            body: data,
                          });
                          result.refresh();
                        }, 'Atestado privado recebido.');
                      e.target.value = '';
                    }}
                  />
                  <span className={s.muted}>
                    JPG, PNG ou WebP, até 5 MB e 16 megapixels. O original enviado é preservado. PDF
                    ainda não é aceito.
                  </span>
                </label>
              ) : (
                <span className={s.muted}>Sem atestado anexado.</span>
              )}
              {!teacher && record.decisions[courseId]?.status === 'SUBMITTED' && (
                <>
                  <Button
                    loading={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await api(`/courses/${courseId}/absences/${record.id}/review`, {
                          method: 'POST',
                          body: { expectedVersion: record.version, decision: 'ACCEPTED' },
                        });
                        result.refresh();
                      })
                    }
                  >
                    Aceitar período informado
                  </Button>
                  <Button
                    variant="secondary"
                    loading={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await api(`/courses/${courseId}/absences/${record.id}/review`, {
                          method: 'POST',
                          body: { expectedVersion: record.version, decision: 'REJECTED' },
                        });
                        result.refresh();
                      })
                    }
                  >
                    Recusar comunicação
                  </Button>
                </>
              )}
            </div>
          </article>
        ))}
      </Panel>
      <Modal
        open={open}
        title="Informar ausência"
        busy={action.busy}
        onClose={() => setOpen(false)}
      >
        {open && (
          <AbsenceForm
            courses={courses.data?.items ?? []}
            onSaved={() => {
              setOpen(false);
              result.refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function AbsenceForm({ courses, onSaved }: { courses: CatalogItem[]; onSaved: () => void }) {
  const [startsOn, setStart] = useState(''),
    [endsOn, setEnd] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    action = useAction();
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api('/me/absences', {
            method: 'POST',
            body: { startsOn, endsOn, courseIds: selected },
          });
          onSaved();
        });
      }}
    >
      <h2>Comunicar ausência</h2>
      <p className={s.muted}>
        Selecione as coordenações responsáveis pela análise. Não inclua diagnósticos; o documento
        será anexado em etapa reservada após salvar.
      </p>
      <TextField
        label="Primeiro dia"
        type="date"
        required
        value={startsOn}
        onChange={(e) => setStart(e.target.value)}
      />
      <TextField
        label="Último dia"
        type="date"
        required
        min={startsOn}
        value={endsOn}
        onChange={(e) => setEnd(e.target.value)}
      />
      <fieldset className={s.subsection}>
        <legend>Cursos responsáveis pela análise</legend>
        {courses.map((c) => (
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
      {!courses.length && (
        <p>É necessário um vínculo aprovado com um curso para comunicar ausência.</p>
      )}
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy}>
        Salvar comunicação
      </Button>
    </form>
  );
}
