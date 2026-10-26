import { StudyIllustration } from '../components/illustrations/StudyIllustration';
import { useAction } from './actions';
import { dayLabel, timeLabel } from './dates';
import { useState } from 'react';
import { Button } from '../components/ui/Button/Button';
import { ApiModal as Modal } from './ui';
import { TextField } from '../components/ui/TextField/TextField';
import { Icon } from '../components/ui/Icon/Icon';
import { useHolidays } from '../features/planning/holidays';
import { HolidayNotice } from '../features/planning/HolidayNotice';
import { useInstitutionToday } from '../features/planning/institutionDate';
import { api } from './api';
import { useApi } from './hooks';
import { useScope } from './scope';
import type { Allocation, Items, Occurrence, Planning, Subject, User } from './types';
import { AllocationForm } from './PlanningPages';
import { ActionFeedback, Badge, Heading, LoadingError, Panel, Select } from './ui';
import { calendarShiftOptions, lessonDayPart, type CalendarShift } from './calendarShifts';
import { addDate, monday, monthDates, moveMeeting, weekday } from './calendarModel';
import { calendarSubjectTone } from './calendarColors';
import c from './TeacherCalendar.module.css';
import s from './Portal.module.css';
interface Pin {
  id: string;
  date: string;
  startsAt: string;
  endsAt: string;
  subject: string;
  teacher: string;
  course?: string;
  status: string;
  allocation?: Allocation;
  occurrence?: Occurrence;
}
export function ApiCalendarPage() {
  const { courseId } = useScope(),
    today = useInstitutionToday(),
    teacher = useScope().asTeacher,
    [date, setDate] = useState(today),
    [view, setView] = useState(teacher ? 'WEEK' : 'MONTH'),
    [shift, setShift] = useState<CalendarShift>(teacher ? 'ALL' : 'NIGHT'),
    [showHolidays, setHolidays] = useState(true),
    [editing, setEditing] = useState<Allocation | null | undefined>(),
    [selected, setSelected] = useState<Occurrence | null>(null),
    [drag, setDrag] = useState<{ allocation: Allocation; date: string } | null>(null),
    action = useAction();
  const rawDates =
    view === 'DAY'
      ? [date]
      : view === 'WEEK'
        ? Array.from({ length: 7 }, (_, i) => addDate(monday(date), i))
        : monthDates(date);
  const dates = rawDates.filter((day) => weekday(day) !== 7);
  const from = dates[0] ?? date,
    until = dates.at(-1) ?? date;
  const schedule = useApi<Items<Occurrence>>(
      teacher ? `/me/schedule?from=${from}&until=${until}` : null,
    ),
    planning = useApi<Planning>(!teacher && courseId ? `/courses/${courseId}/planning` : null),
    subjects = useApi<Items<Subject>>(
      !teacher && courseId ? `/courses/${courseId}/subjects?limit=100` : null,
    ),
    teachers = useApi<Items<User>>(!teacher && courseId ? `/courses/${courseId}/teachers` : null),
    holidays = useHolidays(Number(date.slice(0, 4)), showHolidays);
  const inShift = (instant: string) => shift === 'ALL' || lessonDayPart(instant).id === shift;
  const pins: Pin[] = teacher
    ? (schedule.data?.items ?? []).map((o) => ({
        id: o.id,
        date: o.date,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        subject: o.subjectName,
        teacher: o.groupName,
        course: o.courseName,
        status: o.status,
        occurrence: o,
      }))
    : (planning.data?.allocations ?? []).flatMap((a) =>
        a.slots
          .filter((slot) => slot.date >= from && slot.date <= until)
          .map((slot) => ({
            id: `${a.id}:${slot.startsAt}`,
            date: slot.date,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            subject: subjects.data?.items.find((v) => v.id === a.subjectId)?.name ?? 'Disciplina',
            teacher: teachers.data?.items.find((t) => t.id === a.teacherId)?.name ?? 'Professor',
            status: a.state,
            allocation: a,
          })),
      );
  const shownPins = pins.filter((pin) => dates.includes(pin.date) && inShift(pin.startsAt));
  const disciplines = teacher
    ? [
        ...new Map(
          pins
            .filter((pin) => dates.includes(pin.date))
            .map((pin) => [`${pin.course}:${pin.subject}`, pin]),
        ).values(),
      ].sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR'))
    : [];
  async function drop(to: string) {
    const source = drag;
    setDrag(null);
    if (!source || to === source.date) return;
    await action.run(async () => {
      if (to < today || source.date < today)
        throw new Error('Datas passadas são somente para consulta.');
      const a = source.allocation;
      await api(`/courses/${courseId}/allocations/${a.id}`, {
        method: 'PUT',
        body: {
          expectedVersion: a.version,
          data: {
            offeringId: a.offeringId,
            teacherId: a.teacherId,
            meetings: moveMeeting(a, source.date, to),
          },
        },
      });
      planning.refresh();
    }, 'Encontro movido no rascunho. Publique a revisão para atualizar a escala do professor.');
  }
  const navigate = (delta: number) => {
    if (view === 'MONTH') {
      const d = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + delta);
      setDate(d.toISOString().slice(0, 10));
    } else {
      const next = addDate(date, delta * (view === 'WEEK' ? 7 : 1));
      setDate(view === 'DAY' && weekday(next) === 7 ? addDate(next, delta) : next);
    }
  };
  return (
    <>
      <Heading
        title={teacher ? 'Meu calendário' : 'Calendário do curso'}
        description={
          teacher
            ? 'Sua escala publicada pela coordenação. Selecione uma aula para consultar os detalhes.'
            : 'Arraste um encontro ou abra o cartão para editar. A publicação é feita em Alocações.'
        }
      >
        {!teacher && (
          <Button disabled={!courseId} onClick={() => setEditing(null)}>
            <Icon name="plus" />
            Nova alocação
          </Button>
        )}
      </Heading>
      <div className={teacher ? c.surface : undefined}>
        <Panel>
          <div className={`${s.calendarControls} ${teacher ? c.controls : ''}`}>
            <div className={s.calendarNavigation}>
              <Button
                variant="secondary"
                aria-label="Período anterior"
                onClick={() => navigate(-1)}
              >
                <Icon name="arrowLeft" />
              </Button>
              <Button variant="secondary" onClick={() => setDate(today)}>
                Hoje
              </Button>
              <Button variant="secondary" aria-label="Próximo período" onClick={() => navigate(1)}>
                <Icon name="arrowRight" />
              </Button>
            </div>
            <TextField
              label="Data de referência"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
            <Select
              label="Visualização"
              value={view}
              items={[
                { id: 'MONTH', name: 'Mês' },
                { id: 'WEEK', name: 'Semana' },
                { id: 'DAY', name: 'Dia' },
              ]}
              onChange={setView}
            />
            <fieldset className={s.shiftFilter}>
              <legend>Turno</legend>
              <div className={s.shiftSegments}>
                {calendarShiftOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={shift === option.id}
                    onClick={() => setShift(option.id)}
                  >
                    <Icon name={option.icon} size={18} />
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className={teacher ? c.period : undefined}>
            <h2>
              {view === 'WEEK'
                ? teacher && from.slice(0, 7) === until.slice(0, 7)
                  ? `${Number(from.slice(8))}–${new Date(`${until}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : `${dayLabel(from)} a ${dayLabel(until)}`
                : view === 'DAY'
                  ? dayLabel(date)
                  : new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
            </h2>
            <LoadingError
              loading={teacher ? schedule.loading : planning.loading}
              error={teacher ? schedule.error : planning.error}
              retry={teacher ? schedule.refresh : planning.refresh}
            />
            <ActionFeedback action={action} />
            {teacher && dates.length > 0 && schedule.data && !schedule.error && (
              <p className={`${s.calendarSummary} ${c.summary}`}>
                <Icon name="calendar" size={18} />
                {shownPins.length} {shownPins.length === 1 ? 'aula no período' : 'aulas no período'}
                <span>Somente sua escala publicada</span>
              </p>
            )}
            {teacher && disciplines.length > 0 && !schedule.loading && !schedule.error && (
              <ul className={c.legend} aria-label="Disciplinas no período">
                {disciplines.map((pin) => (
                  <li
                    key={`${pin.course}:${pin.subject}`}
                    data-tone={calendarSubjectTone(pin.course ?? '', pin.subject)}
                    title={pin.course}
                  >
                    <i aria-hidden="true" />
                    {pin.subject}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {dates.length === 0 && (
            <p className={s.empty}>
              Selecione uma data de segunda a sábado para consultar as aulas.
            </p>
          )}
          {dates.length > 0 && (
            <>
              {teacher && view !== 'DAY' && (
                <p className={c.scrollHint}>Deslize o calendário para consultar os outros dias.</p>
              )}
              <div className={s.calendarScroll}>
                <div
                  className={`${s.calendar} ${teacher ? c.grid : ''} ${teacher && view !== 'MONTH' ? c.week : ''}`}
                  style={
                    view === 'DAY'
                      ? { gridTemplateColumns: 'minmax(260px,1fr)', minWidth: 260 }
                      : undefined
                  }
                >
                  {view !== 'DAY' &&
                    ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day) => (
                      <div className={`${s.dayHeader} ${teacher ? c.weekday : ''}`} key={day}>
                        {day}
                      </div>
                    ))}
                  {dates.map((day) => (
                    <section
                      className={`${s.day} ${teacher ? c.day : ''}`}
                      key={day}
                      data-today={day === today}
                      data-outside-month={view === 'MONTH' && day.slice(0, 7) !== date.slice(0, 7)}
                      aria-label={dayLabel(day)}
                      onDragOver={(e) => {
                        if (drag && day >= today) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        void drop(day);
                      }}
                    >
                      {teacher ? (
                        <div className={c.dateRow}>
                          <span
                            className={c.dayNumber}
                            aria-current={day === today ? 'date' : undefined}
                          >
                            {Number(day.slice(8))}
                          </span>
                          {day === today && <small>Hoje</small>}
                        </div>
                      ) : (
                        <span className={s.muted}>
                          {Number(day.slice(8))}
                          {day < today ? ' · Consulta' : ''}
                        </span>
                      )}
                      {holidays.items
                        .filter((h) => h.date === day)
                        .map((h) => (
                          <span key={h.name} className={s.holiday}>
                            {h.name}
                          </span>
                        ))}
                      {shownPins
                        .filter((p) => p.date === day)
                        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                        .map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            className={`${s.pin} ${teacher ? c.card : ''}`}
                            data-tone={
                              teacher ? calendarSubjectTone(p.course ?? '', p.subject) : undefined
                            }
                            data-status={p.status}
                            draggable={!teacher && day >= today}
                            onDragStart={(e) => {
                              if (p.allocation) {
                                setDrag({ allocation: p.allocation, date: day });
                                e.dataTransfer.setData('text/plain', p.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }
                            }}
                            onDragEnd={() => setDrag(null)}
                            onClick={() =>
                              p.allocation
                                ? setEditing(p.allocation)
                                : setSelected(p.occurrence ?? null)
                            }
                          >
                            {teacher && (
                              <div className={c.paperIllustration} aria-hidden="true">
                                <StudyIllustration
                                  scene={
                                    lessonDayPart(p.startsAt).id === 'MORNING'
                                      ? 'morning'
                                      : lessonDayPart(p.startsAt).id === 'AFTERNOON'
                                        ? 'afternoon'
                                        : 'night'
                                  }
                                />
                                <span>{lessonDayPart(p.startsAt).label}</span>
                              </div>
                            )}
                            <strong className={s.pinTime}>
                              <span
                                role="img"
                                aria-label={lessonDayPart(p.startsAt).label}
                                title={lessonDayPart(p.startsAt).label}
                              >
                                <Icon name={lessonDayPart(p.startsAt).icon} size={16} />
                              </span>
                              {timeLabel(p.startsAt)}–{timeLabel(p.endsAt)}
                            </strong>
                            <span className={teacher ? c.subject : undefined}>{p.subject}</span>
                            {p.course && !teacher && <small>{p.course}</small>}
                            <small className={teacher ? c.group : undefined}>{p.teacher}</small>
                            <small className={teacher ? c.status : undefined}>
                              {p.status === 'DRAFT'
                                ? 'Rascunho'
                                : p.status === 'PUBLISHED'
                                  ? 'Publicado'
                                  : p.status === 'PLANNED'
                                    ? 'Prevista'
                                    : p.status === 'CANCELLED'
                                      ? 'Cancelada'
                                      : p.status === 'COMPLETED'
                                        ? 'Realizada'
                                        : 'Remarcada'}
                            </small>
                          </button>
                        ))}
                      {teacher &&
                        view !== 'MONTH' &&
                        !schedule.loading &&
                        !schedule.error &&
                        !shownPins.some((p) => p.date === day) && (
                          <span className={`${s.freeDay} ${c.empty}`}>
                            {shift === 'ALL' ? 'Sem aulas' : 'Sem aulas neste turno'}
                          </span>
                        )}
                    </section>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className={teacher ? c.footer : undefined}>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={showHolidays}
                onChange={(e) => setHolidays(e.target.checked)}
              />
              Mostrar feriados de referência
            </label>
            <p className={s.muted}>
              Exibição de segunda a sábado. Feriados não cancelam aulas automaticamente. Fuso
              America/Fortaleza.
            </p>
          </div>
        </Panel>
      </div>
      {showHolidays && (
        <HolidayNotice
          items={holidays.items.filter((h) => h.date >= from && h.date <= until)}
          status={holidays.status}
          onRefresh={holidays.refresh}
        />
      )}
      <Modal
        open={editing !== undefined}
        size="wide"
        title="Editar alocação do calendário"
        onClose={() => setEditing(undefined)}
      >
        {editing !== undefined && (
          <AllocationForm
            record={editing}
            onSaved={() => {
              setEditing(undefined);
              planning.refresh();
            }}
          />
        )}
      </Modal>
      <Modal open={!!selected} title="Detalhes da aula" onClose={() => setSelected(null)}>
        {selected && (
          <>
            <h2>{selected.subjectName}</h2>
            <p>
              {selected.courseName} · {selected.groupName}
            </p>
            <p>
              {dayLabel(selected.date)} · {timeLabel(selected.startsAt)}–
              {timeLabel(selected.endsAt)}
            </p>
            <Badge value={selected.status} />
            {selected.absencePending && (
              <p>Há uma comunicação de ausência aplicável a este período.</p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
