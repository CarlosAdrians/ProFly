/** Dados de contato editaveis da conta demonstrativa; autorizacao permanece definida pelo sistema. */
export interface Account {
  name: string;
  /** E-mail de acesso utilizado no próximo login da demonstração. */
  email: string;
  phone?: string;
  /** Perfil de acesso (ex.: Coordenador); definido pelo sistema. */
  role?: string;
}

/** Campos que o próprio usuário pode alterar. */
export type AccountInput = Pick<Account, 'name' | 'phone'> & { email?: string };
