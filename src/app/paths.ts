/** Rotas das telas implementadas no escopo atual. */
export const paths = {
  login: '/login',
  forgotPassword: '/esqueceu-senha',
  account: '/conta',
  teachers: '/professores',
  subjects: '/disciplinas',
  register: '/cadastro',
  teacherHome: '/inicio',
  calendar: '/calendario',
  allocations: '/alocacoes',
  terms: '/termos-de-uso',
  privacy: '/privacidade',
  settings: '/configuracoes',
  availability: '/disponibilidade',
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];

/** Destino após o login simulado. */
export const postLoginPath: AppPath = paths.teachers;

/** Rota pública em que o professor cria a senha a partir do link de convite. */
export const invitePath = '/convite/:token';

export function buildInvitePath(token: string): string {
  return `/convite/${encodeURIComponent(token)}`;
}
