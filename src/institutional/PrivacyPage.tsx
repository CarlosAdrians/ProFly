import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/Button/Button';
import { TextField } from '../components/ui/TextField/TextField';
import { Icon } from '../components/ui/Icon/Icon';
import { api } from './api';
import { useApi } from './hooks';
import { useAction } from './actions';
import { Panel, Heading, LoadingError, Select, ActionFeedback, ApiModal } from './ui';
import { dayLabel } from './dates';
import s from './Portal.module.css';
export interface PrivacyPolicy {
  approved: boolean;
  controller: string | null;
  contactEmail: string | null;
  retentionNotice: string | null;
  processingBasis: string | null;
  healthBasis: string | null;
  healthUploads: 'BLOCKED' | 'SYNTHETIC_ONLY' | 'ENABLED';
}
const kinds = [
  ['ACCESS', 'Acesso completo aos dados'],
  ['CONFIRMATION', 'Confirmação do tratamento'],
  ['CORRECTION', 'Correção de dados'],
  ['ERASURE', 'Eliminação de dados'],
  ['ANONYMIZATION', 'Anonimização'],
  ['BLOCKING', 'Bloqueio de dados'],
  ['PORTABILITY', 'Portabilidade'],
  ['SHARING', 'Informações sobre compartilhamento'],
  ['OPPOSITION', 'Oposição ao tratamento'],
  ['CONSENT_REVOCATION', 'Revogação de consentimento, quando aplicável'],
  ['REVIEW', 'Esclarecimento ou revisão de recomendação'],
].map(([id, name]) => ({ id, name }));
interface RequestRecord {
  id: string;
  userId: string;
  version: number;
  kind: string;
  message: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESPONDED';
  createdAt: string;
  accessDueAt: string | null;
  events: { at: string; status: string; response: string | null }[];
}
const statuses = { OPEN: 'Recebido', IN_REVIEW: 'Em análise', RESPONDED: 'Respondido' };
export function PrivacyInformation() {
  const policy = useApi<PrivacyPolicy>('/catalog/privacy');
  return (
    <section className={s.privacyInformation} aria-label="Responsabilidade pelo tratamento">
      <h2>Responsabilidade e atendimento</h2>
      <LoadingError {...policy} retry={policy.refresh} />
      {policy.data && (
        <>
          {!policy.data.approved && (
            <p className={s.privacyPending}>
              Em preparação institucional. Utilize somente dados fictícios nesta prévia.
            </p>
          )}
          <dl className={s.privacyDefinition}>
            <div>
              <dt>Responsável pelos dados</dt>
              <dd>{policy.data.controller ?? 'Ainda não definido pela faculdade'}</dd>
            </div>
            <div>
              <dt>Canal de privacidade</dt>
              <dd>
                {policy.data.contactEmail ? (
                  <a href={`mailto:${policy.data.contactEmail}`}>{policy.data.contactEmail}</a>
                ) : (
                  'Ainda não definido pela faculdade'
                )}
              </dd>
            </div>
            <div>
              <dt>Base legal do tratamento</dt>
              <dd>
                {policy.data.processingBasis ?? 'Pendente de definição e validação institucional'}
              </dd>
            </div>
            <div>
              <dt>Retenção</dt>
              <dd>
                {policy.data.retentionNotice ??
                  'Prazos por categoria ainda serão definidos; não há prazo institucional presumido.'}
              </dd>
            </div>
          </dl>
          <p>
            {policy.data.healthUploads === 'BLOCKED'
              ? 'Novos atestados estão bloqueados até a definição institucional para dados de saúde.'
              : policy.data.healthUploads === 'SYNTHETIC_ONLY'
                ? 'Envio de documentos habilitado somente para testes com arquivos fictícios.'
                : `Dados de saúde: ${policy.data.healthBasis}`}
          </p>
        </>
      )}
    </section>
  );
}
export function PrivacyPage({ admin = false }: { admin?: boolean }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const prefix = admin ? '/admin/privacy/requests' : '/me/privacy/requests';
  const result = useApi<{ items: RequestRecord[]; nextCursor: string | null }>(
    `${prefix}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
  );
  const [kind, setKind] = useState('ACCESS'),
    [message, setMessage] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const action = useAction();
  return (
    <>
      <Heading
        title={admin ? 'Atendimento de privacidade' : 'Meus dados e privacidade'}
        description={
          admin
            ? 'Protocolos dos titulares, respostas e prazos de acesso.'
            : 'Consulte seus dados e acompanhe seus pedidos em um só lugar.'
        }
      />
      {!admin && (
        <Panel title="Seus dados, com transparência">
          <p>
            Você pode corrigir seus dados na conta e remover a foto. Para uma cópia estruturada,
            confirme sua senha. Os arquivos privados continuam disponíveis separadamente, com
            autenticação.
          </p>
          <div className={s.actions}>
            <Button onClick={() => setExportOpen(true)}>
              <Icon name="shield" />
              Baixar meus dados
            </Button>
            <Link to="/conta">Corrigir meus dados</Link>
            <Link to="/privacidade">Ler aviso de privacidade</Link>
          </div>
          <PrivacyInformation />
        </Panel>
      )}
      {!admin && (
        <Panel title="Exercer um direito">
          <p>
            A abertura é gratuita e gera um protocolo. Pedidos de eliminação, bloqueio ou revisão
            serão analisados; o envio não apaga registros nem altera sua escala.
          </p>
          <form
            className={`${s.stack} ${s.privacyForm}`}
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                await api('/me/privacy/requests', { method: 'POST', body: { kind, message } });
                setMessage('');
                setCursor(null);
                result.refresh();
              }, 'Pedido registrado. Acompanhe o protocolo abaixo.');
            }}
          >
            <Select label="Quero solicitar" items={kinds} value={kind} onChange={setKind} />
            <label className={s.privacyMessage}>
              Descreva o pedido
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={10}
                maxLength={1200}
                rows={3}
                aria-describedby="privacy-message-help"
              />
            </label>
            <small id="privacy-message-help" className={s.muted}>
              Informe somente o necessário. Não inclua senha, CPF, diagnóstico ou documento médico.
            </small>
            <ActionFeedback action={action} />
            <Button type="submit" loading={action.busy}>
              <Icon name="document" />
              Registrar pedido
            </Button>
          </form>
        </Panel>
      )}
      <Panel title={admin ? 'Protocolos recebidos' : 'Meus protocolos'}>
        {admin && (
          <p>
            Responder não executa exclusão ou anonimização. Registre a providência e a justificativa
            aplicável; não envie dados de outras pessoas. A instituição ainda precisa designar os
            responsáveis por este atendimento.
          </p>
        )}
        <LoadingError {...result} retry={result.refresh} />
        {result.data?.items.length === 0 && (
          <p className={s.empty}>Nenhum protocolo nesta página.</p>
        )}
        {result.data?.items.map((record) => (
          <article key={record.id} className={s.privacyRequest}>
            <div className={s.actions}>
              <h3>{kinds.find((k) => k.id === record.kind)?.name ?? record.kind}</h3>
              <span className={s.badge}>{statuses[record.status]}</span>
            </div>
            <p className={s.muted}>
              Protocolo {record.id} · {dayLabel(record.createdAt.slice(0, 10))}
            </p>
            <p className={s.privacyText}>{record.message}</p>
            {record.accessDueAt && (
              <p className={s.muted}>
                Prazo para declaração completa de acesso/confirmação:{' '}
                {dayLabel(record.accessDueAt.slice(0, 10))}.
              </p>
            )}
            {record.events
              .filter((event) => event.response)
              .map((event, i) => (
                <blockquote className={s.privacyReply} key={`${event.at}-${i}`}>
                  <p>{event.response}</p>
                  <small>
                    {dayLabel(event.at.slice(0, 10))} ·{' '}
                    {statuses[event.status as keyof typeof statuses]}
                  </small>
                </blockquote>
              ))}
            {admin && record.status !== 'RESPONDED' && (
              <PrivacyResponse record={record} onSaved={result.refresh} />
            )}
          </article>
        ))}
        <div className={s.actions}>
          {cursor && (
            <Button variant="secondary" onClick={() => setCursor(null)}>
              Voltar aos recentes
            </Button>
          )}
          {result.data?.nextCursor && (
            <Button variant="secondary" onClick={() => setCursor(result.data!.nextCursor)}>
              Ver anteriores
            </Button>
          )}
        </div>
      </Panel>
      <ApiModal open={exportOpen} title="Baixar meus dados" onClose={() => setExportOpen(false)}>
        {exportOpen && <PrivacyExport onDone={() => setExportOpen(false)} />}
      </ApiModal>
    </>
  );
}
function PrivacyResponse({ record, onSaved }: { record: RequestRecord; onSaved: () => void }) {
  const [status, setStatus] = useState('IN_REVIEW'),
    [response, setResponse] = useState('');
  const action = useAction();
  return (
    <form
      className={`${s.stack} ${s.privacyForm}`}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api(`/admin/privacy/requests/${record.id}`, {
            method: 'PATCH',
            body: { expectedVersion: record.version, status, response },
          });
          setResponse('');
          onSaved();
        }, 'Resposta registrada.');
      }}
    >
      <Select
        label="Situação do protocolo"
        value={status}
        onChange={setStatus}
        items={[
          { id: 'IN_REVIEW', name: 'Manter em análise' },
          { id: 'RESPONDED', name: 'Registrar resposta final' },
        ]}
      />
      <label className={s.privacyMessage}>
        Resposta ao titular
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          required
          minLength={20}
          maxLength={2000}
          rows={3}
        />
      </label>
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy}>
        Registrar resposta
      </Button>
    </form>
  );
}
function PrivacyExport({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const action = useAction();
  return (
    <form
      className={`${s.stack} ${s.privacyForm}`}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          try {
            const bundle = await api('/me/privacy/export', {
              method: 'POST',
              body: { currentPassword: password },
            });
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = 'profly-meus-dados.json';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            onDone();
          } finally {
            setPassword('');
          }
        });
      }}
    >
      <p>
        A cópia pode conter informações pessoais. Guarde o arquivo em um local privado. Para
        declaração completa ou portabilidade, registre um pedido.
      </p>
      <TextField
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        required
        maxLength={72}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.busy}>
        <Icon name="shield" />
        Confirmar e baixar
      </Button>
    </form>
  );
}
