import { useState, type ReactNode } from 'react';
import { StudyIllustration } from '../components/illustrations/StudyIllustration';
import { Icon } from '../components/ui/Icon/Icon';
import { Badge, ApiModal } from './ui';
import { dayLabel, timeLabel, today } from './dates';
import { calendarSubjectTone } from './calendarColors';
import { lessonDayPart } from './calendarShifts';
import type { ProfileData, Occurrence } from './types';
import s from './TeacherAgenda.module.css';
import { RoomLabel } from './RoomLabel';

const shiftScene = (shift: string) =>
  shift === 'MORNING' ? 'morning' : shift === 'AFTERNOON' ? 'afternoon' : 'night';
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function TeacherNote({
  scene,
  title,
  children,
}: {
  scene: 'history' | 'document' | 'morning';
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={s.note}>
      <StudyIllustration scene={scene} />
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function AvailabilityBoard({ data }: { data: ProfileData }) {
  const windows = data.availability?.windows ?? [];
  const days = windows.some((window) => window.weekday === 7) ? weekdays : weekdays.slice(0, 6);
  return (
    <>
      <div className={s.availabilitySummary}>
        <div>
          <span>Situação informada</span>
          <strong>
            {data.availability?.status === 'PROVIDED'
              ? 'Horários definidos'
              : data.availability?.status === 'NONE'
                ? 'Sem disponibilidade'
                : 'Ainda não informada'}
          </strong>
        </div>
        <div>
          <span>Dedicação pretendida</span>
          <strong>
            {data.desiredWeeklyMinutes == null
              ? 'Opcional · não definida'
              : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(data.desiredWeeklyMinutes / 60)} h por semana`}
          </strong>
        </div>
        <p>
          <Icon name="calendar" size={18} />A coordenação monta e publica sua escala.
        </p>
      </div>
      <div className={s.weekBoard}>
        {days.map((day, index) => {
          const slots = windows
            .filter((window) => window.weekday === index + 1)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          return (
            <section
              key={day}
              className={s.weekDay}
              aria-label={`Disponibilidade de ${day.toLocaleLowerCase('pt-BR')}`}
            >
              <header>
                <h3>{day}</h3>
                <span>
                  {slots.length
                    ? `${slots.length} ${slots.length === 1 ? 'faixa' : 'faixas'}`
                    : 'Livre de registros'}
                </span>
              </header>
              {slots.length === 0 ? (
                <p className={s.emptyDay}>Nenhum horário informado.</p>
              ) : (
                slots.map((slot) => {
                  const shift =
                    Number(slot.startsAt.slice(0, 2)) < 12
                      ? 'MORNING'
                      : Number(slot.startsAt.slice(0, 2)) < 18
                        ? 'AFTERNOON'
                        : 'NIGHT';
                  return (
                    <div
                      className={s.window}
                      key={slot.id}
                      data-expired={slot.validUntil < today()}
                    >
                      <StudyIllustration scene={shiftScene(shift)} />
                      <div>
                        <strong>
                          {slot.startsAt}–{slot.endsAt}
                        </strong>
                        <span>
                          {shift === 'MORNING'
                            ? 'Manhã'
                            : shift === 'AFTERNOON'
                              ? 'Tarde'
                              : 'Noite'}
                        </span>
                      </div>
                      <small>
                        {dayLabel(slot.validFrom)} a {dayLabel(slot.validUntil)}
                      </small>
                      {slot.validUntil < today() && <small>Vigência encerrada</small>}
                    </div>
                  );
                })
              )}
            </section>
          );
        })}
      </div>
      <p className={s.caption}>
        Os horários representam sua intenção de disponibilidade. Consulte as aulas confirmadas no
        calendário. Fuso America/Fortaleza.
      </p>
    </>
  );
}

export function HistoryTimeline({ items }: { items: Occurrence[] }) {
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const visible = items.filter(
    (item) =>
      filter === 'ALL' ||
      (filter === 'PLANNED' ? item.status === 'PLANNED' : item.status === filter),
  );
  const dates = [...new Set(visible.map((item) => item.date))];
  return (
    <>
      <div className={s.historyToolbar}>
        <div className={s.filters} aria-label="Situação das aulas">
          {[
            ['ALL', 'Todas'],
            ['COMPLETED', 'Realizadas'],
            ['PLANNED', 'A confirmar'],
            ['CANCELLED', 'Canceladas'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value!)}
            >
              {label}
            </button>
          ))}
        </div>
        <span>
          {items.length} {items.length === 1 ? 'aula nesta página' : 'aulas nesta página'}
        </span>
      </div>
      {visible.length === 0 ? (
        <div className={s.emptyHistory}>
          <StudyIllustration scene="history" />
          <h3>
            {items.length ? 'Nenhuma aula nesse filtro' : 'Seu histórico começa com suas aulas'}
          </h3>
          <p>
            {items.length
              ? 'Escolha outra situação para consultar os registros desta página.'
              : 'Os encontros publicados aparecem aqui após a data da aula. A realização é confirmada pela coordenação.'}
          </p>
        </div>
      ) : (
        <ol className={s.timeline}>
          {dates.map((date) => (
            <li className={s.timelineDay} key={date}>
              <div className={s.dateStamp}>
                <strong>{Number(date.slice(8))}</strong>
                <span>
                  {new Date(`${date}T12:00:00Z`)
                    .toLocaleDateString('pt-BR', { month: 'short' })
                    .replace('.', '')}
                </span>
              </div>
              <section className={s.historyDay} aria-label={dayLabel(date)}>
                <h3>
                  {new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                {visible
                  .filter((item) => item.date === date)
                  .map((item) => (
                    <button
                      className={s.historyLesson}
                      type="button"
                      key={item.id}
                      onClick={() => setSelected(item)}
                      data-tone={calendarSubjectTone(item.courseName, item.subjectName)}
                    >
                      <span className={s.historyShift}>
                        <Icon name={lessonDayPart(item.startsAt).icon} size={20} />
                        <span>
                          {timeLabel(item.startsAt)}–{timeLabel(item.endsAt)}
                        </span>
                      </span>
                      <span className={s.historySubject}>
                        <strong>{item.subjectName}</strong>
                        <span>
                          {item.courseName} · {item.groupName}
                        </span>
                        <RoomLabel room={item.room} />
                      </span>
                      <Badge value={item.displayStatus ?? item.status} />
                      <Icon name="arrowRight" size={18} />
                    </button>
                  ))}
              </section>
            </li>
          ))}
        </ol>
      )}
      <ApiModal open={!!selected} title="Registro da aula" onClose={() => setSelected(null)}>
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
            <Badge value={selected.displayStatus ?? selected.status} />
            <p>
              <RoomLabel room={selected.room} />
            </p>
            <p>
              {selected.status === 'COMPLETED'
                ? 'Realização confirmada no registro da coordenação.'
                : selected.status === 'PLANNED'
                  ? 'A passagem do horário não confirma a realização da aula. O registro aguarda confirmação.'
                  : 'A situação foi registrada no acompanhamento da escala.'}
            </p>
          </>
        )}
      </ApiModal>
    </>
  );
}
