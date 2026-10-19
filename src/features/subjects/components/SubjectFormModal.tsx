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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar disciplina' : 'Cadastrar disciplina'}
    >
      <SubjectForm
        key={subject?.id ?? 'nova'}
        subject={subject}
        others={others}
        onSubmit={onSubmit}
        submitLabel={editing ? 'SALVAR' : 'CADASTRAR'}
      />
    </Modal>
  );
}

interface SubjectFormProps {
  subject?: Subject;
  others: Subject[];
  onSubmit: (input: SubjectInput) => Promise<void>;
  submitLabel: string;
}

function SubjectForm({ subject, others, onSubmit, submitLabel }: SubjectFormProps) {
  const [values, setValues] = useState<SubjectFormValues>({ name: subject?.name ?? '' });
  const [errors, setErrors] = useState<SubjectFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  function changeName(name: string) {
    setValues({ name });
    if (submitted) setErrors(validateSubject({ name }, others));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateSubject(values, others);
    setErrors(nextErrors);
    if (nextErrors.name) {
      const input = event.currentTarget.elements.namedItem('name');
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setSaving(true);
    await onSubmit({ name: values.name.trim().replace(/\s+/g, ' ') });
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <TextField
        label="Nome da disciplina:"
        name="name"
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
      <Button type="submit" className={styles.submit} loading={saving} loadingText="Salvando…">
        {submitLabel}
      </Button>
    </form>
  );
}
