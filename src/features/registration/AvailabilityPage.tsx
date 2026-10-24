import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader/PageHeader';
import { Button } from '../../components/ui/Button/Button';
import { TextField } from '../../components/ui/TextField/TextField';
import { Alert } from '../../components/ui/Alert/Alert';
import { useAuth } from '../auth/session/useAuth';
import { saveDemoAvailability, useDemoProfiles } from './demoService';
import { weekdays } from './catalog';
import type { TeacherProfile } from './model';
import styles from './AvailabilityPage.module.css';
function AvailabilityEditor({
  profile,
  onSaved,
}: {
  profile: TeacherProfile;
  onSaved: () => void;
}) {
  const [base, setBase] = useState(profile);
  const [windows, setWindows] = useState(() => profile.availability.map((item) => ({ ...item })));
  const [hours, setHours] = useState(profile.weeklyHours);
  const [day, setDay] = useState(0);
  const [start, setStart] = useState('18:30');
  const [end, setEnd] = useState('21:10');
  const [error, setError] = useState('');
  function add() {
    if (windows.length >= 30) {
      setError('Você pode informar até 30 horários.');
      return;
    }
    if (!start || !end || start >= end) {
      setError('O término precisa ser posterior ao início, no mesmo dia.');
      return;
    }
    if (windows.some((item) => item.weekday === day && start < item.end && item.start < end)) {
      setError('Esse horário se sobrepõe a outro do mesmo dia.');
      return;
    }
    setWindows([...windows, { id: crypto.randomUUID(), weekday: day, start, end }]);
    setError('');
  }
  function save(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = saveDemoAvailability(base.email, windows, hours, base.version);
      setBase(saved);
      setError('');
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
    }
  }
  return (
    <form onSubmit={save} className={styles.layout}>
      <section className={styles.week} aria-label="Horários disponíveis">
        <header>
          <div>
            <h2>Horários disponíveis na semana</h2>
            <p>Adicione os horários em que você pode dar aula.</p>
          </div>
          <span>
            {windows.length} {windows.length === 1 ? 'horário' : 'horários'}
          </span>
        </header>
        {weekdays.map((label, index) => (
          <div className={styles.day} key={label}>
            <strong>{label}</strong>
            <div>
              {windows
                .filter((item) => item.weekday === index)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((item) => (
                  <span className={styles.window} key={item.id}>
                    <span>
                      {item.start} — {item.end}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remover horário de ${label} às ${item.start}`}
                      onClick={() => setWindows(windows.filter((window) => window.id !== item.id))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              {!windows.some((item) => item.weekday === index) && (
                <span className={styles.none}>Sem horário informado</span>
              )}
            </div>
          </div>
        ))}
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => {
              setBase(profile);
              setWindows(profile.availability.map((item) => ({ ...item })));
              setHours(profile.weeklyHours);
              setError('');
            }}
          >
            Restaurar dados salvos
          </Button>
          <Button type="submit">Salvar disponibilidade</Button>
        </div>
      </section>
      <aside className={styles.editor}>
        <h2>Adicionar horário</h2>
        <p>Você pode informar mais de um intervalo por dia.</p>
        {base.version !== profile.version && (
          <Alert variant="error">
            Seu perfil mudou em outra tela. Confira os dados salvos antes de continuar.
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <label className={styles.select}>
          Dia da semana
          <select value={day} onChange={(event) => setDay(Number(event.target.value))}>
            {weekdays.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.times}>
          <TextField
            label="Disponível a partir de"
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
          <TextField
            label="Disponível até"
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={add}>
          Adicionar à semana
        </Button>
        <div className={styles.hours}>
          <TextField
            label="Horas semanais pretendidas"
            type="number"
            min="1"
            max="168"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            hint="Sua preferência de dedicação. O limite contratual é definido pela instituição."
          />
        </div>
        <p className={styles.note}>
          Adicionar ou remover um horário prepara a edição. Use Salvar disponibilidade para
          confirmar. Isso não altera aulas já publicadas.
        </p>
      </aside>
    </form>
  );
}
export function AvailabilityPage() {
  const { session } = useAuth();
  const { profiles, error } = useDemoProfiles();
  const profile = profiles.find((item) => item.email === session?.email);
  const [message, setMessage] = useState('');
  return (
    <section className={styles.page}>
      <title>Minha disponibilidade | ProFly</title>
      <PageHeader
        title="Minha disponibilidade"
        titleId="availability-title"
        actions={
          <Link className={styles.back} to="/inicio">
            Voltar ao início
          </Link>
        }
      />
      <p className={styles.intro}>
        Mantenha seus horários atualizados para ajudar a coordenação a organizar as aulas.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {profile ? (
        <AvailabilityEditor
          key={profile.id}
          profile={profile}
          onSaved={() =>
            setMessage('Disponibilidade salva. Seus vínculos e solicitações foram preservados.')
          }
        />
      ) : (
        <div className={styles.missing}>
          <h2>Perfil docente não encontrado</h2>
          <p>Esta conta ainda não possui os dados de cadastro neste navegador.</p>
          <Link to="/conta">Conferir minha conta</Link>
        </div>
      )}
    </section>
  );
}
