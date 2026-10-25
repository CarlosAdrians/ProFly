import type { PrivacyPolicy } from './PrivacyPage';
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
    [formMode, setFormMode] = useState<'certificate' | 'absence' | null>(null),
    action = useAction(),
    privacy = useApi<PrivacyPolicy>('/catalog/privacy');
  const canUpload = !!privacy.data && privacy.data.healthUploads !== 'BLOCKED';
  return (
    <>
      <Heading
        title={teacher ? 'Atestados e ausências' : 'Atestados do curso'}
        description={
          teacher
            ? 'Envie seu atestado e acompanhe a análise da coordenação.'
            : 'Consulte os documentos recebidos e analise o período de afastamento.'
        }
      >
        {teacher && (
          <div className={s.actions}>
            <Button disabled={!canUpload} onClick={() => setFormMode('certificate')}>
              <Icon name="upload" />
              Enviar atestado
            </Button>
            <Button variant="secondary" onClick={() => setFormMode('absence')}>
              <Icon name="plus" />
              Informar ausência
            </Button>
          </div>
        )}
      </Heading>
      <LoadingError {...privacy} retry={privacy.refresh} />
      {privacy.data?.healthUploads === 'BLOCKED' && (
        <p className={s.privacyPending}>
          Novos atestados estão bloqueados até a faculdade definir o tratamento de dados de saúde.
          Você ainda pode informar ausência sem documento.
        </p>
      )}
      {privacy.data?.healthUploads === 'SYNTHETIC_ONLY' && (
        <p className={s.muted}>
          Documentos habilitados somente para testes. Não envie atestados reais.
        </p>
      )}
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
                canUpload &&
                Object.values(record.decisions).every((d) => d.status === 'SUBMITTED') ? (
                <AttachmentForm recordId={record.id} onSaved={result.refresh} />
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
        open={!!formMode}
        title={formMode === 'certificate' ? 'Enviar atestado' : 'Informar ausência'}
        busy={action.busy}
        onClose={() => setFormMode(null)}
      >
        {formMode && (
          <AbsenceForm
            requireFile={formMode === 'certificate'}
            canUpload={canUpload}
            onCreated={result.refresh}
            courses={courses.data?.items ?? []}
            onSaved={() => {
              setFormMode(null);
              result.refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function validateCertificate(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Selecione um atestado em JPG, PNG ou WebP.');
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error('Selecione uma imagem válida de até 5 MB.');
}
async function uploadCertificate(recordId: string, file: File) {
  validateCertificate(file);
  const data = new FormData();
  data.append('file', file);
  await api(`/me/absences/${recordId}/attachment`, { method: 'POST', body: data });
}
function CertificateField({
  file,
  onChange,
  required = false,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={s.certificateUpload}>
      <Icon name="document" size={28} />
      <strong>Arquivo do atestado{required ? '' : ' (opcional)'}</strong>
      <span className={s.muted}>JPG, PNG ou WebP, até 5 MB. PDF ainda não é aceito.</span>
      <input
        type="file"
        aria-label="Arquivo do atestado"
        accept="image/jpeg,image/png,image/webp"
        required={required && !file}
        disabled={disabled}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <span>
          {file.name} · {Math.ceil(file.size / 1024)} KB
        </span>
      )}
    </label>
  );
}
function AttachmentForm({ recordId, onSaved }: { recordId: string; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null),
    action = useAction();
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          if (!file) return;
          await uploadCertificate(recordId, file);
          onSaved();
        }, 'Atestado recebido.');
      }}
    >
      <CertificateField file={file} onChange={setFile} required disabled={action.busy} />
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy} disabled={!file}>
        <Icon name="upload" />
        Enviar este atestado
      </Button>
    </form>
  );
}
function AbsenceForm({
  courses,
  onSaved,
  onCreated,
  requireFile,
  canUpload,
}: {
  courses: CatalogItem[];
  onSaved: () => void;
  onCreated: () => void;
  requireFile: boolean;
  canUpload: boolean;
}) {
  const [startsOn, setStart] = useState(''),
    [endsOn, setEnd] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [file, setFile] = useState<File | null>(null),
    [created, setCreated] = useState<Absence | null>(null),
    action = useAction();
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          if (requireFile && !file) throw new Error('Selecione o arquivo do atestado.');
          if (file) validateCertificate(file);
          let record = created;
          if (!record) {
            record = await api<Absence>('/me/absences', {
              method: 'POST',
              body: { startsOn, endsOn, courseIds: selected },
            });
            setCreated(record);
            onCreated();
          }
          if (file) await uploadCertificate(record.id, file);
          onSaved();
        });
      }}
    >
      <h2>{requireFile ? 'Enviar atestado' : 'Comunicar ausência'}</h2>
      <p className={s.muted}>
        Informe as datas do afastamento e os cursos que devem receber a comunicação. O documento
        fica disponível somente para você e as coordenações selecionadas.
      </p>
      {canUpload && (
        <CertificateField
          file={file}
          onChange={setFile}
          required={requireFile}
          disabled={action.busy}
        />
      )}
      <fieldset className={s.absenceDates} disabled={!!created || action.busy}>
        <legend>Período de afastamento</legend>
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
      </fieldset>
      <fieldset className={s.subsection} disabled={!!created || action.busy}>
        <legend>Cursos responsáveis pela análise</legend>
        {courses
          .filter((c) => c.roles?.includes('teacher'))
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
      {!courses.some((c) => c.roles?.includes('teacher')) && (
        <p>É necessário um vínculo aprovado com um curso para comunicar ausência.</p>
      )}
      {created && (
        <p role="status">
          O período já foi salvo. Se o arquivo falhou, tente enviá-lo novamente; a comunicação não
          será duplicada.
        </p>
      )}
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy} disabled={!selected.length}>
        <Icon name={file ? 'upload' : 'save'} />
        {requireFile
          ? created
            ? 'Reenviar atestado'
            : 'Enviar atestado para análise'
          : 'Salvar comunicação'}
      </Button>
    </form>
  );
}
