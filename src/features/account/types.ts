/**
 * Dados cadastrais do usuário autenticado disponíveis no projeto
 * (sessão demonstrativa + coordenador fictício). Outros campos do protótipo
 * (contato, área de atuação, carga horária, "sobre mim") ainda não foram definidos.
 */
export interface Account {
  name: string;
  /** E-mail de acesso: identifica o usuário no login; não é editável nesta tela. */
  email: string;
  /** Perfil de acesso (ex.: Coordenador); definido pelo sistema. */
  role?: string;
}

/** Campos que o próprio usuário pode alterar. */
export type AccountInput = Pick<Account, 'name'>;
