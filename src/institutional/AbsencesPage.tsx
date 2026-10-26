import { StudyIllustration } from '../components/illustrations/StudyIllustration';
import a from './AbsencesPage.module.css';
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
import { ActionFeedback, Badge, Heading, LoadingError } from './ui';
import s from './Portal.module.css';
export function ApiAbsencesPage() {
  const { courseId, asTeacher } = useScope();
  return <AbsencesContent key={asTeacher ? 'teacher' : courseId} />;
}
function AbsencesContent() {
  const { courseId } = useScope(),
    teacher = useScope().asTeacher,
    [offset, setOffset] = useState(0),
    [attachmentId, setAttachmentId] = useState(''),
    result = useApi<Items<Absence> & { nextOffset: number | null }>(
      teacher
        ? `/me/absences?limit=10&offset=${offset}`
        : courseId
          ? `/courses/${courseId}/absences?limit=10&offset=${offset}`
          : null,
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
      <div className={a.overview}>
        <div>
          <StudyIllustration scene="document" />
          <div>
            <h2>
              {teacher
                ? 'Um envio reservado, do início à análise.'
                : 'Documentos organizados para a análise do curso.'}
            </h2>
            <p>
              {teacher
                ? 'Informe o afastamento, anexe o documento quando necessário e acompanhe a resposta de cada curso.'
                : 'Consulte o período informado e o documento privado. Cada coordenação registra somente a análise do seu curso.'}
            </p>
          </div>
        </div>
        <ol className={a.steps}>
          <li>{teacher ? 'Informe o período' : 'Confira o período'}</li>
          <li>{teacher ? 'Escolha os cursos responsáveis' : 'Leia o documento privado'}</li>
          <li>{teacher ? 'Acompanhe a análise' : 'Registre a análise do curso'}</li>
        </ol>
      </div>
      <LoadingError {...privacy} retry={privacy.refresh} />
      {privacy.data?.healthUploads === 'BLOCKED' && (
        <p className={s.privacyPending}>
          Novos atestados estão bloqueados até a faculdade definir o tratamento de dados de saúde.
          Você ainda pode informar ausência sem documento.
        </p>
      )}
      {privacy.data?.healthUploads === 'SYNTHETIC_ONLY' && (
        <p className={a.privacy}>
          <Icon name="shield" size={17} />
          Documentos habilitados somente para testes. Não envie atestados reais.
        </p>
      )}
      <LoadingError {...result} retry={result.refresh} />
      <ActionFeedback action={action} />
      <div className={a.records}>
        {result.data?.items.length === 0 && (
          <div className={a.empty}>
            <StudyIllustration scene="document" />
            <h2>Nenhuma comunicação de ausência recebida.</h2>
            <p>
              Quando você informar um afastamento, o período, o documento e o retorno da coordenação
              ficam organizados aqui.
            </p>
          </div>
        )}
        {result.data?.items.map((record) => (
          <article className={a.record} key={record.id}>
            <header className={a.recordHeader}>
              <div className={a.dateIcon}>
                <strong>{Number(record.startsOn.slice(8))}</strong>
                <span>
                  {new Date(`${record.startsOn}T12:00:00Z`)
                    .toLocaleDateString('pt-BR', { month: 'short' })
                    .replace('.', '')}
                </span>
              </div>
              <div>
                <h2>
                  {teacher
                    ? 'Comunicação de ausência'
                    : (teachers.data?.items.find((t) => t.id === record.teacherId)?.name ??
                      'Professor do curso')}
                </h2>
                <p>
                  {dayLabel(record.startsOn)} a {dayLabel(record.endsOn)}
                </p>
              </div>
              <span className={a.fileType}>
                <Icon name={record.attachment ? 'document' : 'calendar'} size={17} />
                {record.attachment
                  ? `${record.attachment.type === 'application/pdf' ? 'PDF' : 'Imagem'} · ${Math.ceil(record.attachment.bytes / 1024)} KB`
                  : 'Sem documento'}
              </span>
            </header>
            <div className={a.recordBody}>
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
                  <Button variant="secondary" onClick={() => setAttachmentId(record.id)}>
                    <Icon name="upload" />
                    Anexar atestado
                  </Button>
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
            </div>
          </article>
        ))}
      </div>
      <div className={a.pagination}>
        <Button
          variant="secondary"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 10))}
        >
          <Icon name="arrowLeft" />
          Mais recentes
        </Button>
        <Button
          variant="secondary"
          disabled={result.data?.nextOffset == null}
          onClick={() => setOffset(result.data?.nextOffset ?? offset)}
        >
          Mais antigas
          <Icon name="arrowRight" />
        </Button>
      </div>
      <Modal open={!!attachmentId} title="Anexar atestado" onClose={() => setAttachmentId('')}>
        {attachmentId && (
          <AttachmentForm
            recordId={attachmentId}
            onSaved={() => {
              setAttachmentId('');
              result.refresh();
            }}
          />
        )}
      </Modal>
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
              setOffset(0);
              result.refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function validateCertificate(file: File) {
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Selecione um atestado em PDF, JPG, PNG ou WebP.');
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error('Selecione um arquivo válido de até 5 MB.');
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
    <label className={a.upload}>
      <StudyIllustration scene="document" />
      <strong>Arquivo do atestado{required ? '' : ' (opcional)'}</strong>
      <span className={s.muted}>
        PDF, JPG, PNG ou WebP, até 5 MB. PDF sem senha, formulários ou links ativos, com até 50
        páginas.
      </span>
      <input
        type="file"
        aria-label="Arquivo do atestado"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        required={required && !file}
        disabled={disabled}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <span className={a.chosen}>
          <Icon name="check" size={16} />
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
