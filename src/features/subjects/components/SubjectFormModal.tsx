import { Alert } from '../../../components/ui/Alert/Alert';
import { useState, type FormEvent } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { TextField } from '../../../components/ui/TextField/TextField';
import { Button } from '../../../components/ui/Button/Button';
import type { Subject, SubjectInput } from '../types';
import { validateSubject, type SubjectFormErrors, type SubjectFormValues } from '../validation';
import styles from './SubjectFormModal.module.css';

interface SubjectFormModalProps {
  open: boolean;
  /** Disciplina em edição; ausente para cadastro. */
  subject?: Subject;
  /** Demais disciplinas, para impedir duplicidade de nome. */
  others: Subject[];
  onClose: () => void;
  onSubmit: (input: SubjectInput) => Promise<void>;
}

export function SubjectFormModal({
  open,
  subject,
  others,
  onClose,
  onSubmit,
}: SubjectFormModalProps) {
  const editing = Boolean(subject);
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      busy={busy}
      onClose={onClose}
      title={editing ? 'Editar disciplina' : 'Cadastrar disciplina'}
    >
      <SubjectForm
        key={subject?.id ?? 'nova'}
        subject={subject}
        others={others}
        onSubmit={onSubmit}
        submitLabel={editing ? 'Salvar alterações' : 'Criar disciplina'}
        onClose={onClose}
        onBusyChange={setBusy}
      />
    </Modal>
  );
}

interface SubjectFormProps {
  subject?: Subject;
  others: Subject[];
  onSubmit: (input: SubjectInput) => Promise<void>;
  submitLabel: string;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}

function SubjectForm({
  subject,
  others,
  onSubmit,
  submitLabel,
  onClose,
  onBusyChange,
}: SubjectFormProps) {
  const [values, setValues] = useState<SubjectFormValues>({ name: subject?.name ?? '' });
  const [errors, setErrors] = useState<SubjectFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');

  function changeName(name: string) {
    setValues({ name });
    if (submitted) setErrors(validateSubject({ name }, others));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFailure('');
    setSubmitted(true);
    const nextErrors = validateSubject(values, others);
    setErrors(nextErrors);
    if (nextErrors.name) {
      const input = event.currentTarget.elements.namedItem('name');
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setSaving(true);
    onBusyChange(true);
    try {
      await onSubmit({ name: values.name.trim().replace(/\s+/g, ' ') });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Não foi possível salvar a disciplina.');
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <header className={styles.heading}>
        <span aria-hidden="true">▤</span>
        <div>
          <h2>{subject ? 'Editar disciplina' : 'Nova disciplina'}</h2>
          <p>
            {subject
              ? 'Atualize o nome, mantendo a identidade da disciplina.'
              : 'Adicione uma disciplina ao catálogo de Direito.'}
          </p>
        </div>
      </header>
      {failure && <Alert variant="error">{failure}</Alert>}
      <fieldset className={styles.fields} disabled={saving}>
        <TextField
          label="Nome da disciplina:"
          name="name"
          data-autofocus
          required
          maxLength={100}
          value={values.name}
          error={errors.name}
          onChange={(event) => changeName(event.target.value)}
        />
        {/* Código definido pelo sistema: nunca editável e não enviado pelo formulário. */}
        <TextField
          label="Código:"
          readOnly
          aria-readonly="true"
          value={subject?.code ?? ''}
          placeholder="Gerado automaticamente ao salvar"
          hint="O código é definido pelo sistema e não pode ser alterado."
        />
      </fieldset>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving} loadingText="Salvando…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
