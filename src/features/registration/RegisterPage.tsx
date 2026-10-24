import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { TextField } from '../../components/ui/TextField/TextField';
import { PasswordField } from '../../components/ui/PasswordField/PasswordField';
import { PhotoField } from '../../components/ui/PhotoField/PhotoField';
import { Button } from '../../components/ui/Button/Button';
import { Alert } from '../../components/ui/Alert/Alert';
import { Modal } from '../../components/ui/Modal/Modal';
import { LegalDocument } from '../legal/LegalDocument';
import { useAuth } from '../auth/session/useAuth';
import { passwordPolicyHint } from '../invites/passwordPolicy';
import { registerDemo } from './demoService';
import { courses, degreeOptions, knowledgeOptions, weekdays } from './catalog';
import { emptyRegistration, type Experience } from './model';
import { validateRegistration, type FieldErrors } from './validation';
import styles from './RegisterPage.module.css';

const steps = ['Sua conta', 'Perfil acadêmico', 'Cursos e horários', 'Revisão'];
function ExperienceFields({
  title,
  value,
  onChange,
  error,
  unit,
}: {
  title: string;
  value: Experience;
  onChange: (value: Experience) => void;
  error?: string;
  unit: 'semestres' | 'meses';
}) {
  return (
    <fieldset className={styles.section}>
      <legend>{title}</legend>
      <label className={styles.selectLabel}>
        Você possui essa experiência?
        <select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as Experience['status'] })}
        >
          <option value="UNKNOWN">Selecione uma opção</option>
          <option value="NONE">Ainda não possuo</option>
          <option value="PROVIDED">Sim, possuo experiência</option>
        </select>
      </label>
      {value.status === 'PROVIDED' && (
        <div className={styles.grid}>
          <TextField
            label={unit === 'semestres' ? 'Instituição de ensino' : 'Empresa ou organização'}
            value={value.organization}
            maxLength={100}
            onChange={(e) => onChange({ ...value, organization: e.target.value })}
          />
          <TextField
            label={
              unit === 'semestres' ? 'Disciplinas ou área de ensino' : 'Função ou área de atuação'
            }
            value={value.activity}
            maxLength={100}
            onChange={(e) => onChange({ ...value, activity: e.target.value })}
          />
          <TextField
            label={`Tempo de experiência (${unit} completos)`}
            value={value.units}
            type="number"
            min={1}
            max={unit === 'semestres' ? 80 : 1200}
            onChange={(e) => onChange({ ...value, units: e.target.value })}
          />
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </fieldset>
  );
}
export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [data, setData] = useState(emptyRegistration);
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [legal, setLegal] = useState<'terms' | 'privacy' | null>(null);
  const [knowledgeName, setKnowledgeName] = useState('');
  const [level, setLevel] = useState(3);
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState('18:30');
  const [end, setEnd] = useState('21:10');
  const title = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  function go(next: number) {
    setStep(next);
    setErrors({});
    setMessage('');
    requestAnimationFrame(() => {
      title.current?.focus();
      title.current?.scrollIntoView({ block: 'start' });
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const invalid = validateRegistration(data, step, password, confirmation, terms, privacy);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setMessage('Confira os campos destacados para continuar.');
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>(
            '[aria-invalid="true"], [data-error="true"] input, [data-error="true"] select',
          )
          ?.focus(),
      );
      return;
    }
    if (step < 3) {
      go(step + 1);
      return;
    }
    setLoading(true);
    try {
      await registerDemo(data, password, confirmation, terms, privacy);
      await login(data.email, password);
      navigate('/inicio', { replace: true });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar sua conta. Seus campos foram preservados.',
      );
    } finally {
      setLoading(false);
    }
  }
  function addKnowledge() {
    if (!knowledgeName) {
      setErrors((old) => ({ ...old, knowledge: 'Selecione um conhecimento antes de adicionar.' }));
      return;
    }
    if (data.knowledge.some((item) => item.name === knowledgeName)) {
      setErrors((old) => ({ ...old, knowledge: 'Esse conhecimento já foi adicionado.' }));
      return;
    }
    setData({
      ...data,
      knowledge: [...data.knowledge, { id: crypto.randomUUID(), name: knowledgeName, level }],
    });
    setKnowledgeName('');
    setErrors((old) => ({ ...old, knowledge: '' }));
  }
  function addAvailability() {
    const windows = [...data.availability, { id: crypto.randomUUID(), weekday, start, end }];
    const invalid = validateRegistration({ ...data, availability: windows }, 2).availability;
    if (invalid) {
      setErrors((old) => ({ ...old, availability: invalid }));
      return;
    }
    setData({ ...data, availability: windows });
    setErrors((old) => ({ ...old, availability: '' }));
  }
  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <div className={styles.brand}>
          <img src="/images/unifacisa-symbol.png" alt="Símbolo UNIFACISA" />
          <div>
            <strong>ProFly</strong>
            <span>Gestão docente</span>
          </div>
        </div>
        <div className={styles.asideText}>
          <h2>Seu próximo semestre começa por aqui.</h2>
          <p>Reúna sua formação, seus conhecimentos e seus horários em um só perfil.</p>
          <p className={styles.asideNote}>
            Você solicita os cursos.
            <br />
            Cada coordenação analisa sua entrada.
          </p>
        </div>
        <span className={styles.asideFoot}>UNIFACISA · Projeto acadêmico</span>
      </aside>
      <main className={styles.main}>
        <title>Cadastro de professor | ProFly</title>
        <div className={styles.top}>
          <Link to="/login">Voltar ao login</Link>
          <span>
            Já tem conta? <Link to="/login">Entrar</Link>
          </span>
        </div>
        <div className={styles.card}>
          <header className={styles.header}>
            <h1 ref={title} tabIndex={-1}>
              Cadastro de professor
            </h1>
            <p>Crie sua conta e solicite acesso aos cursos em que deseja atuar.</p>
          </header>
          <ol className={styles.steps} aria-label="Etapas do cadastro">
            {steps.map((label, index) => (
              <li
                key={label}
                aria-current={step === index ? 'step' : undefined}
                data-complete={index < step}
              >
                <span>{index < step ? '✓' : index + 1}</span>
                <strong>{label}</strong>
              </li>
            ))}
          </ol>
          <p className={styles.demo}>
            Demonstração local. Use dados fictícios; o cadastro fica neste navegador.
          </p>
          <form ref={form} noValidate onSubmit={submit}>
            {message && (
              <div className={styles.message}>
                <Alert variant="error">{message}</Alert>
              </div>
            )}
            {step === 0 && (
              <section aria-labelledby="step-account">
                <h2 id="step-account">Vamos começar pela sua conta</h2>
                <p className={styles.description}>
                  O e-mail será usado para entrar no ProFly. Sua solicitação será analisada pela
                  coordenação.
                </p>
                <div className={styles.grid}>
                  <TextField
                    label="Nome completo"
                    value={data.name}
                    autoComplete="name"
                    maxLength={100}
                    error={errors.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                  />
                  <TextField
                    label="E-mail"
                    type="email"
                    value={data.email}
                    autoComplete="email"
                    maxLength={254}
                    error={errors.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                  />
                  <TextField
                    label="Telefone com DDD"
                    type="tel"
                    value={data.phone}
                    autoComplete="tel"
                    maxLength={25}
                    error={errors.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                  />
                  <div className={styles.hintBox}>
                    Você está criando uma conta de <strong>professor</strong>. O acesso de
                    coordenadores é definido pela administração.
                  </div>
                  <PasswordField
                    label="Crie uma senha"
                    value={password}
                    autoComplete="new-password"
                    hint={passwordPolicyHint}
                    error={errors.password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <PasswordField
                    label="Confirme a senha"
                    value={confirmation}
                    autoComplete="new-password"
                    error={errors.confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </div>
                <PhotoField value={data.photo} onChange={(photo) => setData({ ...data, photo })} />
              </section>
            )}
            {step === 1 && (
              <section aria-labelledby="step-profile">
                <h2 id="step-profile">Conte sobre sua trajetória</h2>
                <p className={styles.description}>
                  Essas informações ajudam a coordenação a conhecer seu perfil. Os dados enviados
                  ainda serão analisados.
                </p>
                <fieldset className={styles.section}>
                  <legend>Formação acadêmica</legend>
                  {data.education.map((item, index) => (
                    <div
                      key={item.id}
                      className={styles.repeatBlock}
                      data-error={!!errors[`education-${index}`]}
                    >
                      <div className={styles.grid}>
                        <label className={styles.selectLabel}>
                          Titulação {index + 1}
                          <select
                            value={item.degree}
                            onChange={(e) =>
                              setData({
                                ...data,
                                education: data.education.map((v) =>
                                  v.id === item.id ? { ...v, degree: e.target.value } : v,
                                ),
                              })
                            }
                          >
                            <option value="">Selecione</option>
                            {degreeOptions.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        {(['field', 'institution', 'year'] as const).map((key) => (
                          <TextField
                            key={key}
                            label={`${{ field: 'Curso ou área de formação', institution: 'Instituição', year: 'Ano de conclusão' }[key]} ${index + 1}`}
                            value={item[key]}
                            maxLength={key === 'year' ? 4 : 100}
                            inputMode={key === 'year' ? 'numeric' : undefined}
                            onChange={(e) =>
                              setData({
                                ...data,
                                education: data.education.map((v) =>
                                  v.id === item.id ? { ...v, [key]: e.target.value } : v,
                                ),
                              })
                            }
                          />
                        ))}
                      </div>
                      {errors[`education-${index}`] && (
                        <p className={styles.error}>{errors[`education-${index}`]}</p>
                      )}
                      {data.education.length > 1 && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setData({
                              ...data,
                              education: data.education.filter((v) => v.id !== item.id),
                            })
                          }
                        >
                          Remover formação {index + 1}
                        </Button>
                      )}
                    </div>
                  ))}
                  {data.education.length < 10 && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setData({
                          ...data,
                          education: [
                            ...data.education,
                            {
                              id: crypto.randomUUID(),
                              degree: '',
                              field: '',
                              institution: '',
                              year: '',
                            },
                          ],
                        })
                      }
                    >
                      Adicionar outra formação
                    </Button>
                  )}
                </fieldset>
                <fieldset className={styles.section} data-error={!!errors.knowledge}>
                  <legend>Conhecimentos</legend>
                  <p className={styles.description}>
                    Selecione uma área e declare seu nível. A confirmação será feita na análise.
                  </p>
                  <div className={styles.addRow}>
                    <label className={styles.selectLabel}>
                      Conhecimento
                      <select
                        value={knowledgeName}
                        onChange={(e) => setKnowledgeName(e.target.value)}
                      >
                        <option value="">Selecione um conhecimento</option>
                        {knowledgeOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.selectLabel}>
                      Nível declarado
                      <select value={level} onChange={(e) => setLevel(+e.target.value)}>
                        {[
                          '1 — Básico',
                          '2 — Inicial',
                          '3 — Intermediário',
                          '4 — Avançado',
                          '5 — Especialista',
                        ].map((option, index) => (
                          <option key={option} value={index + 1}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button variant="secondary" onClick={addKnowledge}>
                      Adicionar conhecimento
                    </Button>
                  </div>
                  <ul className={styles.chips}>
                    {data.knowledge.map((item) => (
                      <li key={item.id}>
                        <span>
                          {item.name} <strong>Nível {item.level}</strong>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover ${item.name}`}
                          onClick={() =>
                            setData({
                              ...data,
                              knowledge: data.knowledge.filter((v) => v.id !== item.id),
                            })
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  {errors.knowledge && <p className={styles.error}>{errors.knowledge}</p>}
                </fieldset>
                <ExperienceFields
                  title="Experiência docente"
                  value={data.teaching}
                  onChange={(teaching) => setData({ ...data, teaching })}
                  error={errors.teaching}
                  unit="semestres"
                />
                <ExperienceFields
                  title="Experiência profissional"
                  value={data.professional}
                  onChange={(professional) => setData({ ...data, professional })}
                  error={errors.professional}
                  unit="meses"
                />
              </section>
            )}
            {step === 2 && (
              <section aria-labelledby="step-courses">
                <h2 id="step-courses">Onde e quando você quer atuar?</h2>
                <p className={styles.description}>
                  Selecione seus cursos e disciplinas. Cada solicitação será analisada
                  separadamente.
                </p>
                <fieldset className={styles.section} data-error={!!errors.requests}>
                  <legend>Cursos e disciplinas de interesse</legend>
                  <div className={styles.courseGrid}>
                    {courses.map((course) => {
                      const selected = data.requests.find((item) => item.courseId === course.id);
                      return (
                        <div className={styles.course} key={course.id} data-selected={!!selected}>
                          <label className={styles.courseTitle}>
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={(e) =>
                                setData({
                                  ...data,
                                  requests: e.target.checked
                                    ? [
                                        ...data.requests,
                                        { courseId: course.id, subjects: [], status: 'PENDING' },
                                      ]
                                    : data.requests.filter((v) => v.courseId !== course.id),
                                })
                              }
                            />
                            {course.name}
                          </label>
                          {selected && (
                            <div className={styles.subjects}>
                              {course.subjects.map((subject) => (
                                <label key={subject}>
                                  <input
                                    type="checkbox"
                                    checked={selected.subjects.includes(subject)}
                                    onChange={(e) =>
                                      setData({
                                        ...data,
                                        requests: data.requests.map((item) =>
                                          item.courseId === course.id
                                            ? {
                                                ...item,
                                                subjects: e.target.checked
                                                  ? [...item.subjects, subject]
                                                  : item.subjects.filter((v) => v !== subject),
                                              }
                                            : item,
                                        ),
                                      })
                                    }
                                  />
                                  {subject}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {errors.requests && <p className={styles.error}>{errors.requests}</p>}
                </fieldset>
                <fieldset className={styles.section} data-error={!!errors.availability}>
                  <legend>Disponibilidade semanal</legend>
                  <p className={styles.description}>
                    Horários locais de Campina Grande (America/Fortaleza). Você pode adicionar
                    vários dias e turnos.
                  </p>
                  <div className={styles.addRow}>
                    <label className={styles.selectLabel}>
                      Dia da semana
                      <select value={weekday} onChange={(e) => setWeekday(+e.target.value)}>
                        {weekdays.map((day, index) => (
                          <option key={day} value={index}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </label>
                    <TextField
                      label="Disponível a partir de"
                      type="time"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                    <TextField
                      label="Disponível até"
                      type="time"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                    <Button variant="secondary" onClick={addAvailability}>
                      Adicionar horário
                    </Button>
                  </div>
                  <ul className={styles.chips}>
                    {data.availability.map((item) => (
                      <li key={item.id}>
                        <span>
                          {weekdays[item.weekday]}{' '}
                          <strong>
                            {item.start}–{item.end}
                          </strong>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover horário de ${weekdays[item.weekday]} às ${item.start}`}
                          onClick={() =>
                            setData({
                              ...data,
                              availability: data.availability.filter((v) => v.id !== item.id),
                            })
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  {errors.availability && <p className={styles.error}>{errors.availability}</p>}
                  <TextField
                    label="Dedicação pretendida (horas por semana)"
                    type="number"
                    min={1}
                    max={168}
                    value={data.weeklyHours}
                    error={errors.weeklyHours}
                    hint="Essa é sua preferência. O limite contratual será definido pela instituição."
                    onChange={(e) => setData({ ...data, weeklyHours: e.target.value })}
                  />
                </fieldset>
              </section>
            )}
            {step === 3 && (
              <section aria-labelledby="step-review">
                <h2 id="step-review">Confira antes de criar sua conta</h2>
                <p className={styles.description}>
                  Seu perfil será enviado às coordenações selecionadas. A aprovação em um curso não
                  libera os demais.
                </p>
                <div className={styles.summary}>
                  <div>
                    <strong>{data.name}</strong>
                    <span>{data.email}</span>
                    <span>{data.phone}</span>
                  </div>
                  <Button variant="secondary" onClick={() => go(0)}>
                    Editar conta
                  </Button>
                </div>
                <div className={styles.reviewGrid}>
                  <div>
                    <h3>Perfil acadêmico</h3>
                    <p>
                      {data.education.length} formação(ões) · {data.knowledge.length}{' '}
                      conhecimento(s)
                    </p>
                    <Button variant="secondary" onClick={() => go(1)}>
                      Editar perfil
                    </Button>
                  </div>
                  <div>
                    <h3>Solicitações</h3>
                    {data.requests.map((request) => (
                      <p key={request.courseId}>
                        <strong>
                          {courses.find((course) => course.id === request.courseId)?.name}
                        </strong>
                        <br />
                        {request.subjects.join(', ')}
                      </p>
                    ))}
                    <Button variant="secondary" onClick={() => go(2)}>
                      Editar cursos e horários
                    </Button>
                  </div>
                </div>
                <div className={styles.legal}>
                  <label>
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                    />{' '}
                    <span>
                      Li e aceito os{' '}
                      <button type="button" onClick={() => setLegal('terms')}>
                        Termos de uso
                      </button>{' '}
                      desta demonstração.
                    </span>
                  </label>
                  {errors.terms && <p className={styles.error}>{errors.terms}</p>}
                  <label>
                    <input
                      type="checkbox"
                      checked={privacy}
                      onChange={(e) => setPrivacy(e.target.checked)}
                    />{' '}
                    <span>
                      Li o{' '}
                      <button type="button" onClick={() => setLegal('privacy')}>
                        Aviso de privacidade
                      </button>{' '}
                      e estou ciente de como meus dados são utilizados.
                    </span>
                  </label>
                  {errors.privacy && <p className={styles.error}>{errors.privacy}</p>}
                  <p>
                    A foto é opcional. Não há autorização para publicidade ou uso dos seus dados em
                    treinamento de IA.
                  </p>
                </div>
              </section>
            )}
            <footer className={styles.actions}>
              {step > 0 ? (
                <Button variant="secondary" disabled={loading} onClick={() => go(step - 1)}>
                  Voltar
                </Button>
              ) : (
                <Link to="/login">Já tenho uma conta</Link>
              )}
              <span>Etapa {step + 1} de 4</span>
              <Button type="submit" loading={loading} loadingText="Criando conta…">
                {step === 3 ? 'Criar conta e solicitar acesso' : 'Continuar'}
              </Button>
            </footer>
          </form>
        </div>
        <p className={styles.footer}>ProFly · Professores, cursos e horários em um só lugar.</p>
      </main>
      <Modal
        open={legal !== null}
        size="wide"
        title={legal === 'terms' ? 'Termos de uso' : 'Aviso de privacidade'}
        onClose={() => setLegal(null)}
      >
        {legal && (
          <>
            <LegalDocument kind={legal} />
            <Button variant="secondary" onClick={() => setLegal(null)}>
              Voltar ao cadastro
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}
