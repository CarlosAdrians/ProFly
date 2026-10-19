import { teachersSeed } from '../../../mocks/teachers';
import { teacherService, TEACHERS_STORAGE_KEY } from '../../teachers/services/teacherService';
import {
  completeInvite,
  getOrCreateInvite,
  INVITES_STORAGE_KEY,
  InviteUnavailableError,
  lookupInvite,
} from './inviteService';
import {
  accountActivationGateway,
  AccountActivationUnavailableError,
} from './accountActivationGateway';

const ana = teachersSeed.find((teacher) => teacher.id === 't01')!; // ativa
const elisa = teachersSeed.find((teacher) => teacher.id === 't05')!; // inativa

describe('inviteService (demonstração local)', () => {
  it('gera um identificador aleatório associado ao professor e o reaproveita enquanto pendente', async () => {
    const first = await getOrCreateInvite(ana);
    expect(first.token).toMatch(/^[a-f0-9]{32}$/);
    expect(first).toMatchObject({ teacherId: 't01', email: ana.email, status: 'pending' });
    const again = await getOrCreateInvite(ana);
    expect(again.token).toBe(first.token);
    const other = await getOrCreateInvite(teachersSeed[1]);
    expect(other.token).not.toBe(first.token);
  });

  it('não gera convite para professor inativo', async () => {
    await expect(getOrCreateInvite(elisa)).rejects.toThrow(/inativo/);
  });

  it('confere o link e expõe apenas nome e e-mail do professor do convite', async () => {
    const invite = await getOrCreateInvite(ana);
    expect(await lookupInvite(invite.token)).toEqual({
      status: 'valid',
      token: invite.token,
      teacherName: ana.name,
      email: ana.email,
    });
  });

  it('recusa links com formato inválido ou desconhecidos', async () => {
    expect(await lookupInvite('')).toEqual({ status: 'invalid' });
    expect(await lookupInvite('abc')).toEqual({ status: 'invalid' });
    expect(await lookupInvite('../professores')).toEqual({ status: 'invalid' });
    expect(await lookupInvite('0'.repeat(32))).toEqual({ status: 'invalid' });
  });

  it('invalida o convite se o professor mudar de e-mail ou for inativado', async () => {
    const invite = await getOrCreateInvite(ana);
    await teacherService.update('t01', { email: 'outro@profly.test' });
    expect(await lookupInvite(invite.token)).toEqual({ status: 'unavailable' });

    await teacherService.update('t01', { email: ana.email, status: 'inactive' });
    expect(await lookupInvite(invite.token)).toEqual({ status: 'unavailable' });
  });

  it('invalida o convite se o professor não existir mais', async () => {
    await teacherService.list(); // grava os professores fictícios
    const invite = await getOrCreateInvite(ana);
    const remaining = JSON.parse(localStorage.getItem(TEACHERS_STORAGE_KEY)!).filter(
      (teacher: { id: string }) => teacher.id !== 't01',
    );
    localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(remaining));
    expect(await lookupInvite(invite.token)).toEqual({ status: 'unavailable' });
  });

  describe('conclusão (completeInvite)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('sem serviço de autenticação integrado, falha e mantém o convite pendente', async () => {
      const invite = await getOrCreateInvite(ana);
      await expect(completeInvite(invite.token, 'Direito2026')).rejects.toBeInstanceOf(
        AccountActivationUnavailableError,
      );
      expect(await lookupInvite(invite.token)).toMatchObject({ status: 'valid' });
      expect(JSON.parse(localStorage.getItem(INVITES_STORAGE_KEY)!)[0].status).toBe('pending');
    });

    it('não consome o convite se a ativação falhar por qualquer motivo', async () => {
      vi.spyOn(accountActivationGateway, 'activateTeacherAccount').mockRejectedValue(
        new Error('falha de rede'),
      );
      const invite = await getOrCreateInvite(ana);
      await expect(completeInvite(invite.token, 'Direito2026')).rejects.toThrow('falha de rede');
      expect(await lookupInvite(invite.token)).toMatchObject({ status: 'valid' });
    });

    it('ativa a conta do professor do convite e só então consome o convite', async () => {
      const order: string[] = [];
      const activate = vi
        .spyOn(accountActivationGateway, 'activateTeacherAccount')
        .mockImplementation(async () => {
          order.push(`ativação (convite ${(await lookupInvite(invite.token)).status})`);
        });
      const invite = await getOrCreateInvite(ana);
      await completeInvite(invite.token, 'Direito2026');

      expect(activate).toHaveBeenCalledWith({
        token: invite.token,
        teacherId: 't01',
        email: ana.email,
        password: 'Direito2026',
      });
      expect(order).toEqual(['ativação (convite valid)']);
      expect(await lookupInvite(invite.token)).toEqual({ status: 'used' });
      const stored = JSON.parse(localStorage.getItem(INVITES_STORAGE_KEY)!);
      expect(stored[0]).toMatchObject({ status: 'used' });
      expect(JSON.stringify(stored)).not.toContain('Direito2026');
    });

    it('impede a reutilização de um convite já utilizado', async () => {
      const activate = vi
        .spyOn(accountActivationGateway, 'activateTeacherAccount')
        .mockResolvedValue();
      const invite = await getOrCreateInvite(ana);
      await completeInvite(invite.token, 'Direito2026');
      await expect(completeInvite(invite.token, 'OutraSenha1')).rejects.toBeInstanceOf(
        InviteUnavailableError,
      );
      expect(activate).toHaveBeenCalledTimes(1);
      // Um novo convite pode ser gerado depois do uso.
      expect((await getOrCreateInvite(ana)).token).not.toBe(invite.token);
    });

    it.each([
      ['inválido', 'abc'],
      ['inexistente', '0'.repeat(32)],
    ])('recusa convite %s sem chamar a ativação', async (_, token) => {
      const activate = vi.spyOn(accountActivationGateway, 'activateTeacherAccount');
      await expect(completeInvite(token, 'Direito2026')).rejects.toBeInstanceOf(
        InviteUnavailableError,
      );
      expect(activate).not.toHaveBeenCalled();
    });

    it.each([
      ['inativo', { status: 'inactive' as const }],
      ['com e-mail divergente', { email: 'outro@profly.test' }],
    ])('recusa convite de professor %s sem chamar a ativação', async (_, changes) => {
      const activate = vi.spyOn(accountActivationGateway, 'activateTeacherAccount');
      const invite = await getOrCreateInvite(ana);
      await teacherService.update('t01', changes);
      await expect(completeInvite(invite.token, 'Direito2026')).rejects.toBeInstanceOf(
        InviteUnavailableError,
      );
      expect(activate).not.toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem(INVITES_STORAGE_KEY)!)[0].status).toBe('pending');
    });
  });
});
