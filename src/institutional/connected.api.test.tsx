import type { Occurrence as StoredOccurrence } from '../../backend/src/scheduling/models';
import { Buffer } from 'node:buffer';
import { StrictMode } from 'react';
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createUiFixture } from '../../backend/test/ui-fixture';
import { ApiSessionProvider } from './session';
import { apiRoutes } from './apiRoutes';
import { setCsrf } from './api';
let fixture: Awaited<ReturnType<typeof createUiFixture>>;
let cookie = '';
beforeAll(async () => {
  fixture = await createUiFixture();
}, 120000);
afterAll(async () => {
  await fixture?.close();
});
beforeEach(() => {
  cookie = '';
  setCsrf('');
  window.history.replaceState(null, '', '/');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith('/api/v1/')) throw new Error('External network disabled');
      if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const headers = Object.fromEntries(new Headers(init?.headers).entries());
      let payload =
        typeof init?.body === 'string' ? init.body : (undefined as string | Buffer | undefined);
      if (init?.body instanceof FormData) {
        const boundary = `profly-test-${crypto.randomUUID()}`;
        headers['content-type'] = `multipart/form-data; boundary=${boundary}`;
        const parts: Buffer[] = [];
        for (const [key, value] of init.body.entries()) {
          if (typeof value === 'string')
            parts.push(
              Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
              ),
            );
          else {
            const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as ArrayBuffer);
              reader.onerror = reject;
              reader.readAsArrayBuffer(value);
            });
            parts.push(
              Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="fixture.png"\r\nContent-Type: ${value.type}\r\n\r\n`,
              ),
              Buffer.from(bytes),
              Buffer.from('\r\n'),
            );
          }
        }
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        payload = Buffer.concat(parts);
      }
      const response = await fixture.app.inject({
        method: (init?.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE',
        url,
        headers: {
          ...headers,
          ...(cookie ? { cookie } : {}),
          origin: 'http://localhost:5173',
        },
        ...(payload !== undefined ? { payload } : {}),
      });
      if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const setCookie = response.headers['set-cookie'];
      if (setCookie)
        cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
      return new Response(response.statusCode === 204 ? null : response.body, {
        status: response.statusCode,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
});
function open(path: string) {
  const router = createMemoryRouter(apiRoutes, { initialEntries: [path] });
  render(
    <StrictMode>
      <ApiSessionProvider>
        <RouterProvider router={router} />
      </ApiSessionProvider>
    </StrictMode>,
  );
  return router;
}
async function signIn(email: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('E-mail:'), email);
  await user.type(screen.getByLabelText('Senha:'), fixture.password);
  await user.click(screen.getByRole('button', { name: 'Login' }));
  await screen.findByRole('heading', { name: 'Meu início' }, { timeout: 10000 });
  return user;
}

describe('interface -> contrato HTTP real -> MongoDB efêmero', () => {
  it('sessão ausente em rota protegida redireciona ao login, sem carregar indefinidamente', async () => {
    const router = open('/calendario');
    await screen.findByRole('heading', { name: 'Acesso ao ProFly' });
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByText('Conferindo sua sessão…')).not.toBeInTheDocument();
  });
  it('cadastro completo confirma email sem aprovar curso, coordenação decide somente seu curso', async () => {
    const user = userEvent.setup();
    open('/cadastro');
    await user.type(screen.getByLabelText('Nome completo'), 'Cadastro pela Interface');
    await user.type(screen.getByLabelText('E-mail de acesso'), 'cadastro.ui@profly.test');
    await user.type(screen.getByLabelText('Telefone com DDD'), '83999990000');
    await user.type(screen.getByLabelText('Senha', { exact: true }), fixture.password);
    await user.type(screen.getByLabelText('Confirmar senha'), fixture.password);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar formação' }));
    await user.type(screen.getByLabelText('Curso ou área de formação'), 'Direito');
    await user.type(screen.getByLabelText('Instituição (ex.: UEPB)'), 'Instituição Sintética');
    await user.click(await screen.findByRole('button', { name: 'Adicionar conhecimento' }));
    await user.selectOptions(
      screen.getByLabelText('Conhecimento', { exact: true }),
      fixture.competency.id,
    );
    const experiences = screen.getAllByLabelText('Você possui essa experiência?');
    for (const field of experiences) await user.selectOptions(field, 'NONE');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Direito' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Direito Civil I' }));
    await user.click(screen.getByRole('checkbox', { name: 'Sistemas de Informação' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Ética e Legislação' }));
    await user.selectOptions(screen.getByLabelText('Disponibilidade', { exact: true }), 'NONE');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('checkbox', { name: /Li e aceito os/ }));
    await user.click(screen.getByRole('checkbox', { name: /Li o aviso/ }));
    await user.click(screen.getByRole('button', { name: 'Criar conta e solicitar confirmação' }));
    await screen.findByRole('heading', { name: 'Confirme seu e-mail' });
    const account = await fixture.identity.users.findOne({ email: 'cadastro.ui@profly.test' });
    expect(account?.state).toBe('PENDING_EMAIL');
    expect(
      await fixture.database.db
        .collection('applications')
        .countDocuments({ teacherId: account!._id }),
    ).toBe(0);
    cleanup();
    window.history.replaceState(
      null,
      '',
      `/verificar-email#token=${fixture.messages.filter((m) => m.email === 'cadastro.ui@profly.test').at(-1)!.token}`,
    );
    open('/verificar-email');
    await user.click(screen.getByRole('button', { name: 'Confirmar e-mail' }));
    await screen.findByText(/E-mail confirmado/);
    expect(window.location.hash).toBe('');
    expect(
      await fixture.identity.memberships.countDocuments({ userId: account!._id, role: 'teacher' }),
    ).toBe(0);
    expect(
      await fixture.database.db
        .collection('applications')
        .countDocuments({ teacherId: account!._id, status: 'SUBMITTED' }),
    ).toBe(2);
    cleanup();
    open('/login');
    await signIn('cadastro.ui@profly.test');
    expect(await screen.findAllByText('Em análise')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta' }));
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await screen.findByRole('heading', { name: 'Acesso ao ProFly' });
    await signIn(fixture.coordinatorEmail);
    await user.click(screen.getByRole('link', { name: 'Professores' }));
    const analyze = await screen.findAllByRole('button', { name: 'Analisar perfil' });
    for (const button of analyze) {
      await user.click(button);
      const dialog = screen.getByRole('dialog', { name: 'Análise docente por curso' });
      if (
        await within(dialog)
          .findByRole('heading', { name: 'Cadastro pela Interface' })
          .catch(() => null)
      ) {
        const selectors = within(dialog).getAllByLabelText('Análise do item');
        for (const select of selectors) await user.selectOptions(select, 'CONFIRMED');
        await user.type(
          within(dialog).getByLabelText('Motivo da decisão'),
          'Conferência sintética pelo curso responsável',
        );
        await user.click(within(dialog).getByRole('button', { name: 'Registrar análise' }));
        break;
      }
      await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    }
    await waitFor(async () =>
      expect(
        await fixture.identity.memberships.countDocuments({
          userId: account!._id,
          courseId: fixture.courseA.id,
          role: 'teacher',
          active: true,
        }),
      ).toBe(1),
    );
    expect(
      await fixture.identity.memberships.countDocuments({
        userId: account!._id,
        courseId: fixture.courseB.id,
        role: 'teacher',
        active: true,
      }),
    ).toBe(0);
  }, 60000);
  it('monta rascunho elegível, publica revisão e mantém a escala no calendário docente', async () => {
    open('/login');
    const user = await signIn(fixture.coordinatorEmail);
    await user.click(screen.getByRole('link', { name: 'Alocações' }));
    await user.click(await screen.findByRole('button', { name: 'Nova alocação' }));
    await screen.findByRole('option', { name: 'Direito Civil I · Turma 1' });
    await user.selectOptions(
      screen.getByLabelText('Oferta de disciplina e turma'),
      fixture.offering.id,
    );
    await screen.findByRole('option', { name: 'Docente de Teste' });
    await user.selectOptions(
      screen.getByLabelText('Professor aprovado no curso'),
      fixture.teacherId,
    );
    await user.click(screen.getByRole('button', { name: 'Comparar professores' }));
    await screen.findAllByText(/pontos$/);
    await user.click(screen.getByRole('button', { name: 'Conferir elegibilidade' }));
    await screen.findByText('Elegível', { exact: true });
    expect(await screen.findByText('60 / 100')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await screen.findByText('Rascunho', { exact: true });
    expect(
      await fixture.database.db
        .collection('occurrences')
        .countDocuments({ teacherId: fixture.teacherId }),
    ).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Publicar revisão' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar publicação' }));
    await screen.findByText('Escala publicada com sucesso.');
    await user.click(screen.getByRole('link', { name: 'Meu início' }));
    await screen.findByRole('heading', { name: 'Próximas aulas do curso' });
    await screen.findAllByText('Direito Civil I');
    expect(
      await fixture.database.db
        .collection('occurrences')
        .countDocuments({ teacherId: fixture.teacherId, status: 'PLANNED' }),
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole('link', { name: 'Histórico' }));
    await user.click(
      (await screen.findAllByRole('button', { name: 'Vincular reposição' })).at(-1)!,
    );
    const replacementDialog = screen.getByRole('dialog', { name: 'Vincular reposição' });
    const replacementSelect = within(replacementDialog).getByLabelText(
      'Encontro publicado para reposição',
    );
    const option = within(replacementSelect)
      .getAllByRole('option')
      .find((o) => (o as HTMLOptionElement).value)!;
    await user.selectOptions(replacementSelect, (option as HTMLOptionElement).value);
    await user.click(
      within(replacementDialog).getByRole('button', { name: 'Confirmar reposição' }),
    );
    await screen.findByText('Reposição vinculada. A aula original permanece no histórico.');
    expect(
      await fixture.database.db
        .collection('occurrences')
        .countDocuments({ teacherId: fixture.teacherId, status: 'RESCHEDULED' }),
    ).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta' }));
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await screen.findByRole('heading', { name: 'Acesso ao ProFly' });
    await signIn(fixture.teacherEmail);
    await screen.findByRole('heading', { name: 'Próximas aulas' });
    await screen.findAllByText('Direito Civil I');
    await user.click(screen.getByRole('link', { name: 'Calendário' }));
    fireEvent.change(screen.getByLabelText('Data de referência'), {
      target: { value: fixture.from },
    });
    await screen.findAllByText('Direito Civil I');
    expect(screen.queryByRole('button', { name: 'Nova alocação' })).not.toBeInTheDocument();
  }, 30000);
  it('salva preferências de notificações e comunica ausência sem alterar o perfil acadêmico', async () => {
    open('/login');
    const user = await signIn(fixture.teacherEmail);
    await user.click(screen.getByRole('button', { name: /^Notificações,/ }));
    await user.click(
      await screen.findByRole('switch', { name: 'Receber notificações no sistema' }),
    );
    await waitFor(async () =>
      expect(
        (
          await fixture.database.db
            .collection<{ _id: string; notifications: boolean }>('preferences')
            .findOne({ _id: fixture.teacherId })
        )?.notifications,
      ).toBe(false),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Receber notificações no sistema' }),
      ).toHaveAttribute('aria-checked', 'false'),
    );
    const before = await fixture.database.db
      .collection<{ _id: string }>('profiles')
      .findOne({ _id: fixture.teacherId });
    await user.click(screen.getByRole('link', { name: 'Atestados' }));
    await user.click(await screen.findByRole('button', { name: 'Informar ausência' }));
    await user.type(screen.getByLabelText('Primeiro dia'), fixture.from);
    await user.type(screen.getByLabelText('Último dia'), fixture.until);
    await user.click(screen.getByRole('checkbox', { name: 'Direito' }));
    await user.click(screen.getByRole('button', { name: 'Salvar comunicação' }));
    await screen.findByText('Comunicação de ausência');
    expect(
      await fixture.database.db
        .collection('absences')
        .countDocuments({ teacherId: fixture.teacherId }),
    ).toBe(1);
    expect(
      await fixture.database.db
        .collection<{ _id: string }>('profiles')
        .findOne({ _id: fixture.teacherId }),
    ).toEqual(before);
  }, 30000);
  it('conflito de versão preserva o formulário e a alteração mais recente do servidor', async () => {
    open('/login');
    const user = await signIn(fixture.coordinatorEmail);
    await user.click(screen.getByRole('link', { name: 'Disciplinas' }));
    await user.click(await screen.findByRole('button', { name: 'Editar disciplina' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar disciplina' }),
      input = within(dialog).getByLabelText('Nome da disciplina');
    await user.clear(input);
    await user.type(input, 'Texto preservado na edição');
    const subject = await fixture.call(
      `/api/v1/courses/${fixture.courseA.id}/subjects`,
      undefined,
      fixture.admin,
    );
    const current = subject.items.find((v: { id: string }) => v.id === fixture.subjectA.id);
    await fixture.call(
      `/api/v1/courses/${fixture.courseA.id}/subjects/${current.id}`,
      {
        expectedVersion: current.version,
        data: {
          code: current.code,
          name: 'Alteração concorrente no servidor',
          active: current.active,
          criteria: current.criteria,
        },
      },
      fixture.admin,
      'PUT',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Salvar disciplina' }));
    await within(dialog).findByRole('alert');
    expect(input).toHaveValue('Texto preservado na edição');
    expect(screen.getByRole('dialog', { name: 'Editar disciplina' })).toBeInTheDocument();
    expect(
      (
        await fixture.call(
          `/api/v1/courses/${fixture.courseA.id}/subjects`,
          undefined,
          fixture.admin,
        )
      ).items.find((v: { id: string }) => v.id === fixture.subjectA.id).name,
    ).toBe('Alteração concorrente no servidor');
  }, 30000);

  it('edita turma e oferta com versão, sem alterar estruturas já alocadas', async () => {
    open('/login');
    const user = await signIn(fixture.coordinatorEmail);
    await user.click(screen.getByRole('link', { name: 'Alocações' }));
    await user.click(await screen.findByRole('button', { name: 'Turmas e ofertas' }));
    const dialog = screen.getByRole('dialog', { name: 'Turmas e ofertas' });
    await user.type(within(dialog).getByLabelText('Nome da turma'), 'Turma de Revisão');
    await user.type(within(dialog).getByLabelText('Código'), 'REV-UI');
    await within(dialog).findByRole('option', { name: fixture.period.name });
    await user.selectOptions(within(dialog).getByLabelText('Período'), fixture.period.id);
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar turma' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Editar turma REV-UI' }));
    await user.clear(within(dialog).getByLabelText('Nome da turma'));
    await user.type(within(dialog).getByLabelText('Nome da turma'), 'Turma Revisada');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(async () =>
      expect(
        (await fixture.database.db.collection('groups').findOne({ code: 'REV-UI' }))?.name,
      ).toBe('Turma Revisada'),
    );
    await user.selectOptions(within(dialog).getByLabelText('Cadastrar'), 'offering');
    await user.type(within(dialog).getByLabelText('Nome da oferta'), 'Oferta de Revisão');
    await user.type(within(dialog).getByLabelText('Código'), 'OF-REV-UI');
    await user.selectOptions(within(dialog).getByLabelText('Período'), fixture.period.id);
    await user.selectOptions(within(dialog).getByLabelText('Disciplina'), fixture.subjectA.id);
    const group = await fixture.database.db.collection('groups').findOne({ code: 'REV-UI' });
    await user.selectOptions(within(dialog).getByLabelText('Turma'), group!._id.toString());
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar oferta' }));
    await user.click(
      await within(dialog).findByRole('button', { name: 'Editar oferta OF-REV-UI' }),
    );
    await user.clear(within(dialog).getByLabelText('Nome da oferta'));
    await user.type(within(dialog).getByLabelText('Nome da oferta'), 'Oferta Revisada');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(async () =>
      expect(
        (await fixture.database.db.collection('offerings').findOne({ code: 'OF-REV-UI' }))?.name,
      ).toBe('Oferta Revisada'),
    );
  }, 30000);
  it('sino abre painel sem navegar; leitura atualiza contador, Escape devolve foco e clique fora fecha', async () => {
    const { entity } = await import('../../backend/src/shared/model');
    const notice = {
      ...entity(),
      userId: fixture.teacherId,
      kind: 'SCHEDULE',
      resourceId: crypto.randomUUID(),
      title: 'Aviso sintético do checklist',
      read: false,
    };
    await fixture.database.db.collection<typeof notice>('notices').insertOne(notice);
    const router = open('/login');
    const user = await signIn(fixture.teacherEmail);
    const count = await fixture.database.db
      .collection<typeof notice>('notices')
      .countDocuments({ userId: fixture.teacherId, read: false });
    const bell = await screen.findByRole('button', { name: `Notificações, ${count} não lidas` });
    const path = router.state.location.pathname;
    expect(screen.queryByRole('link', { name: 'Ajustes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Notificações' })).not.toBeInTheDocument();
    await user.click(bell);
    const dialog = screen.getByRole('dialog', { name: 'Notificações' });
    expect(router.state.location.pathname).toBe(path);
    const row = (await within(dialog).findByText(notice.title)).closest('li')!;
    await user.click(within(row).getByRole('button', { name: 'Marcar como lida' }));
    await waitFor(() => expect(bell).toHaveAccessibleName(`Notificações, ${count - 1} não lidas`));
    expect(
      (await fixture.database.db.collection<typeof notice>('notices').findOne({ _id: notice._id }))
        ?.read,
    ).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Notificações' })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Notificações' })).toBeInTheDocument();
    await user.click(screen.getByRole('heading', { name: 'Meu início' }));
    expect(screen.queryByRole('dialog', { name: 'Notificações' })).not.toBeInTheDocument();
    await router.navigate('/configuracoes');
    await screen.findByRole('heading', { name: 'Conta' });
    expect(screen.getByRole('heading', { name: 'Alterar senha' })).toBeInTheDocument();
    await router.navigate('/notificacoes');
    await screen.findByRole('heading', { name: 'Meu início' });
    expect(screen.queryByRole('heading', { name: 'Notificações' })).not.toBeInTheDocument();
  }, 30000);
  it('envia atestado no formulario e repete falha do upload sem duplicar a ausencia salva', async () => {
    open('/login');
    const user = await signIn(fixture.teacherEmail);
    await user.click(screen.getByRole('link', { name: 'Atestados' }));
    await user.click(await screen.findByRole('button', { name: 'Enviar atestado' }));
    const dialog = screen.getByRole('dialog', { name: 'Enviar atestado' });
    const sharp = (await import('../../backend/node_modules/sharp')).default;
    const bytes = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await user.upload(
      within(dialog).getByLabelText('Arquivo do atestado'),
      new File([new Uint8Array(bytes)], 'atestado-ficticio.png', { type: 'image/png' }),
    );
    await user.type(within(dialog).getByLabelText('Primeiro dia'), fixture.from);
    await user.type(within(dialog).getByLabelText('Último dia'), fixture.until);
    await user.click(within(dialog).getByRole('checkbox', { name: 'Direito' }));
    const before = await fixture.database.db
      .collection('absences')
      .countDocuments({ teacherId: fixture.teacherId });
    const actualFetch = globalThis.fetch;
    let refused = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        if (String(input).endsWith('/attachment') && init?.method === 'POST' && !refused) {
          refused = true;
          return new Response(
            JSON.stringify({
              error: { code: 'UNAVAILABLE', message: 'Upload temporariamente indisponível.' },
            }),
            { status: 503 },
          );
        }
        return actualFetch(input, init);
      }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Enviar atestado para análise' }));
    await within(dialog).findByText('Upload temporariamente indisponível.');
    expect(
      await fixture.database.db
        .collection('absences')
        .countDocuments({ teacherId: fixture.teacherId }),
    ).toBe(before + 1);
    expect(within(dialog).getByLabelText('Primeiro dia')).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Reenviar atestado' }));
    await screen.findByRole('button', { name: 'Baixar atestado privado' });
    expect(screen.queryByRole('dialog', { name: 'Enviar atestado' })).not.toBeInTheDocument();
    expect(
      await fixture.database.db
        .collection('absences')
        .countDocuments({ teacherId: fixture.teacherId }),
    ).toBe(before + 1);
    const stored = await fixture.database.db
      .collection('absences')
      .find({ teacherId: fixture.teacherId, attachment: { $exists: true } })
      .toArray();
    expect(stored.at(-1)?.attachment.bytes).toBe(bytes.length);
  }, 30000);

  it('horarios compactos abrem para editar e preservam as outras janelas ao salvar na API', async () => {
    const before = await fixture.database.db
      .collection<{ _id: string; version: number; data: typeof fixture.profile }>('profiles')
      .findOne({ _id: fixture.teacherId });
    open('/login');
    const user = await signIn(fixture.teacherEmail);
    await user.click(screen.getByRole('link', { name: 'Disponibilidade' }));
    const summary = await screen.findByText(/Segunda · 18:00–21:00/);
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    await waitFor(() => expect(details).toHaveAttribute('open'));
    const end = within(details).getByLabelText('Fim');
    await user.clear(end);
    await user.type(end, '21:30');
    await user.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    await waitFor(async () =>
      expect(
        (
          await fixture.database.db
            .collection<{ _id: string; version: number }>('profiles')
            .findOne({ _id: fixture.teacherId })
        )?.version,
      ).toBe(before!.version + 1),
    );
    const after = await fixture.database.db
      .collection<{ _id: string; data: typeof fixture.profile }>('profiles')
      .findOne({ _id: fixture.teacherId });
    expect(after!.data.availability!.windows[0]).toEqual({
      ...before!.data.availability!.windows[0],
      endsAt: '21:30',
    });
    expect(after!.data.availability!.windows.slice(1)).toEqual(
      before!.data.availability!.windows.slice(1),
    );
    expect(after!.data.desiredWeeklyMinutes).toBe(before!.data.desiredWeeklyMinutes);
  }, 30000);
  it('calendario docente mostra cinco aulas diurnas publicadas com dias livres e filtros', async () => {
    const dateAt = (offset: number) => {
      const day = new Date(`${fixture.from}T12:00:00Z`);
      day.setUTCDate(day.getUTCDate() + offset);
      return day.toISOString().slice(0, 10);
    };
    const now = new Date().toISOString();
    const meetings = [
      [0, '11:00', '11:50'],
      [0, '17:00', '17:50'],
      [1, '12:00', '12:50'],
      [3, '17:00', '17:50'],
      [4, '18:00', '18:50'],
    ] as const;
    const records: StoredOccurrence[] = meetings.map(([offset, start, end], i) => ({
      _id: crypto.randomUUID(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      allocationId: crypto.randomUUID(),
      teacherId: fixture.teacherId,
      courseId: fixture.courseA.id,
      periodId: fixture.period.id,
      subjectId: fixture.subjectA.id,
      groupId: fixture.group.id,
      date: dateAt(offset),
      startsAt: `${dateAt(offset)}T${start}:00.000Z`,
      endsAt: `${dateAt(offset)}T${end}:00.000Z`,
      minutes: 50,
      status: 'PLANNED',
      courseName: 'Direito visual API',
      groupName: 'Turma visual API',
      subjectName: `Visual aula ${i + 1}`,
    }));
    const sundayRecord: StoredOccurrence = {
      ...records[0]!,
      _id: crypto.randomUUID(),
      allocationId: crypto.randomUUID(),
      date: dateAt(6),
      startsAt: `${dateAt(6)}T11:00:00.000Z`,
      endsAt: `${dateAt(6)}T11:50:00.000Z`,
      subjectName: 'Visual domingo',
    };
    const foreign = {
      ...records[0],
      _id: crypto.randomUUID(),
      teacherId: crypto.randomUUID(),
      subjectName: 'Visual alheia',
    };
    await fixture.database.db
      .collection<StoredOccurrence>('occurrences')
      .insertMany([...records, foreign, sundayRecord]);
    try {
      open('/login');
      const user = await signIn(fixture.teacherEmail);
      await user.click(screen.getByRole('link', { name: 'Calendário' }));
      expect(screen.getByRole('button', { name: /^Todos$/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await user.selectOptions(screen.getByRole('combobox', { name: 'Visualização' }), 'WEEK');
      fireEvent.change(screen.getByLabelText('Data de referência'), {
        target: { value: fixture.from },
      });
      expect(await screen.findAllByRole('button', { name: /Visual aula/ })).toHaveLength(5);
      const initialTone = screen
        .getByRole('button', { name: /Visual aula 1/ })
        .getAttribute('data-tone');
      expect(initialTone).toBeTruthy();
      expect(
        new Set(
          screen
            .getAllByRole('button', { name: /Visual aula/ })
            .map((card) => card.getAttribute('data-tone')),
        ).size,
      ).toBeGreaterThan(2);
      const legend = screen.getByRole('list', { name: 'Disciplinas no período' });
      expect(within(legend).getByText('Visual aula 1')).toHaveAttribute('data-tone', initialTone);
      expect(screen.queryByText('Domingo', { exact: true })).not.toBeInTheDocument();
      const sunday = new Date(`${dateAt(6)}T12:00:00Z`).toLocaleDateString('pt-BR');
      expect(screen.queryByRole('region', { name: sunday })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Visual alheia/ })).not.toBeInTheDocument();
      await user.selectOptions(screen.getByRole('combobox', { name: 'Visualização' }), 'MONTH');
      expect(await screen.findAllByRole('button', { name: /Visual aula/ })).toHaveLength(5);
      expect(screen.getByRole('button', { name: /Visual aula 1/ })).toHaveAttribute(
        'data-tone',
        initialTone,
      );
      expect(screen.queryByText('Domingo', { exact: true })).not.toBeInTheDocument();
      expect(screen.getByText('Sábado', { exact: true })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Visual domingo/ })).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('list', { name: 'Disciplinas no período' })).queryByText(
          'Visual domingo',
        ),
      ).not.toBeInTheDocument();
      expect(
        await fixture.database.db
          .collection<StoredOccurrence>('occurrences')
          .findOne({ _id: sundayRecord._id }),
      ).not.toBeNull();
      await user.selectOptions(screen.getByRole('combobox', { name: 'Visualização' }), 'WEEK');

      expect(screen.queryByRole('button', { name: 'Nova alocação' })).not.toBeInTheDocument();
      const morning = await screen.findByRole('button', { name: /Visual aula 1/ });
      expect(morning).toHaveAttribute('draggable', 'false');
      expect(morning).toHaveTextContent('Turma visual API');
      const freeDay = new Date(`${dateAt(2)}T12:00:00Z`).toLocaleDateString('pt-BR');
      expect(
        within(screen.getByRole('region', { name: freeDay })).getByText('Sem aulas'),
      ).toBeInTheDocument();
      await user.click(morning);
      const details = screen.getByRole('dialog', { name: 'Detalhes da aula' });
      expect(within(details).getByRole('heading', { name: 'Visual aula 1' })).toBeInTheDocument();
      expect(within(details).getByText(/Direito visual API/)).toBeInTheDocument();
      await user.click(within(details).getByRole('button', { name: 'Fechar' }));
      await user.click(screen.getByRole('button', { name: /^Manhã$/ }));
      expect(screen.getAllByRole('button', { name: /Visual aula/ })).toHaveLength(2);
      expect(screen.getByRole('button', { name: /Visual aula 1/ })).toHaveAttribute(
        'data-tone',
        initialTone,
      );
      await user.click(screen.getByRole('button', { name: /^Tarde$/ }));
      expect(screen.getAllByRole('button', { name: /Visual aula/ })).toHaveLength(3);
      await user.click(screen.getByRole('button', { name: /^Noite$/ }));
      expect(screen.queryByRole('button', { name: /Visual aula/ })).not.toBeInTheDocument();
      await user.selectOptions(screen.getByRole('combobox', { name: 'Visualização' }), 'DAY');
      fireEvent.change(screen.getByLabelText('Data de referência'), {
        target: { value: dateAt(6) },
      });
      expect(
        screen.getByText('Selecione uma data de segunda a sábado para consultar as aulas.'),
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Data de referência'), {
        target: { value: dateAt(5) },
      });
      await user.click(screen.getByRole('button', { name: 'Próximo período' }));
      expect(screen.getByLabelText('Data de referência')).toHaveValue(dateAt(7));
    } finally {
      await fixture.database.db.collection<StoredOccurrence>('occurrences').deleteMany({
        _id: { $in: [...records, foreign, sundayRecord].map((record) => record._id) },
      });
    }
  }, 30000);
  it('privacidade pessoal simplificada registra pedido sem expor gestao institucional', async () => {
    open('/login');
    const user = await signIn(fixture.teacherEmail);
    await user.click(screen.getByRole('link', { name: /^Conta$/ }));
    await user.click(screen.getByRole('link', { name: 'Gerenciar meus dados' }));
    await screen.findByRole('heading', { name: 'Meus dados e privacidade' });
    expect(
      screen.queryByRole('heading', { name: 'Responsabilidade e atendimento' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByText('Novo pedido de privacidade'));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Quero solicitar' }),
      'CORRECTION',
    );
    await user.type(
      screen.getByLabelText('Descreva o pedido'),
      'Solicito conferir meus dados de formacao no teste LGPD.',
    );
    await user.click(screen.getByRole('button', { name: 'Registrar pedido' }));
    await screen.findByText('Pedido registrado. Acompanhe o protocolo abaixo.');
    await screen.findByText('Solicito conferir meus dados de formacao no teste LGPD.');
    const stored = await fixture.database.db.collection('privacyRequests').findOne({
      userId: fixture.teacherId,
      message: 'Solicito conferir meus dados de formacao no teste LGPD.',
    });
    expect(stored?.status).toBe('OPEN');
    expect(stored?.accessDueAt).toBeNull();
    expect(
      await fixture.identity.users.findOne({ _id: fixture.teacherId, state: 'ACTIVE' }),
    ).not.toBeNull();
  }, 30000);
  it('administracao responde protocolo de acesso e a resposta persiste com versao', async () => {
    const record = await fixture.call(
      '/api/v1/me/privacy/requests',
      { kind: 'ACCESS', message: 'Solicito acesso completo para conferencia sintetica.' },
      fixture.teacher,
    );
    const router = open('/login');
    const user = await signIn(fixture.adminEmail);
    await router.navigate('/administracao/privacidade');
    await screen.findByRole('heading', { name: 'Atendimento de privacidade' });
    expect(await screen.findAllByText('Ainda não definido pela faculdade')).toHaveLength(2);
    const entry = (
      await screen.findByText('Solicito acesso completo para conferencia sintetica.')
    ).closest('article')!;
    await user.selectOptions(
      within(entry).getByRole('combobox', { name: 'Situação do protocolo' }),
      'RESPONDED',
    );
    await user.type(
      within(entry).getByLabelText('Resposta ao titular'),
      'Acesso conferido com dados ficticios; resposta de teste, sem dados de terceiros.',
    );
    await user.click(within(entry).getByRole('button', { name: 'Registrar resposta' }));
    await screen.findByText('Resposta registrada.');
    await screen.findByText(
      'Acesso conferido com dados ficticios; resposta de teste, sem dados de terceiros.',
    );
    const stored = await fixture.database.db
      .collection<{ _id: string; status: string; version: number; events: unknown[] }>(
        'privacyRequests',
      )
      .findOne({ _id: record.id });
    expect(stored?.status).toBe('RESPONDED');
    expect(stored?.version).toBe(2);
    expect(stored?.events).toHaveLength(2);
  }, 30000);
  it('saida fica no menu do perfil com Escape foco e encerramento real de sessao', async () => {
    const router = open('/login');
    const user = await signIn(fixture.teacherEmail);
    const sessionCookie = cookie;
    const trigger = screen.getByRole('button', { name: 'Abrir menu da conta' });
    expect(screen.queryByRole('button', { name: 'Sair da conta' })).not.toBeInTheDocument();
    await user.click(trigger);
    const menu = screen.getByRole('dialog', { name: 'Menu da conta' });
    expect(within(menu).getByRole('link', { name: 'Minha conta' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu da conta' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await router.navigate('/horarios');
    expect(screen.queryByRole('button', { name: 'Sair da conta' })).not.toBeInTheDocument();
    await user.click(trigger);
    await user.click(screen.getByRole('heading', { name: 'Minha disponibilidade' }));
    expect(screen.queryByRole('dialog', { name: 'Menu da conta' })).not.toBeInTheDocument();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await screen.findByRole('heading', { name: 'Acesso ao ProFly' });
    expect(
      (await fixture.app.inject({ url: '/api/v1/me/profile', headers: { cookie: sessionCookie } }))
        .statusCode,
    ).toBe(401);
  }, 30000);
  it('recuperação usa fragmento, confirma nova senha e revoga a sessão anterior', async () => {
    const old = await fixture.login(fixture.teacherEmail);
    open('/esqueceu-senha');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail', { exact: true }), fixture.teacherEmail);
    await user.click(screen.getByRole('button', { name: 'Solicitar recuperação' }));
    await screen.findByText(/Se houver uma conta elegivel/);
    const message = fixture.messages
      .filter((m) => m.email === fixture.teacherEmail && m.purpose === 'RESET')
      .at(-1)!;
    expect(message).toBeTruthy();
    cleanup();
    window.history.replaceState(null, '', `/redefinir-senha#token=${message.token}`);
    open('/redefinir-senha');
    await user.type(screen.getByLabelText('Nova senha', { exact: true }), 'NovoAcesso2026');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NovoAcesso2026');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await screen.findByText(/Senha definida/, {}, { timeout: 10000 });
    expect(window.location.hash).toBe('');
    expect(
      (await fixture.app.inject({ url: '/api/v1/auth/session', headers: old })).statusCode,
    ).toBe(401);
    expect(
      (
        await fixture.app.inject({
          method: 'POST',
          url: '/api/v1/auth/reset-password',
          payload: { token: message.token, password: 'OutraSenha2026' },
        })
      ).statusCode,
    ).toBe(410);
    cleanup();
    cookie = '';
    setCsrf('');
    open('/login');
    await user.type(screen.getByLabelText('E-mail:'), fixture.teacherEmail);
    await user.type(screen.getByLabelText('Senha:'), 'NovoAcesso2026');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    await screen.findByRole('heading', { name: 'Meu início' });
  }, 30000);
});
