import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader/PageHeader';
import { Alert } from '../../components/ui/Alert/Alert';
import { applyTheme, preferredDark, THEME_KEY } from '../../components/ui/ThemeToggle/theme';
import { useAuth } from '../auth/session/useAuth';
import { savePreferences, usePreferences, type CalendarPreferences } from './preferences';
import styles from './SettingsPage.module.css';
function themeChoice() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    /* OS default. */
  }
  return 'system';
}
export function SettingsPage() {
  const { session } = useAuth();
  const preferences = usePreferences(session?.email ?? '', session?.role === 'teacher');
  const [theme, setTheme] = useState(themeChoice);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => setTheme(themeChoice());
    window.addEventListener('profly:theme-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('profly:theme-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  function chooseTheme(value: string) {
    try {
      if (value === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, value);
      applyTheme(preferredDark());
      setTheme(value);
      setError('');
      setMessage('Aparência atualizada.');
      window.dispatchEvent(new Event('profly:theme-changed'));
    } catch {
      setError('Não foi possível guardar a aparência neste navegador.');
    }
  }
  function change(changes: Partial<CalendarPreferences>) {
    try {
      savePreferences(session?.email ?? '', { ...preferences, ...changes });
      setError('');
      setMessage('Preferências do calendário salvas.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
    }
  }
  return (
    <section className={styles.page}>
      <title>Configurações | ProFly</title>
      <PageHeader title="Configurações" titleId="settings-title" />
      <p className={styles.intro}>
        Deixe seu espaço de trabalho do seu jeito. As preferências ficam neste navegador.
      </p>
      <div aria-live="polite">
        {error ? (
          <Alert variant="error">{error}</Alert>
        ) : (
          message && <Alert variant="success">{message}</Alert>
        )}
      </div>
      <div className={styles.layout}>
        <div>
          <section className={styles.group} aria-labelledby="appearance-title">
            <div className={styles.groupHeader}>
              <span className={styles.groupIcon} aria-hidden="true">
                ◐
              </span>
              <div>
                <h2 id="appearance-title">Aparência</h2>
                <p>Conforto para estudar e planejar.</p>
              </div>
            </div>
            <div className={styles.setting}>
              <div>
                <strong>Tema da interface</strong>
                <p>A opção Sistema acompanha a aparência do dispositivo.</p>
              </div>
              <div className={styles.themes} role="group" aria-label="Tema da interface">
                {[
                  ['light', 'Claro'],
                  ['dark', 'Escuro'],
                  ['system', 'Sistema'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={theme === value}
                    onClick={() => chooseTheme(value)}
                  >
                    <span className={styles.swatch} data-theme={value} aria-hidden="true">
                      <i />
                      <i />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>
          <section className={styles.group} aria-labelledby="calendar-settings-title">
            <div className={styles.groupHeader}>
              <span className={styles.groupIcon} aria-hidden="true">
                ▦
              </span>
              <div>
                <h2 id="calendar-settings-title">Calendário</h2>
                <p>Escolha como sua agenda abre.</p>
              </div>
            </div>
            <label className={styles.setting}>
              <span>
                <strong>Visualização inicial</strong>
                <span className={styles.help}>Aplicada ao abrir o calendário novamente.</span>
              </span>
              <select
                value={preferences.view}
                onChange={(e) => change({ view: e.target.value as CalendarPreferences['view'] })}
              >
                <option value="month">Mês</option>
                <option value="week">Semana</option>
                <option value="day">Dia</option>
              </select>
            </label>
            <label className={styles.setting}>
              <span>
                <strong>Turno inicial</strong>
                <span className={styles.help}>Não altera sua disponibilidade declarada.</span>
              </span>
              <select
                value={preferences.shift}
                onChange={(e) => change({ shift: e.target.value as CalendarPreferences['shift'] })}
              >
                <option value="morning">Manhã</option>
                <option value="afternoon">Tarde</option>
                <option value="night">Noite</option>
              </select>
            </label>
            <div className={styles.setting}>
              <div>
                <strong>Mostrar feriados</strong>
                <p>Inclui datas nacionais e a referência estadual da Paraíba.</p>
              </div>
              <button
                type="button"
                className={styles.switch}
                role="switch"
                aria-label="Mostrar feriados"
                aria-checked={preferences.showHolidays}
                onClick={() => change({ showHolidays: !preferences.showHolidays })}
              >
                <span />
              </button>
            </div>
          </section>
        </div>
        <aside>
          <section className={styles.group}>
            <h2>Sua conta</h2>
            <p>Atualize seu nome, contato e foto.</p>
            <Link to="/conta">Abrir meus dados</Link>
          </section>
          <section className={styles.group}>
            <h2>Privacidade e termos</h2>
            <p>Consulte como as informações são utilizadas nesta versão.</p>
            <Link to="/privacidade">Aviso de privacidade</Link>
            <Link to="/termos-de-uso">Termos de uso</Link>
          </section>
          <p className={styles.footnote}>
            Os horários são apresentados no fuso da Paraíba. Preferências de aparência não alteram
            aulas ou decisões acadêmicas.
          </p>
        </aside>
      </div>
    </section>
  );
}
