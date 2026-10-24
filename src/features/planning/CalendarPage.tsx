import { HolidayNotice } from './HolidayNotice';
import { usePreferences } from '../settings/preferences';
import { useState, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useDemoProfiles } from '../registration/demoService';
import { TeacherSchedule } from './TeacherSchedule';
import { PageHeader } from '../../components/ui/PageHeader/PageHeader';
import { Button } from '../../components/ui/Button/Button';
import { Alert } from '../../components/ui/Alert/Alert';
import { useAuth } from '../auth/session/useAuth';
import { courses } from '../registration/catalog';
import { PlanModal, type PlanEditor } from './PlanModal';
import {
  addDays,
  exampleSlots,
  minutes,
  monday,
  movePlan,
  shiftLabels,
  shiftOf,
  usePlans,
  type Plan,
  type Shift,
} from './service';
import styles from './Planning.module.css';
import { MonthCalendar } from './MonthCalendar';
import { shiftMonth } from './calendarDates';
import { useHolidays } from './holidays';
import { isPastDate, useInstitutionToday } from './institutionDate';
const dragType = 'text/x-profly-allocation';
function PlanCard({
  plan,
  onEdit,
  onDrag,
}: {
  plan: Plan;
  onEdit: () => void;
  onDrag: (id?: string) => void;
}) {
  return (
    <button
      type="button"
      className={styles.planCard}
      draggable
      onClick={onEdit}
      onDragStart={(event) => {
        event.dataTransfer.setData(dragType, plan.id);
        event.dataTransfer.effectAllowed = 'move';
        onDrag(plan.id);
      }}
      onDragEnd={() => onDrag(undefined)}
      aria-label={`Editar ${plan.subject}, ${plan.teacherName}`}
    >
      <span className={styles.cardTime}>
        {plan.date ? `${plan.start}–${plan.end}` : 'A definir'}
      </span>
      <strong>{plan.subject}</strong>
      <span>{plan.teacherName}</span>
      <span className={styles.cardGroup}>{plan.group}</span>
    </button>
  );
}
export function CalendarPage() {
  const today = useInstitutionToday();
  const { session } = useAuth();
  const coordinator = session?.role === 'coordinator';
  const [searchParams] = useSearchParams();
  const { profiles } = useDemoProfiles();
  const availability = profiles.find((item) => item.email === session?.email)?.availability ?? [];
  const [showIntended, setShowIntended] = useState(
    !coordinator && searchParams.get('horarios') === 'pretendidos',
  );
  const preferences = usePreferences(session?.email ?? '', !coordinator);
  const { plans, error: readError } = usePlans();
  const [date, setDate] = useState(() => today);
  const [view, setView] = useState<'month' | 'week' | 'day'>(
    showIntended ? 'week' : preferences.view,
  );
  const holidays = useHolidays(Number(date.slice(0, 4)), preferences.showHolidays);
  const [shift, setShift] = useState<Shift>(preferences.shift);
  const [courseId, setCourseId] = useState('direito');
  const [editor, setEditor] = useState<PlanEditor | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<string>();
  const dates =
    view === 'week'
      ? Array.from({ length: 7 }, (_, index) => addDays(monday(date), index))
      : [date];
  const visible = coordinator
    ? plans.filter((plan) => plan.state === 'DRAFT' && plan.courseId === courseId)
    : [];
  const scheduled = visible.filter(
    (plan) => dates.includes(plan.date) && shiftOf(plan.start) === shift,
  );
  const pending = visible.filter((plan) => !plan.date);
  const slots = (() => {
    const rows = new Map(exampleSlots[shift].map((slot) => [slot.start, slot]));
    scheduled.forEach((plan) => {
      if (!rows.has(plan.start)) rows.set(plan.start, { start: plan.start, end: plan.end });
    });
    return [...rows.values()].sort((a, b) => a.start.localeCompare(b.start));
  })();
  function open(next: PlanEditor) {
    setError('');
    setEditor(next);
  }
  async function drop(event: DragEvent, targetDate: string, start: string, end: string) {
    event.preventDefault();
    setDragging(undefined);
    setMessage('');
    setError('');
    const plan = visible.find((item) => item.id === event.dataTransfer.getData(dragType));
    if (!plan || !coordinator) return;
    try {
      await movePlan(plan, targetDate, start, end);
      setMessage('Rascunho movido. A posição foi salva neste navegador.');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível mover a aula. A posição anterior foi preservada.',
      );
    }
  }
  const dateTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  );
  return (
    <section className={styles.page}>
      <title>Calendário | ProFly</title>
      <PageHeader
        title="Calendário"
        titleId="calendar-title"
        actions={coordinator && <Button onClick={() => open({ courseId })}>+ Nova alocação</Button>}
      />
      <div className={styles.pageIntro}>
        <p>
          {coordinator
            ? 'Organize a semana por turno. Arraste um cartão para um horário ou clique para editar.'
            : 'Acompanhe as aulas da sua escala publicada.'}
        </p>
        <span className={styles.draftBadge}>
          {coordinator ? 'Rascunho · não publicado' : 'Minha agenda'}
        </span>
      </div>
      {readError && <Alert variant="error">{readError}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      <div className={styles.toolbar}>
        <div className={styles.dateControls}>
          <button
            type="button"
            aria-label={
              view === 'month'
                ? 'Mês anterior'
                : view === 'week'
                  ? 'Semana anterior'
                  : 'Dia anterior'
            }
            onClick={() =>
              setDate(
                view === 'month' ? shiftMonth(date, -1) : addDays(date, view === 'week' ? -7 : -1),
              )
            }
          >
            ‹
          </button>
          <Button variant="secondary" onClick={() => setDate(today)}>
            Hoje
          </Button>
          <button
            type="button"
            aria-label={
              view === 'month' ? 'Próximo mês' : view === 'week' ? 'Próxima semana' : 'Próximo dia'
            }
            onClick={() =>
              setDate(
                view === 'month' ? shiftMonth(date, 1) : addDays(date, view === 'week' ? 7 : 1),
              )
            }
          >
            ›
          </button>
          <strong>{dateTitle}</strong>
        </div>
        <div className={styles.dateFilters}>
          {coordinator && (
            <label>
              Curso
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Dia de referência
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
        </div>
      </div>
      <div className={styles.calendarOptions}>
        <div className={styles.segmented} role="group" aria-label="Turno">
          {(Object.keys(shiftLabels) as Shift[]).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={shift === value}
              onClick={() => setShift(value)}
            >
              {shiftLabels[value]}
            </button>
          ))}
        </div>
        <div className={styles.segmented} role="group" aria-label="Visualização">
          <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>
            Mês
          </button>
          <button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')}>
            Semana
          </button>
          <button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')}>
            Dia
          </button>
        </div>
      </div>
      {!coordinator && (
        <div className={styles.teacherLegend}>
          <label>
            <input
              type="checkbox"
              checked={showIntended}
              onChange={(event) => setShowIntended(event.target.checked)}
            />{' '}
            Mostrar horários pretendidos
          </label>
          <span>Preferências declaradas · aulas publicadas aparecem separadamente</span>
        </div>
      )}
      {view === 'month' && (
        <MonthCalendar
          date={date}
          plans={visible.filter((plan) => plan.date && shiftOf(plan.start) === shift)}
          holidays={holidays.items}
          onDay={(day) => {
            setDate(day);
            setView('day');
          }}
          onPlan={(plan) => open({ plan })}
          availability={!coordinator && showIntended ? availability : []}
          shift={shift}
        />
      )}

      {!coordinator ? (
        view !== 'month' ? (
          <TeacherSchedule
            dates={dates}
            availability={availability}
            shift={shift}
            showIntended={showIntended}
          />
        ) : (
          <p className={styles.gradeNote}>
            Sua escala ainda não foi publicada.{' '}
            {showIntended
              ? 'Os períodos marcados como pretendidos são preferências semanais, sem atribuição de disciplina.'
              : 'Ative os horários pretendidos para consultar suas preferências no mês.'}
          </p>
        )
      ) : view !== 'month' ? (
        <>
          <div className={styles.calendarLayout}>
            <div className={styles.calendarScroll}>
              <div
                className={styles.calendarGrid}
                role="table"
                aria-label={`Calendário de ${shiftLabels[shift].toLowerCase()}`}
                style={{ gridTemplateColumns: `68px repeat(${dates.length},minmax(110px,1fr))` }}
              >
                <div className={styles.gridCorner} role="columnheader">
                  Horário
                </div>
                {dates.map((day) => (
                  <div
                    key={day}
                    className={styles.dayHeading}
                    role="columnheader"
                    data-today={day === today}
                  >
                    <span>
                      {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(
                        new Date(`${day}T12:00:00`),
                      )}
                    </span>
                    <strong>{new Date(`${day}T12:00:00`).getDate()}</strong>
                  </div>
                ))}
                {slots.map((slot, index) => (
                  <div key={slot.start} className={styles.gridRow} role="row">
                    <div className={styles.hour} role="rowheader">
                      <strong>{slot.start}</strong>
                      <span>{slot.end}</span>
                    </div>
                    {dates.map((day) => {
                      const entries = scheduled.filter(
                        (plan) => plan.date === day && plan.start === slot.start,
                      );
                      return (
                        <div
                          key={day}
                          className={styles.cell}
                          role="cell"
                          data-dragging={!!dragging}
                          data-past={isPastDate(day, today)}
                          onDragOver={(event) => {
                            if (
                              !isPastDate(day, today) &&
                              event.dataTransfer.types.includes(dragType)
                            )
                              event.preventDefault();
                          }}
                          onDrop={(event) => void drop(event, day, slot.start, slot.end)}
                        >
                          {entries.map((plan) => (
                            <PlanCard
                              key={plan.id}
                              plan={plan}
                              onEdit={() => open({ plan })}
                              onDrag={setDragging}
                            />
                          ))}
                          <button
                            type="button"
                            className={styles.addCell}
                            disabled={isPastDate(day, today)}
                            title={
                              isPastDate(day, today) ? 'Data passada: apenas consulta' : undefined
                            }
                            aria-label={`Adicionar aula em ${day} às ${slot.start}`}
                            onClick={() =>
                              open({ courseId, date: day, start: slot.start, end: slot.end })
                            }
                          >
                            <span>+</span>
                            {entries.length === 0 && (
                              <span className={styles.addCellText}>
                                {isPastDate(day, today) ? 'Data passada' : 'Adicionar'}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                    {slots[index + 1] && minutes(slots[index + 1].start) > minutes(slot.end) && (
                      <div role="cell" className={styles.breakRow}>
                        Intervalo · {slot.end}–{slots[index + 1].start}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <aside className={styles.pinShelf}>
              <header>
                <h2>Para alocar</h2>
                <span>{pending.length}</span>
              </header>
              <p>Arraste um cartão para a grade ou clique para escolher o horário.</p>
              {pending.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => open({ plan })}
                  onDrag={setDragging}
                />
              ))}
              {pending.length === 0 && (
                <p className={styles.shelfEmpty}>Todos os cartões deste curso já têm um horário.</p>
              )}
              <Button variant="secondary" onClick={() => open({ courseId })}>
                Criar cartão
              </Button>
            </aside>
          </div>
          <div className={styles.calendarFoot}>
            <span>◼ Aulas em rascunho</span>
            <span>{scheduled.length} encontro(s) neste turno e período</span>
            <Link to="/alocacoes">Ver lista de alocações</Link>
          </div>
          <p className={styles.gradeNote}>
            Grade ilustrativa. Os horários podem ser alterados pelo formulário; blocos fora da grade
            também ficam visíveis. O intervalo não representa uma regra oficial da instituição.
          </p>
        </>
      ) : (
        <p className={styles.gradeNote}>
          Cartões do turno selecionado · rascunhos deste curso. Clique no dia para abrir a grade e
          alocar; clique no cartão para editar.
        </p>
      )}
      {preferences.showHolidays && (
        <HolidayNotice
          items={holidays.items.filter((item) =>
            view === 'month'
              ? item.date.slice(0, 7) === date.slice(0, 7)
              : dates.includes(item.date),
          )}
          status={holidays.status}
          onRefresh={holidays.refresh}
        />
      )}
      <PlanModal
        editor={editor}
        onClose={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          setError('');
          setMessage('Rascunho salvo no calendário.');
        }}
      />
    </section>
  );
}
