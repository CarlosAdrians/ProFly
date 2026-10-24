import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/Modal/Modal';
import { TextField } from '../../components/ui/TextField/TextField';
import { Button } from '../../components/ui/Button/Button';
import { Alert } from '../../components/ui/Alert/Alert';
import { courses } from '../registration/catalog';
import { ProfileAvatar } from '../account/components/ProfileAvatar';
import {
  savePlan,
  staffFor,
  subjectsFor,
  isoDate,
  type Plan,
  type PlanInput,
  type Staff,
} from './service';
import styles from './Planning.module.css';
export interface PlanEditor {
  plan?: Plan;
  date?: string;
  start?: string;
  end?: string;
  courseId?: string;
}
function PlanForm({
  editor,
  onClose,
  onSaved,
}: {
  editor: PlanEditor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<PlanInput>(() =>
    editor.plan
      ? { ...editor.plan }
      : {
          courseId: editor.courseId || 'direito',
          subject: '',
          teacherId: '',
          group: '2º período A',
          date: editor.date ?? isoDate(new Date()),
          start: editor.start ?? '18:30',
          end: editor.end ?? '19:20',
          note: '',
        },
  );
  const [unscheduled, setUnscheduled] = useState(editor.plan ? !editor.plan.date : false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([staffFor(data.courseId), subjectsFor(data.courseId)])
      .then(([nextStaff, nextSubjects]) => {
        if (active) {
          setStaff(nextStaff);
          setSubjects(nextSubjects);
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar os professores e disciplinas.');
      });
    return () => {
      active = false;
    };
  }, [data.courseId]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await savePlan(
        { ...data, ...(unscheduled ? { date: '', start: '', end: '' } : {}) },
        editor.plan?.id,
        editor.plan?.version,
      );
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      <h2>{editor.plan ? 'Editar alocação' : 'Nova alocação'}</h2>
      <p className={styles.muted}>
        Planeje uma aula em rascunho. A compatibilidade acadêmica e a publicação ainda precisam de
        revisão.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      <div className={styles.formGrid}>
        <label>
          Curso
          <select
            value={data.courseId}
            onChange={(e) =>
              setData({ ...data, courseId: e.target.value, teacherId: '', subject: '' })
            }
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Disciplina
          <select
            value={data.subject}
            onChange={(e) => setData({ ...data, subject: e.target.value })}
          >
            <option value="">Selecione a disciplina</option>
            {subjects.map((subject) => (
              <option key={subject}>{subject}</option>
            ))}
          </select>
        </label>
        <label>
          Professor
          <select
            value={data.teacherId}
            onChange={(e) => setData({ ...data, teacherId: e.target.value })}
          >
            <option value="">Selecione o professor</option>
            {staff.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Turma"
          value={data.group}
          maxLength={40}
          onChange={(e) => setData({ ...data, group: e.target.value })}
        />
      </div>
      {data.teacherId && (
        <div className={styles.teacherPreview}>
          <ProfileAvatar
            email={staff.find((teacher) => teacher.id === data.teacherId)?.email ?? ''}
            size={36}
          />
          <span>{staff.find((teacher) => teacher.id === data.teacherId)?.name}</span>
        </div>
      )}
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={unscheduled}
          onChange={(e) => setUnscheduled(e.target.checked)}
        />
        Definir o horário depois
      </label>
      {!unscheduled && (
        <div className={styles.formGrid}>
          <TextField
            label="Data da aula"
            type="date"
            value={data.date}
            onChange={(e) => setData({ ...data, date: e.target.value })}
          />
          <div className={styles.times}>
            <TextField
              label="Início"
              type="time"
              value={data.start}
              onChange={(e) => setData({ ...data, start: e.target.value })}
            />
            <TextField
              label="Término"
              type="time"
              value={data.end}
              onChange={(e) => setData({ ...data, end: e.target.value })}
            />
          </div>
        </div>
      )}
      <label className={styles.noteLabel}>
        Observação (opcional)
        <textarea
          rows={2}
          maxLength={500}
          value={data.note}
          onChange={(e) => setData({ ...data, note: e.target.value })}
        />
      </label>
      <div className={styles.formActions}>
        <Button variant="secondary" disabled={loading} onClick={onClose}>
          Voltar
        </Button>
        <Button type="submit" loading={loading} loadingText="Salvando…">
          Salvar rascunho
        </Button>
      </div>
    </form>
  );
}
export function PlanModal({
  editor,
  onClose,
  onSaved,
}: {
  editor: PlanEditor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal
      open={editor !== null}
      title={editor?.plan ? 'Editar alocação' : 'Nova alocação'}
      size="wide"
      onClose={onClose}
    >
      {editor && (
        <PlanForm
          key={editor.plan?.id ?? `${editor.date}-${editor.start}`}
          editor={editor}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
