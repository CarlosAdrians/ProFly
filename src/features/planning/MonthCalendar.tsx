import { monthDays } from './calendarDates';
import { type Plan } from './service';
import { useInstitutionToday } from './institutionDate';
import type { Holiday } from './holidays';
import styles from './MonthCalendar.module.css';
import type { Availability } from '../registration/model';
import type { Shift } from './service';
import { intendedWindows } from './availabilityCalendar';

export function MonthCalendar({
  date,
  plans,
  holidays,
  onDay,
  onPlan,
  availability = [],
  shift = 'night',
}: {
  date: string;
  plans: Plan[];
  holidays: Holiday[];
  onDay: (date: string) => void;
  onPlan: (plan: Plan) => void;
  availability?: Availability[];
  shift?: Shift;
}) {
  const days = monthDays(date);
  const today = useInstitutionToday();
  return (
    <div
      className={styles.scroll}
      tabIndex={0}
      role="region"
      aria-label="Grade mensal com rolagem horizontal"
    >
      <div className={styles.grid} role="table" aria-label="Calendário mensal">
        <div className={styles.week} role="row">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
            <div className={styles.heading} role="columnheader" key={day}>
              {day}
            </div>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, week) => (
          <div className={styles.week} role="row" key={week}>
            {days.slice(week * 7, week * 7 + 7).map((day) => {
              const entries = plans
                .filter((plan) => plan.date === day)
                .sort((a, b) => a.start.localeCompare(b.start));
              return (
                <div
                  role="cell"
                  className={styles.day}
                  key={day}
                  data-outside={day.slice(0, 7) !== date.slice(0, 7)}
                  data-selected={day === date}
                  data-weekend={[0, 6].includes(new Date(`${day}T12:00:00`).getDay())}
                >
                  <button
                    type="button"
                    className={styles.dayNumber}
                    data-today={day === today}
                    aria-current={day === today ? 'date' : undefined}
                    onClick={() => onDay(day)}
                    aria-label={`Ver dia ${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${day}T12:00:00`))}`}
                  >
                    {Number(day.slice(8))}
                  </button>
                  {holidays
                    .filter((item) => item.date === day)
                    .map((item) => (
                      <a
                        className={styles.holiday}
                        key={`${item.date}-${item.name}`}
                        href={item.source}
                        target="_blank"
                        rel="noreferrer"
                        title={`${item.scope}: ${item.name}`}
                      >
                        <span className={styles.dot} />
                        {item.name}
                        <small>{item.scope}</small>
                      </a>
                    ))}
                  {entries.map((plan) => (
                    <button
                      type="button"
                      className={styles.event}
                      key={plan.id}
                      onClick={() => onPlan(plan)}
                    >
                      <span>
                        {plan.start} · {plan.group}
                      </span>
                      <strong>{plan.subject}</strong>
                      <small>{plan.teacherName}</small>
                    </button>
                  ))}
                  {intendedWindows(availability, day, shift).map((item) => (
                    <div className={styles.intended} key={item.id}>
                      <span>Pretendido</span>
                      <strong>
                        {item.start}–{item.end}
                      </strong>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
