import { StrictMode } from 'react';
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
      const response = await fixture.app.inject({
        method: (init?.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE',
        url,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          ...(cookie ? { cookie } : {}),
          origin: 'http://localhost:5173',
        },
        ...(typeof init?.body === 'string' ? { payload: init.body } : {}),
      });
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
  await screen.findByRole('heading', { name: 'Meu início' });
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
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await screen.findByRole('heading', { name: 'Acesso ao ProFly' });
    await signIn(fixture.teacherEmail);
    await user.click(screen.getByRole('link', { name: 'Calendário' }));
    await user.clear(screen.getByLabelText('Data de referência'));
    await user.type(screen.getByLabelText('Data de referência'), fixture.from);
    await screen.findAllByText('Direito Civil I');
    expect(screen.queryByRole('button', { name: 'Nova alocação' })).not.toBeInTheDocument();
  }, 30000);
  it('salva preferências de notificações e comunica ausência sem alterar o perfil acadêmico', async () => {
    open('/login');
    const user = await signIn(fixture.teacherEmail);
    await user.click(screen.getByRole('link', { name: 'Ajustes' }));
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
    const before = await fixture.database.db
      .collection<{ _id: string }>('profiles')
      .findOne({ _id: fixture.teacherId });
    await user.click(screen.getByRole('link', { name: 'Ausências' }));
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
});
