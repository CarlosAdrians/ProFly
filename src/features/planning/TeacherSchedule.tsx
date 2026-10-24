import { Link } from 'react-router';
import type { Availability } from '../registration/model';
import { useInstitutionToday } from './institutionDate';
import { intendedWindows } from './availabilityCalendar';
import type { Shift } from './service';
import styles from './TeacherSchedule.module.css';

export function TeacherSchedule({
  dates,
  availability,
  shift,
  showIntended,
}: {
  dates: string[];
  availability: Availability[];
  shift: Shift;
  showIntended: boolean;
}) {
  const today = useInstitutionToday();
  return (
    <section className={styles.schedule} aria-label="Agenda do professor no período">
      <header>
        <div>
          <h2>{showIntended ? 'Horários pretendidos no período' : 'Agenda de aulas no período'}</h2>
          <p>
            {showIntended
              ? 'Preferências semanais declaradas. Não representam atribuições de aula.'
              : 'Sua escala ainda não foi publicada pela coordenação.'}
          </p>
        </div>
        <Link to="/disponibilidade">Consultar preferências</Link>
      </header>
      <div
        className={styles.scroll}
        tabIndex={0}
        role="region"
        aria-label="Dias da agenda com rolagem horizontal"
      >
        <div
          className={styles.days}
          style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(140px, 1fr))` }}
        >
          {dates.map((date) => {
            const windows = showIntended ? intendedWindows(availability, date, shift) : [];
            return (
              <article key={date} className={styles.day} data-today={date === today}>
                <h3>
                  <span>
                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(
                      new Date(`${date}T12:00:00`),
                    )}
                  </span>
                  <strong>
                    {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(
                      new Date(`${date}T12:00:00`),
                    )}
                  </strong>
                  {date === today && <small>Hoje</small>}
                </h3>
                {windows.map((item) => (
                  <div className={styles.window} key={item.id}>
                    <span>Pretendido</span>
                    <strong>
                      {item.start}–{item.end}
                    </strong>
                    <small>Preferência declarada</small>
                  </div>
                ))}
                {!windows.length && (
                  <p className={styles.empty}>
                    {showIntended ? 'Sem preferência neste turno' : 'Sem aulas publicadas'}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
