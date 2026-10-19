import { teachersSeed } from '../../../mocks/teachers';
import { teacherService, TEACHERS_STORAGE_KEY } from '../../teachers/services/teacherService';
import {
  completeInvite,
  getOrCreateInvite,
  INVITES_STORAGE_KEY,
  lookupInvite,
} from './inviteService';

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

  it('marca o convite como utilizado e impede reutilização', async () => {
    const invite = await getOrCreateInvite(ana);
    await completeInvite(invite.token);
    expect(await lookupInvite(invite.token)).toEqual({ status: 'used' });
    await expect(completeInvite(invite.token)).rejects.toThrow();
    const stored = JSON.parse(localStorage.getItem(INVITES_STORAGE_KEY)!);
    expect(stored[0]).toMatchObject({ status: 'used' });
    expect(Object.keys(stored[0]).sort()).toEqual(
      ['createdAt', 'email', 'id', 'status', 'teacherId', 'token', 'usedAt'].sort(),
    );
    // Um novo convite pode ser gerado depois do uso.
    expect((await getOrCreateInvite(ana)).token).not.toBe(invite.token);
  });
});
