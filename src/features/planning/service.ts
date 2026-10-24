import { useEffect, useState } from 'react';
import { teacherService } from '../teachers/services/teacherService';
import { subjectService } from '../subjects/services/subjectService';
import { listDemoProfiles } from '../registration/demoService';
import { courses } from '../registration/catalog';
export type Shift = 'morning' | 'afternoon' | 'night';
export const shiftLabels = { morning: 'Manhã', afternoon: 'Tarde', night: 'Noite' };
export const exampleSlots: Record<Shift, { start: string; end: string }[]> = {
  morning: [
    { start: '08:00', end: '08:50' },
    { start: '08:50', end: '09:40' },
    { start: '09:55', end: '10:45' },
  ],
  afternoon: [
    { start: '13:00', end: '13:50' },
    { start: '13:50', end: '14:40' },
    { start: '14:55', end: '15:45' },
  ],
  night: [
    { start: '18:30', end: '19:20' },
    { start: '19:20', end: '20:10' },
    { start: '20:25', end: '21:15' },
  ],
};
export interface PlanInput {
  courseId: string;
  subject: string;
  teacherId: string;
  group: string;
  date: string;
  start: string;
  end: string;
  note: string;
}
export interface Plan extends PlanInput {
  id: string;
  version: number;
  teacherName: string;
  teacherEmail: string;
  state: 'DRAFT' | 'CANCELLED';
  updatedAt: string;
}
export interface Staff {
  id: string;
  name: string;
  email: string;
}
export const PLANS_KEY = 'profly:demo:planning:v1';
const eventName = 'profly:planning-changed';
export function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return isoDate(result);
}
export function monday(date: string) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return addDays(date, -((weekday + 6) % 7));
}
export function shiftOf(start: string): Shift {
  return start < '12:00' ? 'morning' : start < '18:00' ? 'afternoon' : 'night';
}
export function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
export function timeFromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function overlaps(
  a: Pick<Plan, 'date' | 'start' | 'end'>,
  b: Pick<Plan, 'date' | 'start' | 'end'>,
) {
  return !!a.date && a.date === b.date && a.start < b.end && b.start < a.end;
}
function validate(input: PlanInput) {
  if (
    !courses.some((item) => item.id === input.courseId) ||
    !input.subject ||
    !input.teacherId ||
    input.group.trim().length < 2 ||
    input.group.length > 40 ||
    input.note.length > 500
  )
    throw new Error('Confira o curso, a disciplina, o professor e a turma.');
  const scheduled = [input.date, input.start, input.end].filter(Boolean).length;
  if (scheduled === 0) return;
  if (
    scheduled !== 3 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isFinite(new Date(`${input.date}T12:00:00Z`).getTime()) ||
    new Date(`${input.date}T12:00:00Z`).toISOString().slice(0, 10) !== input.date ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.end) ||
    input.start >= input.end
  )
    throw new Error(
      'Informe uma data válida e um horário de término posterior ao início, no mesmo dia.',
    );
}
function initialPlans(): Plan[] {
  const week = monday(isoDate(new Date()));
  const item = (
    id: string,
    subject: string,
    teacherId: string,
    teacherName: string,
    teacherEmail: string,
    day: number,
    start: string,
    end: string,
  ): Plan => ({
    id,
    subject,
    teacherId,
    teacherName,
    teacherEmail,
    courseId: 'direito',
    group: '2º período A',
    date: day < 0 ? '' : addDays(week, day),
    start,
    end,
    note: '',
    state: 'DRAFT',
    version: 1,
    updatedAt: new Date().toISOString(),
  });
  return [
    item(
      'plan-demo-1',
      'Direito Civil I',
      't01',
      'Ana Beatriz Lima',
      'ana.lima@profly.test',
      0,
      '18:30',
      '19:20',
    ),
    item(
      'plan-demo-2',
      'Direito Penal I',
      't02',
      'Bruno Cavalcanti',
      'bruno.cavalcanti@profly.test',
      1,
      '18:30',
      '19:20',
    ),
    item(
      'plan-demo-3',
      'Direito Constitucional I',
      't03',
      'Camila Nóbrega',
      'camila.nobrega@profly.test',
      2,
      '19:20',
      '20:10',
    ),
    item(
      'plan-demo-4',
      'Direito Administrativo',
      't06',
      'Fábio Medeiros',
      'fabio.medeiros@profly.test',
      3,
      '20:25',
      '21:15',
    ),
    item(
      'plan-demo-5',
      'Direito Civil I',
      't01',
      'Ana Beatriz Lima',
      'ana.lima@profly.test',
      -1,
      '',
      '',
    ),
  ];
}
export function getPlans(): Plan[] {
  const value = localStorage.getItem(PLANS_KEY);
  if (!value) return initialPlans();
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          item?.id &&
          item.version >= 1 &&
          ['DRAFT', 'CANCELLED'].includes(item.state) &&
          typeof item.date === 'string',
      )
    )
      return parsed;
  } catch {
    /* Preserve corrupted drafts; don't silently overwrite them with fixtures. */
  }
  throw new Error('Não foi possível ler os rascunhos deste navegador. Os dados foram preservados.');
}
function store(plans: Plan[]) {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch {
    throw new Error('Não foi possível salvar o planejamento no navegador.');
  }
  window.dispatchEvent(new Event(eventName));
}
export async function staffFor(courseId: string): Promise<Staff[]> {
  const legacy = (await teacherService.list()).filter(
    (teacher) =>
      teacher.status === 'active' &&
      (courseId === 'direito' || (courseId === 'sistemas' && teacher.id === 't02')),
  );
  const registered = listDemoProfiles().filter((profile) =>
    profile.requests.some((r) => r.courseId === courseId && r.status === 'APPROVED'),
  );
  return [...legacy, ...registered].map(({ id, name, email }) => ({ id, name, email }));
}
export async function subjectsFor(courseId: string): Promise<string[]> {
  if (courseId === 'direito')
    return (await subjectService.list())
      .filter((subject) => subject.status === 'active')
      .map((subject) => subject.name);
  return [...(courses.find((course) => course.id === courseId)?.subjects ?? [])];
}
export async function savePlan(input: PlanInput, id?: string, expectedVersion?: number) {
  validate(input);
  const [staff, subjects] = await Promise.all([
    staffFor(input.courseId),
    subjectsFor(input.courseId),
  ]);
  const teacher = staff.find((item) => item.id === input.teacherId);
  if (!teacher || !subjects.includes(input.subject))
    throw new Error('Selecione um professor vinculado e uma disciplina ativa deste curso.');
  const plans = getPlans();
  const previous = id ? plans.find((item) => item.id === id) : undefined;
  if (id && (!previous || previous.version !== expectedVersion || previous.state === 'CANCELLED'))
    throw new Error('Este rascunho mudou. Atualize a tela antes de salvar.');
  for (const other of plans) {
    if (other.id === id || other.state === 'CANCELLED' || !overlaps(input, other)) continue;
    if (other.teacherId === input.teacherId)
      throw new Error('Este professor já possui uma aula nesse horário, inclusive em outro curso.');
    if (
      other.courseId === input.courseId &&
      other.group.trim().toLowerCase() === input.group.trim().toLowerCase()
    )
      throw new Error('Esta turma já possui uma aula nesse horário.');
  }
  const record: Plan = {
    ...input,
    group: input.group.trim(),
    id: id ?? crypto.randomUUID(),
    version: (previous?.version ?? 0) + 1,
    teacherName: teacher.name,
    teacherEmail: teacher.email,
    state: 'DRAFT',
    updatedAt: new Date().toISOString(),
  };
  store([...plans.filter((item) => item.id !== record.id), record]);
  return record;
}
export async function movePlan(plan: Plan, date: string, start: string, defaultEnd: string) {
  const duration = plan.date
    ? minutes(plan.end) - minutes(plan.start)
    : minutes(defaultEnd) - minutes(start);
  const end = timeFromMinutes(minutes(start) + duration);
  return savePlan({ ...plan, date, start, end }, plan.id, plan.version);
}
export function cancelPlan(plan: Plan) {
  const plans = getPlans();
  const current = plans.find((item) => item.id === plan.id);
  if (!current || current.version !== plan.version)
    throw new Error('O rascunho mudou. Atualize a tela.');
  store(
    plans.map((item) =>
      item.id === plan.id
        ? {
            ...item,
            state: 'CANCELLED',
            version: item.version + 1,
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  );
}
export function usePlans() {
  const read = () => {
    try {
      return { plans: getPlans(), error: '' };
    } catch (error) {
      return {
        plans: [] as Plan[],
        error: error instanceof Error ? error.message : 'Não foi possível ler o planejamento.',
      };
    }
  };
  const [value, setValue] = useState(read);
  useEffect(() => {
    const refresh = () => setValue(read());
    window.addEventListener(eventName, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return value;
}
