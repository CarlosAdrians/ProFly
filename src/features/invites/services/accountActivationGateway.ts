/**
 * Porta de ativação da conta do professor (criação de senha a partir do convite).
 *
 * O projeto ainda não tem back-end integrado, e o navegador não consegue guardar
 * senhas nem autenticar com segurança. Por isso a implementação padrão SEMPRE falha
 * com AccountActivationUnavailableError: nenhuma senha é aceita como criada.
 *
 * Contrato esperado da implementação real (a cargo do back-end, executado de forma
 * atômica no servidor):
 * 1. validar o token do convite (existente, pendente, dentro da validade);
 * 2. confirmar que o professor existe, está ativo e tem o e-mail do convite;
 * 3. aplicar a política de senha e gravar a senha somente como hash;
 * 4. ativar a conta vinculada ao professor com o perfil "teacher";
 * 5. marcar o convite como utilizado.
 * Em caso de erro, nada disso pode ficar parcialmente aplicado. Nenhum endpoint é
 * presumido aqui: basta substituir `accountActivationGateway` pela implementação real.
 */
export interface ActivateTeacherAccountInput {
  token: string;
  teacherId: string;
  email: string;
  password: string;
}

export interface AccountActivationGateway {
  activateTeacherAccount(input: ActivateTeacherAccountInput): Promise<void>;
}

export class AccountActivationUnavailableError extends Error {
  constructor() {
    super('A ativação de contas depende do serviço de autenticação, ainda não integrado.');
    this.name = 'AccountActivationUnavailableError';
  }
}

export const accountActivationGateway: AccountActivationGateway = {
  async activateTeacherAccount() {
    throw new AccountActivationUnavailableError();
  },
};
