import { createLocalCollection } from '../../../services/localCollection';
import { simulateLatency } from '../../../services/storage';
import { teacherService } from '../../teachers/services/teacherService';
import type { Teacher } from '../../teachers/types';
import type { Invite, InviteLookup } from '../types';

export const INVITES_STORAGE_KEY = 'profly:invites';

/** 32 caracteres hexadecimais (128 bits aleatórios). */
const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

const invites = createLocalCollection<Invite>(INVITES_STORAGE_KEY, () => []);

/**
 * Identificador aleatório para o link. Mesmo usando crypto.getRandomValues, ele é
 * criado e guardado no navegador: NÃO deve ser tratado como token seguro.
 */
function createToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Gera (ou reaproveita, se ainda pendente) o convite do professor.
 * No back-end real: o servidor emitirá o convite com validade e uso único.
 */
export async function getOrCreateInvite(teacher: Teacher): Promise<Invite> {
  if (teacher.status !== 'active') throw new Error('Professor inativo não pode receber convite.');
  const pending = (await invites.list()).find(
    (invite) =>
      invite.teacherId === teacher.id &&
      invite.status === 'pending' &&
      sameEmail(invite.email, teacher.email),
  );
  if (pending) return pending;
  return invites.create({
    token: createToken(),
    teacherId: teacher.id,
    email: teacher.email,
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
}

/**
 * Confere o link: o convite precisa existir, estar pendente e continuar associado
 * ao mesmo professor (ativo e com o mesmo e-mail). Retorna apenas nome e e-mail
 * desse professor — nenhum outro dado é exposto.
 */
export async function lookupInvite(token: string): Promise<InviteLookup> {
  if (!TOKEN_PATTERN.test(token)) return { status: 'invalid' };
  const invite = (await invites.list()).find((item) => item.token === token);
  if (!invite) return { status: 'invalid' };
  if (invite.status === 'used') return { status: 'used' };

  const teacher = (await teacherService.list()).find((item) => item.id === invite.teacherId);
  if (!teacher || teacher.status !== 'active' || !sameEmail(teacher.email, invite.email)) {
    return { status: 'unavailable' };
  }
  return { status: 'valid', token, teacherName: teacher.name, email: teacher.email };
}

/**
 * Conclusão simulada: apenas marca o convite como utilizado.
 * A senha NÃO é enviada, salva nem transformada aqui; sem back-end, nenhuma conta é
 * ativada e o professor não ganha acesso ao sistema.
 */
export async function completeInvite(token: string): Promise<void> {
  const lookup = await lookupInvite(token);
  if (lookup.status !== 'valid') throw new Error('Convite indisponível.');
  await simulateLatency(300);
  const invite = (await invites.list()).find((item) => item.token === token)!;
  await invites.update(invite.id, { status: 'used', usedAt: new Date().toISOString() });
}
