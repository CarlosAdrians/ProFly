import { useAction } from './actions';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { AuthLayout } from '../layouts/AuthLayout/AuthLayout';
import { Button } from '../components/ui/Button/Button';
import { TextField } from '../components/ui/TextField/TextField';
import { PasswordField } from '../components/ui/PasswordField/PasswordField';
import { Icon } from '../components/ui/Icon/Icon';
import { ApiModal as Modal } from './ui';
import { LegalDocument } from '../features/legal/LegalDocument';
import { LEGAL_VERSION } from '../features/legal/content';
import { isValidPhone } from '../utils/phone';
import { api } from './api';
import { useApi, useApiSession } from './hooks';
import type { CatalogItem, Items, ProfileData } from './types';
import { ActionFeedback, LoadingError, Panel } from './ui';
import { ProfileFields } from './ProfileFields';
import { emptyProfile } from './profileModel';
import authStyles from '../features/auth/pages/AuthForm.module.css';
import s from './Portal.module.css';
export function ApiLoginPage() {
  const auth = useApiSession(),
    navigate = useNavigate(),
    action = useAction();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  if (auth.user) return <Navigate to="/inicio" replace />;
  return (
    <AuthLayout variant="split">
      <title>Login | ProFly</title>
      <h1 className={`${authStyles.title} ${authStyles.loginTitle}`}>Acesso ao ProFly</h1>
      <p className={authStyles.register}>
        <Link className={authStyles.link} to="/cadastro">
          <Icon name="userPlus" size={17} />
          Cadastrar
        </Link>
      </p>
      <form
        className={authStyles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await auth.login(email, password);
            navigate('/inicio', { replace: true });
          });
        }}
      >
        <ActionFeedback action={action} />
        <TextField
          label="E-mail:"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Senha:"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className={authStyles.actions}>
          <Link className={authStyles.link} to="/esqueceu-senha">
            Esqueceu senha
          </Link>
          <Button type="submit" loading={action.busy} loadingText="Entrando…">
            <Icon name="login" />
            Login
          </Button>
        </div>
      </form>
      <footer className={authStyles.legalLinks}>
        <Link to="/termos">Termos de uso</Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacidade">Privacidade</Link>
      </footer>
    </AuthLayout>
  );
}
export function ApiForgotPage() {
  const [email, setEmail] = useState(''),
    action = useAction();
  return (
    <AuthLayout variant="backdrop">
      <title>Recuperar senha | ProFly</title>
      <h1>Recuperar senha</h1>
      <p className={s.muted}>Informe seu e-mail. O link é de uso único e válido por uma hora.</p>
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const response = await api<{ message: string }>('/auth/forgot-password', {
              method: 'POST',
              body: { email },
            });
            action.setMessage(response.message);
          });
        }}
      >
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ActionFeedback action={action} />
        <Button type="submit" loading={action.busy}>
          Solicitar recuperação
        </Button>
        <Link to="/login">Voltar ao login</Link>
      </form>
    </AuthLayout>
  );
}
function TokenForm({ kind }: { kind: 'verify' | 'reset' | 'invite' }) {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  const [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [done, setDone] = useState(false),
    [email, setEmail] = useState('');
  const action = useAction(),
    auth = useApiSession();
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  const valid = /^[a-f0-9]{64}$/.test(token),
    newPassword = kind !== 'verify';
  return (
    <AuthLayout variant="backdrop">
      <title>{kind === 'verify' ? 'Confirmar e-mail' : 'Definir senha'} | ProFly</title>
      <h1>
        {kind === 'verify'
          ? 'Confirmar meu e-mail'
          : kind === 'invite'
            ? 'Ativar meu acesso'
            : 'Redefinir minha senha'}
      </h1>
      {done ? (
        <>
          <p role="status">
            {kind === 'verify'
              ? 'E-mail confirmado. Sua entrada nos cursos continua sujeita à análise da coordenação.'
              : 'Senha definida. Entre novamente com sua nova senha.'}
          </p>
          <Link to="/login">Ir para o login</Link>
        </>
      ) : (
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              if (!valid) throw new Error('Este link é inválido. Solicite um novo envio.');
              if (
                newPassword &&
                (password !== confirmation || !/(?=.*\p{L})(?=.*[0-9])/u.test(password))
              )
                throw new Error(
                  'Use de 8 a 72 caracteres, com letra e número, e confirme a mesma senha.',
                );
              await api(
                `/auth/${kind === 'verify' ? 'verify-email' : kind === 'invite' ? 'invites/accept' : 'reset-password'}`,
                { method: 'POST', body: { token, ...(newPassword ? { password } : {}) } },
              );
              setPassword('');
              setConfirmation('');
              setDone(true);
              await auth.refresh();
            });
          }}
        >
          <p className={s.muted}>
            {valid
              ? 'Confirme a ação abaixo. O link expira em uma hora e só pode ser utilizado uma vez.'
              : 'O link está ausente ou inválido. Abra o link mais recente enviado ao seu e-mail.'}
          </p>
          {newPassword && (
            <>
              <PasswordField
                label="Nova senha"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className={s.muted}>8 a 72 caracteres, ao menos uma letra e um número.</p>
              <PasswordField
                label="Confirmar nova senha"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </>
          )}
          <ActionFeedback action={action} />
          <Button type="submit" loading={action.busy} disabled={!valid}>
            {newPassword ? 'Salvar nova senha' : 'Confirmar e-mail'}
          </Button>
          {kind === 'verify' && (
            <details>
              <summary>Preciso de um novo link</summary>
              <TextField
                label="E-mail de cadastro"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                variant="secondary"
                loading={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const result = await api<{ message: string }>('/auth/resend-verification', {
                      method: 'POST',
                      body: { email },
                    });
                    action.setMessage(result.message);
                  })
                }
              >
                Reenviar confirmação
              </Button>
            </details>
          )}
          <Link to="/login">Voltar ao login</Link>
        </form>
      )}
    </AuthLayout>
  );
}
export const ApiVerifyPage = () => <TokenForm kind="verify" />;
export const ApiResetPage = () => <TokenForm kind="reset" />;
export const ApiInvitePage = () => <TokenForm kind="invite" />;
export interface RequestDraft {
  courseId: string;
  subjectIds: string[];
}
function CourseSubjects({
  course,
  subjects,
  onChange,
}: {
  course: CatalogItem;
  subjects: string[];
  onChange: (ids: string[]) => void;
}) {
  const result = useApi<Items<CatalogItem>>(`/catalog/courses/${course.id}/subjects?limit=100`);
  return (
    <fieldset className={s.subsection}>
      <legend>{course.name}</legend>
      <LoadingError {...result} retry={result.refresh} />
      {result.data?.items.length === 0 && (
        <p>Este curso ainda não tem disciplinas disponíveis. A coordenação precisa cadastrá-las.</p>
      )}
      {result.data?.items.map((subject) => (
        <label className={s.check} key={subject.id}>
          <input
            type="checkbox"
            checked={subjects.includes(subject.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...subjects, subject.id]
                  : subjects.filter((id) => id !== subject.id),
              )
            }
          />
          {subject.name}
        </label>
      ))}
    </fieldset>
  );
}
export function CourseRequestsFields({
  requests,
  onChange,
}: {
  requests: RequestDraft[];
  onChange: (requests: RequestDraft[]) => void;
}) {
  const courses = useApi<Items<CatalogItem>>('/catalog/courses');
  return (
    <section>
      <h2>Cursos e disciplinas pretendidos</h2>
      <p className={s.muted}>
        Cada coordenação analisa apenas seu curso. Selecionar disciplinas não cria uma aula nem
        libera acesso acadêmico.
      </p>
      <LoadingError {...courses} retry={courses.refresh} />
      {courses.data?.items.length === 0 && (
        <p className={s.empty}>
          Os cursos serão disponibilizados pelo administrador. Você pode completar seu perfil e
          solicitar entrada depois.
        </p>
      )}
      {courses.data?.items.map((course) => {
        const request = requests.find((r) => r.courseId === course.id);
        return (
          <div key={course.id}>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={!!request}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...requests, { courseId: course.id, subjectIds: [] }]
                      : requests.filter((r) => r.courseId !== course.id),
                  )
                }
              />
              <strong>{course.name}</strong>
            </label>
            {request && (
              <CourseSubjects
                course={course}
                subjects={request.subjectIds}
                onChange={(subjectIds) =>
                  onChange(
                    requests.map((r) => (r.courseId === course.id ? { ...r, subjectIds } : r)),
                  )
                }
              />
            )}
          </div>
        );
      })}
    </section>
  );
}
export function ApiRegisterPage() {
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [data, setData] = useState<ProfileData>(emptyProfile),
    [requests, setRequests] = useState<RequestDraft[]>([]),
    [step, setStep] = useState(0),
    [terms, setTerms] = useState(false),
    [privacy, setPrivacy] = useState(false),
    [legal, setLegal] = useState<'terms' | 'privacy' | null>(null),
    [created, setCreated] = useState(false);
  const action = useAction(),
    serverLegal = useApi<{ version: string }>('/catalog/legal');
  const steps = ['Sua conta', 'Perfil acadêmico', 'Cursos e horários', 'Revisão'];
  async function submit(e: FormEvent) {
    e.preventDefault();
    await action.run(async () => {
      if (step === 0) {
        if (!isValidPhone(data.contact?.phone ?? ''))
          throw new Error('Informe um telefone nacional com DDD válido.');
        if (password !== confirmation || !/(?=.*\p{L})(?=.*[0-9])/u.test(password))
          throw new Error(
            'A senha precisa ter 8 a 72 caracteres, letra e número. Confirme a mesma senha.',
          );
      }
      if (step < 3) {
        setStep((n) => n + 1);
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      if (!terms || !privacy)
        throw new Error('Leia e aceite os termos e confirme a ciência do aviso de privacidade.');
      if (serverLegal.data?.version !== LEGAL_VERSION)
        throw new Error(
          'Os termos foram atualizados ou não puderam ser conferidos. Atualize a página antes de continuar.',
        );
      await api('/auth/enroll', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          profile: data,
          requests,
          legal: { version: LEGAL_VERSION, termsAccepted: terms, privacyAcknowledged: privacy },
        },
      });
      setPassword('');
      setConfirmation('');
      setCreated(true);
    });
  }
  return (
    <main className={s.register}>
      <title>Cadastro docente | ProFly</title>
      <div className={s.registerBrand}>
        <img src="/images/unifacisa-logo.png" alt="UNIFACISA" />
        <Link to="/login">Voltar ao login</Link>
      </div>
      {created ? (
        <Panel title="Confirme seu e-mail">
          <p>
            Seu perfil foi salvo. Abra o link enviado para {email} para confirmar sua identidade.
            Depois disso, as solicitações selecionadas seguirão para cada coordenação.
          </p>
          <p>A confirmação do e-mail não aprova sua entrada nos cursos.</p>
          <Link to="/verificar-email">Reenviar confirmação</Link>
        </Panel>
      ) : (
        <Panel>
          <h1>Cadastro do professor</h1>
          <ol className={s.steps}>
            {steps.map((title, i) => (
              <li aria-current={i === step ? 'step' : undefined} key={title}>
                {i + 1}. {title}
              </li>
            ))}
          </ol>
          <form onSubmit={submit}>
            <ActionFeedback action={action} />
            {step === 0 && (
              <div className={s.stack}>
                <TextField
                  label="Nome completo"
                  required
                  minLength={3}
                  maxLength={100}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  label="E-mail de acesso"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="Telefone com DDD"
                  required
                  autoComplete="tel-national"
                  inputMode="tel"
                  hint="Ex.: (83) 99999-0000"
                  value={data.contact?.phone ?? ''}
                  onChange={(e) => setData({ ...data, contact: { phone: e.target.value } })}
                />
                <PasswordField
                  label="Senha"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className={s.muted}>Use de 8 a 72 caracteres, ao menos uma letra e um número.</p>
                <PasswordField
                  label="Confirmar senha"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
            )}
            {step === 1 && <ProfileFields data={data} onChange={setData} section="academic" />}
            {step === 2 && (
              <>
                <CourseRequestsFields requests={requests} onChange={setRequests} />
                <ProfileFields data={data} onChange={setData} section="availability" />
              </>
            )}
            {step === 3 && (
              <div className={s.stack}>
                <h2>Confira antes de enviar</h2>
                <p>
                  <strong>{name}</strong>
                  <br />
                  {email}
                  <br />
                  {data.contact?.phone}
                </p>
                <p>
                  {data.education?.length ?? 0} formações, {data.knowledge?.length ?? 0}{' '}
                  conhecimentos e {requests.length} solicitações por curso.
                </p>
                <p>
                  Os dados serão persistidos no servidor. Você precisa confirmar o e-mail; as
                  coordenações decidem cada solicitação, sem aprovação automática.
                </p>
                <LoadingError {...serverLegal} retry={serverLegal.refresh} />
                <label className={s.check}>
                  <input
                    type="checkbox"
                    required
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                  />
                  Li e aceito os{' '}
                  <button type="button" onClick={() => setLegal('terms')}>
                    termos de uso
                  </button>
                  .
                </label>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    required
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                  />
                  Li o{' '}
                  <button type="button" onClick={() => setLegal('privacy')}>
                    aviso de privacidade
                  </button>{' '}
                  e estou ciente.
                </label>
              </div>
            )}
            <div className={s.actions}>
              {step > 0 && (
                <Button
                  variant="secondary"
                  disabled={action.busy}
                  onClick={() => setStep((n) => n - 1)}
                >
                  <Icon name="arrowLeft" />
                  Voltar
                </Button>
              )}
              <Button type="submit" loading={action.busy}>
                {step === 3 ? 'Criar conta e solicitar confirmação' : 'Continuar'}
                <Icon name="arrowRight" />
              </Button>
            </div>
          </form>
        </Panel>
      )}
      <Modal
        open={!!legal}
        onClose={() => setLegal(null)}
        title={legal === 'terms' ? 'Termos de uso' : 'Aviso de privacidade'}
        size="wide"
      >
        {legal && <LegalDocument kind={legal} />}
      </Modal>
    </main>
  );
}
