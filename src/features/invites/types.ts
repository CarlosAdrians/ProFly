/**
 * Convite de acesso de um professor (demonstração local).
 * ATENÇÃO: sem back-end, o convite vive apenas no localStorage deste navegador e o
 * identificador do link NÃO é um token seguro. Emissão, validade, uso único e
 * ativação da conta deverão ser feitos pelo servidor.
 */
export interface Invite {
  id: string;
  /** Identificador aleatório usado no link (não é credencial segura). */
  token: string;
  teacherId: string;
  /** E-mail do professor no momento da geração; se mudar, o convite deixa de valer. */
  email: string;
  createdAt: string;
  status: 'pending' | 'used';
  usedAt?: string;
}

/** Resultado da conferência de um link de convite. */
export type InviteLookup =
  | { status: 'valid'; token: string; teacherName: string; email: string }
  | { status: 'invalid' } // formato inválido ou convite desconhecido
  | { status: 'used' } // já utilizado
  | { status: 'unavailable' }; // professor removido, inativo ou com e-mail alterado
