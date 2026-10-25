import { useState, type FormEvent } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { TextField } from '../../../components/ui/TextField/TextField';
import { Button } from '../../../components/ui/Button/Button';
import { formatPhone, phoneDigits } from '../../../utils/phone';
import type { Teacher, TeacherInput } from '../types';
import { validateTeacher, type TeacherFormErrors, type TeacherFormValues } from '../validation';
import styles from './TeacherFormModal.module.css';

interface TeacherFormModalProps {
  open: boolean;
  /** Professor em edição; ausente para cadastro. */
  teacher?: Teacher;
  /** Demais professores, para impedir e-mail duplicado. */
  others: Teacher[];
  onClose: () => void;
  onSubmit: (input: TeacherInput) => Promise<void>;
}

const fieldOrder: (keyof TeacherFormValues)[] = ['name', 'email', 'phone', 'area', 'weeklyHours'];

function toValues(teacher?: Teacher): TeacherFormValues {
  return {
    name: teacher?.name ?? '',
    email: teacher?.email ?? '',
    phone: teacher ? formatPhone(teacher.phone) : '',
    area: teacher?.area ?? '',
    weeklyHours: teacher ? String(teacher.weeklyHours ?? '') : '',
  };
}

export function TeacherFormModal({
  open,
  teacher,
  others,
  onClose,
  onSubmit,
}: TeacherFormModalProps) {
  const editing = Boolean(teacher);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar professor' : 'Cadastrar professor'}
    >
      <TeacherForm
        key={teacher?.id ?? 'novo'}
        teacher={teacher}
        others={others}
        onSubmit={onSubmit}
        submitLabel={editing ? 'SALVAR' : 'CADASTRAR'}
      />
    </Modal>
  );
}

interface TeacherFormProps {
  teacher?: Teacher;
  others: Teacher[];
  onSubmit: (input: TeacherInput) => Promise<void>;
  submitLabel: string;
}

function TeacherForm({ teacher, others, onSubmit, submitLabel }: TeacherFormProps) {
  const [values, setValues] = useState<TeacherFormValues>(() => toValues(teacher));
  const [errors, setErrors] = useState<TeacherFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  function change(field: keyof TeacherFormValues, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) setErrors(validateTeacher(next, others));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateTeacher(values, others);
    setErrors(nextErrors);
    const firstInvalid = fieldOrder.find((field) => nextErrors[field]);
    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(firstInvalid);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setSaving(true);
    await onSubmit({
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: phoneDigits(values.phone),
      area: values.area.trim(),
      weeklyHours: Number(values.weeklyHours),
    });
  }

  const fieldProps = (field: keyof TeacherFormValues) => ({
    name: field,
    value: values[field],
    error: errors[field],
    required: true,
  });

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <TextField
        {...fieldProps('name')}
        label="Nome completo:"
        autoComplete="name"
        onChange={(event) => change('name', event.target.value)}
      />
      <TextField
        {...fieldProps('email')}
        label="E-mail:"
        type="email"
        inputMode="email"
        autoComplete="email"
        onChange={(event) => change('email', event.target.value)}
      />
      <TextField
        {...fieldProps('phone')}
        label="Contato:"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(83) 90000-0000"
        onChange={(event) => change('phone', formatPhone(event.target.value))}
      />
      <TextField
        {...fieldProps('area')}
        label="Área de atuação:"
        onChange={(event) => change('area', event.target.value)}
      />
      <TextField
        {...fieldProps('weeklyHours')}
        label="Carga horária (horas semanais):"
        inputMode="numeric"
        onChange={(event) => change('weeklyHours', event.target.value.replace(/\D/g, ''))}
      />
      <Button type="submit" className={styles.submit} loading={saving} loadingText="Salvando…">
        {submitLabel}
      </Button>
    </form>
  );
}
