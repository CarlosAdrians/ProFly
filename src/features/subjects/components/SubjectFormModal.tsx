import { useState, type FormEvent } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { TextField } from '../../../components/ui/TextField/TextField';
import { Button } from '../../../components/ui/Button/Button';
import type { Subject, SubjectInput } from '../types';
import {
  normalizeCode,
  validateSubject,
  type SubjectFormErrors,
  type SubjectFormValues,
} from '../validation';
import styles from './SubjectFormModal.module.css';

interface SubjectFormModalProps {
  open: boolean;
  /** Disciplina em edição; ausente para cadastro. */
  subject?: Subject;
  /** Demais disciplinas, para impedir duplicidade. */
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
  const [values, setValues] = useState<SubjectFormValues>({
    name: subject?.name ?? '',
    code: subject?.code ?? '',
  });
  const [errors, setErrors] = useState<SubjectFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  function change(field: keyof SubjectFormValues, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) setErrors(validateSubject(next, others));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateSubject(values, others);
    setErrors(nextErrors);
    const firstInvalid = (['name', 'code'] as const).find((field) => nextErrors[field]);
    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(firstInvalid);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setSaving(true);
    await onSubmit({
      name: values.name.trim().replace(/\s+/g, ' '),
      code: normalizeCode(values.code),
    });
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
        onChange={(event) => change('name', event.target.value)}
      />
      <TextField
        label="Código:"
        name="code"
        required
        maxLength={20}
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="Ex.: DIR101"
        value={values.code}
        error={errors.code}
        onChange={(event) => change('code', event.target.value.toUpperCase())}
      />
      <Button type="submit" className={styles.submit} loading={saving} loadingText="Salvando…">
        {submitLabel}
      </Button>
    </form>
  );
}
