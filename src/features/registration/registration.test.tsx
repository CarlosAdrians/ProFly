/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { fireEvent, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';
import { registrationFixture, TEST_PASSWORD } from '../../test/registrationFixture';
import { validateRegistration } from './validation';
import {
  authenticateDemoTeacher,
  listDemoProfiles,
  registerDemo,
  REGISTRATION_KEY,
  reviewDemoRequest,
} from './demoService';
import { SESSION_KEY } from '../auth/session/authContext';
import { LEGAL_VERSION } from '../legal/content';
beforeAll(() => vi.stubGlobal('crypto', webcrypto));
afterAll(() => vi.unstubAllGlobals());

describe('cadastro proprio e analise independente', () => {
  it('rejeita incompletude e sobreposicao sem substituir desconhecido por experiencia inexistente', () => {
    const data = registrationFixture();
    expect(
      validateRegistration({ ...data, name: ' ' }, 0, TEST_PASSWORD, TEST_PASSWORD),
    ).toHaveProperty('name');
    expect(
      validateRegistration({ ...data, teaching: { ...data.teaching, status: 'UNKNOWN' } }, 1),
    ).toHaveProperty('teaching');
    expect(validateRegistration(data, 1)).toEqual({});
    expect(
      validateRegistration(
        {
          ...data,
          availability: [
            ...data.availability,
            { ...data.availability[0], id: crypto.randomUUID() },
          ],
        },
        2,
      ),
    ).toHaveProperty('availability');
    expect(
      validateRegistration(
        {
          ...data,
          requests: [{ courseId: 'direito', subjects: ['Banco de Dados'], status: 'PENDING' }],
        },
        2,
      ),
    ).toHaveProperty('requests');
  });
  it('exige documentos, registra versao e guarda somente derivacao da senha de teste', async () => {
    const data = registrationFixture();
    await expect(registerDemo(data, TEST_PASSWORD, TEST_PASSWORD, false, true)).rejects.toThrow(
      /Termos/,
    );
    expect(localStorage.getItem(REGISTRATION_KEY)).toBeNull();
    const profile = await registerDemo(
      {
        ...data,
        email: ' PROFESSOR@profly.test ',
        requests: data.requests.map((request) => ({ ...request, status: 'APPROVED' })),
      },
      TEST_PASSWORD,
      TEST_PASSWORD,
      true,
      true,
    );
    expect(profile.email).toBe('professor@profly.test');
    expect(profile.legalVersion).toBe(LEGAL_VERSION);
    expect(profile.requests.map((request) => request.status)).toEqual(['PENDING', 'PENDING']);
    expect(localStorage.getItem(REGISTRATION_KEY)).not.toContain(TEST_PASSWORD);
    expect(await authenticateDemoTeacher(profile.email, 'Wrong2026')).toBeNull();
    expect((await authenticateDemoTeacher(profile.email, TEST_PASSWORD))?.id).toBe(profile.id);
    await expect(registerDemo(data, TEST_PASSWORD, TEST_PASSWORD, true, true)).rejects.toThrow(
      /já possui/,
    );
  });
  it('aprova apenas o curso analisado, exige motivo e rejeita versoes antigas', async () => {
    const data = registrationFixture();
    await registerDemo(data, TEST_PASSWORD, TEST_PASSWORD, true, true);
    expect(() => reviewDemoRequest(data.email, 'direito', 'APPROVED', '', 1)).toThrow(/motivo/);
    reviewDemoRequest(data.email, 'direito', 'APPROVED', 'Entrada aprovada para este curso', 1);
    let profile = listDemoProfiles()[0];
    expect(profile.requests.map((request) => request.status)).toEqual(['APPROVED', 'PENDING']);
    expect(() =>
      reviewDemoRequest(
        data.email,
        'sistemas',
        'REJECTED',
        'Perfil não corresponde ao solicitado',
        1,
      ),
    ).toThrow(/mudou/);
    reviewDemoRequest(
      data.email,
      'sistemas',
      'REJECTED',
      'Perfil não corresponde ao solicitado',
      2,
    );
    profile = listDemoProfiles()[0];
    expect(profile.requests.map((request) => request.status)).toEqual(['APPROVED', 'REJECTED']);
    const { unmount } = renderApp('/professores', { authenticated: true });
    await screen.findByText(data.name);
    expect(screen.queryByRole('button', { name: '+ Novo Professor' })).not.toBeInTheDocument();
    unmount();
  });
  it('nao anuncia criacao quando a persistencia falha', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    try {
      await expect(
        registerDemo(registrationFixture(), TEST_PASSWORD, TEST_PASSWORD, true, true),
      ).rejects.toThrow(/salvar/);
    } finally {
      spy.mockRestore();
    }
    expect(listDemoProfiles()).toEqual([]);
  });
  it('o cadastro real da interface preserva campos, exige aceite explicito e abre a area de professor', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/cadastro');
    const fill = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText(/Informe seu nome completo/)).toBeInTheDocument();
    fill('Nome completo', 'Professor de Teste');
    fill('E-mail', 'professor@profly.test');
    fill('Telefone com DDD', '83900000000');
    fill('Crie uma senha', TEST_PASSWORD);
    fill('Confirme a senha', TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('E-mail', { exact: true })).toHaveValue('professor@profly.test');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Titulação 1' }),
      'Mestrado',
    );
    fill('Curso ou área de formação 1', 'Direito');
    fill('Instituição 1', 'Instituição de Teste');
    fill('Ano de conclusão 1', '2020');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Conhecimento' }),
      'Direito Civil',
    );
    await user.click(screen.getByRole('button', { name: 'Adicionar conhecimento' }));
    for (const title of ['Experiência docente', 'Experiência profissional'])
      await user.selectOptions(
        within(screen.getByRole('group', { name: title })).getByRole('combobox'),
        'NONE',
      );
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('checkbox', { name: 'Direito' }));
    await user.click(screen.getByRole('checkbox', { name: 'Direito Civil I' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar horário' }));
    fill('Dedicação pretendida (horas por semana)', '20');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('button', { name: 'Criar conta e solicitar acesso' }));
    expect(screen.getByText('Aceite os Termos de uso para continuar.')).toBeInTheDocument();
    expect(localStorage.getItem(REGISTRATION_KEY)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Aviso de privacidade' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(LEGAL_VERSION);
    await user.click(screen.getByRole('button', { name: 'Voltar ao cadastro' }));
    expect(screen.getByRole('checkbox', { name: /Li e aceito/ })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /Li e aceito/ }));
    await user.click(screen.getByRole('checkbox', { name: /Li o Aviso/ }));
    await user.click(screen.getByRole('button', { name: 'Criar conta e solicitar acesso' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/inicio'), { timeout: 5000 });
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!).role).toBe('teacher');
    expect(await screen.findByText('Aguardando análise')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Professores' }),
    ).not.toBeInTheDocument();
  }, 15000);
});
