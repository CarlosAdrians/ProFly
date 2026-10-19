/** Rotas das telas implementadas no escopo atual. */
export const paths = {
  login: '/login',
  forgotPassword: '/esqueceu-senha',
  account: '/conta',
  teachers: '/professores',
  subjects: '/disciplinas',
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];
