import { LoadingPlaceholder } from '../app/StatusPage';
import { ModalBusy, useAction } from './actions';
import { Modal as SharedModal } from '../components/ui/Modal/Modal';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Button } from '../components/ui/Button/Button';
import { Alert } from '../components/ui/Alert/Alert';
import { ApiError } from './api';
import s from './Portal.module.css';
const labels: Record<string, string> = {
  SUBMITTED: 'Em análise',
  APPROVED: 'Aprovado',
  CHANGES_REQUESTED: 'Ajustes solicitados',
  REJECTED: 'Recusado',
  ELIGIBLE: 'Elegível',
  INELIGIBLE: 'Não elegível',
  CONFIGURATION_PENDING: 'Configuração pendente',
  PENDING: 'Pendente',
  CALCULATED: 'Calculado',
  NOT_APPLICABLE: 'Não aplicável',
  PASS: 'Atendido',
  FAIL: 'Não atendido',
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  PLANNED: 'Prevista',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
  RESCHEDULED: 'Remarcada',
  AWAITING_CONFIRMATION: 'A confirmar',
  ACCEPTED: 'Aceito',
};
export function Badge({ value }: { value: string }) {
  return (
    <span className={s.badge} data-state={value}>
      {labels[value] ?? value}
    </span>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className={s.heading}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={s.panel}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
function fieldLabel(path: string) {
  const labels: Record<string, string> = {
    education: 'Formação',
    institution: 'Instituição',
    field: 'Curso ou área',
    completedYear: 'Ano de conclusão',
    level: 'Nível',
    contact: 'Contato',
    phone: 'Telefone',
    knowledge: 'Conhecimentos',
    competencyId: 'Conhecimento',
    competencyIds: 'Conhecimentos relacionados',
    teaching: 'Experiência docente',
    professional: 'Experiência profissional',
    organization: 'Organização',
    activity: 'Atividade',
    startsOn: 'Data de início',
    endsOn: 'Data de fim',
    completedUnits: 'Tempo de experiência',
    availability: 'Disponibilidade',
    windows: 'Horários pretendidos',
    weekday: 'Dia da semana',
    startsAt: 'Horário inicial',
    endsAt: 'Horário final',
    validFrom: 'Início da vigência',
    validUntil: 'Fim da vigência',
    desiredWeeklyMinutes: 'Dedicação pretendida',
    subjectIds: 'Disciplinas',
    requests: 'Cursos solicitados',
    eligibility: 'Elegibilidade',
    score: 'Pontuação',
    _form: 'Dados informados',
    password: 'Senha',
    legal: 'Termos e privacidade',
  };
  return path
    .split('.')
    .filter((v) => !['data', 'profile'].includes(v))
    .map((v) => (/^\d+$/.test(v) ? String(Number(v) + 1) : (labels[v] ?? 'Dados informados')))
    .join(' / ');
}
export function ErrorMessage({ error }: { error: Error | null }) {
  return error ? (
    <Alert variant="error">
      {error.message}
      {error instanceof ApiError && Object.keys(error.fieldErrors).length > 0 && (
        <ul className={s.errorList}>
          {Object.entries(error.fieldErrors).map(([field, issues]) => (
            <li key={field}>
              <strong>{fieldLabel(field)}</strong>: {issues.join(' ')}
            </li>
          ))}
        </ul>
      )}
    </Alert>
  ) : null;
}
export function LoadingError({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: Error | null;
  retry: () => void;
}) {
  return (
    <>
      {loading && <LoadingPlaceholder />}
      <ErrorMessage error={error} />
      {error && (
        <Button variant="secondary" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </>
  );
}
export function ApiModal({ busy, ...props }: ComponentProps<typeof SharedModal>) {
  const [pending, setPending] = useState(0);
  return (
    <ModalBusy.Provider value={(working) => setPending((n) => Math.max(0, n + (working ? 1 : -1)))}>
      <SharedModal {...props} busy={busy || pending > 0} />
    </ModalBusy.Provider>
  );
}
export function ActionFeedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <>
      <ErrorMessage error={action.error} />
      {action.message && (
        <div role="status">
          <Alert variant="info">{action.message}</Alert>
        </div>
      )}
    </>
  );
}
export function Select({
  label,
  value,
  onChange,
  items,
  empty = 'Selecione',
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: { id: string; name: string }[];
  empty?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={s.select}>
      {label}
      <select
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{empty}</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </label>
  );
}
