# ProFly — front-end

Sistema web de apoio à alocação de professores e competências do curso de Direito da UNIFACISA.
Esta etapa contempla apenas o front-end, com dados fictícios e sem back-end.

## Escopo atual

Login, Esqueceu senha, Conta, Professores e Disciplinas. O menu exibe apenas Conta, Professores
e Disciplinas; Dashboard, Calendário e Alocações estão fora do escopo atual e não possuem rota.
Após o login simulado, o usuário é levado para `/professores`.

| Rota              | Tela           |
| ----------------- | -------------- |
| `/login`          | Login          |
| `/esqueceu-senha` | Esqueceu senha |
| `/conta`          | Conta          |
| `/professores`    | Professores    |
| `/disciplinas`    | Disciplinas    |

Qualquer outra rota redireciona para `/login` (ou para `/professores`, se houver sessão).

## Acesso de demonstração

A autenticação é **simulada** (sem back-end) e **não é segura para produção**: a credencial
fica no código do navegador e a sessão não é assinada. A tela de login exibe o aviso
“Ambiente de demonstração”. Use o coordenador fictício definido em `src/mocks/coordinator.ts`:

- E-mail: `felipe.araujo@profly.test`
- Senha: `profly123`

A sessão fica no `sessionStorage` do navegador e termina ao fechar a aba. As rotas `/conta`,
`/professores` e `/disciplinas` exigem sessão. A recuperação de senha apenas exibe uma mensagem;
nenhum e-mail é enviado.

## Conta

Mostra os dados cadastrais disponíveis do usuário autenticado: **Nome completo** (editável),
**E-mail de acesso** e **Perfil** (somente leitura). As ações **Editar dados**, **Salvar
alterações** e **Cancelar** alternam entre visualização e edição; o nome é validado
(obrigatório, 3 a 100 caracteres) antes de salvar. O salvamento é simulado e grava apenas o nome
no `localStorage` (chave `profly:account`). Senha não é exibida nem editada.

**Sair da conta** encerra a sessão demonstrativa (remove `profly:session` do `sessionStorage`) e
volta ao login, sem apagar professores, disciplinas ou dados da conta no `localStorage`.

Ainda sem definição (não implementados): contato, área de atuação, carga horária, “sobre mim” e
foto do usuário (presentes no protótipo), troca de e-mail de acesso e troca de senha — esses dois
últimos dependem do back-end.

## Solicitação de cadastro (WhatsApp)

Na tela de login, o link **“Cadastrar?”** (logo abaixo do logo da UNIFACISA) abre uma conversa no
WhatsApp com o coordenador (`https://wa.me/5583986693221`), já com a mensagem:

> Olá! Sou professor e gostaria de solicitar meu cadastro no ProFly para ter acesso ao sistema.
> Como posso prosseguir?

O link `wa.me` funciona no celular (aplicativo) e no desktop (WhatsApp Web ou aplicativo) e abre em
nova aba. O ProFly não envia nenhum dado; número e mensagem ficam em
`src/features/auth/registrationRequest.ts`.

### Convite e criação de senha

1. Em **Professores**, o coordenador abre o menu ⋮ de um professor **ativo** e escolhe
   **Gerar convite**. O ProFly cria um link `/convite/<identificador>` associado ao professor e ao
   e-mail dele (um link pendente é reaproveitado).
2. O coordenador clica em **Copiar link** e envia o link manualmente (e-mail, WhatsApp etc.).
3. O professor abre o link e vê a tela **Criar senha**, com o nome e o e-mail para conferência e
   os campos **Senha** e **Confirmar senha** (com mostrar/ocultar).
4. Política de senha proposta: 8 a 72 caracteres, com pelo menos uma letra e um número; a
   confirmação deve ser igual.
5. Ao enviar, o convite é conferido de novo e a criação da senha é delegada à porta de ativação
   (`src/features/invites/services/accountActivationGateway.ts`). **Somente se ela concluir** a
   tela mostra “Senha criada com sucesso!” e o convite é marcado como utilizado. Se falhar, a
   tela informa o erro e o convite continua pendente.

O link é recusado se for malformado, desconhecido, já utilizado, ou se o professor tiver sido
inativado, removido ou mudado de e-mail.

**Estado atual (sem back-end integrado):**

- A porta de ativação **sempre falha** (`AccountActivationUnavailableError`): o navegador não tem
  como guardar senhas nem autenticar com segurança. Portanto **a criação de senha não é
  concluída**, nenhuma conta é ativada e o convite não é consumido. A senha digitada não é
  gravada em lugar nenhum (nem em texto, nem no link).
- O **login do professor não está habilitado**: o login continua aceitando apenas o coordenador.
- O convite fica no `localStorage` (`profly:invites`) **deste navegador**. O identificador é
  aleatório, mas **não é um token seguro**.

**Perfis:** a sessão guarda o perfil (`coordinator` ou `teacher`). As telas internas atuais
(Professores, Disciplinas, Conta) exigem o perfil `coordinator`; sessões sem perfil ou com perfil
desconhecido são descartadas.

**Contrato esperado do back-end** (sem endpoints definidos aqui):

- _Ativação por convite_ — substituir `accountActivationGateway.activateTeacherAccount({ token,
teacherId, email, password })` por uma implementação que, de forma atômica no servidor, valide o
  token (existente, pendente, dentro da validade), confirme professor ativo com o mesmo e-mail,
  aplique a política de senha, grave a senha apenas como hash, ative a conta com perfil
  `teacher` e marque o convite como utilizado. Em erro, nada pode ficar parcialmente aplicado.
- _Emissão e consulta do convite_ — gerar o token seguro no servidor (com validade e uso único),
  enviar o e-mail e responder à consulta do link devolvendo só nome e e-mail do professor
  (hoje: `getOrCreateInvite` e `lookupInvite` em `inviteService.ts`).
- _Autenticação_ — substituir `authenticate` em `authService.ts` por um login que valide e-mail
  e senha no servidor e devolva a sessão com `name`, `email` e `role`.

## Professores

Listagem com dados fictícios (`src/mocks/teachers.ts`), pesquisa por nome (sem diferenciar acentos
e maiúsculas), cadastro, edição e ativação/inativação pelo menu **Opções (⋮)**. Os dados ficam no
`localStorage` (chave `profly:teachers`); para voltar aos dados iniciais, apague essa chave.

Validações do cadastro: todos os campos são obrigatórios; e-mail em formato válido e sem repetição;
contato com DDD (10 ou 11 dígitos); carga horária inteira entre 1 e 168 horas semanais (limite
físico, já que o limite institucional ainda não foi definido).

## Disciplinas

Listagem com dados fictícios (`src/mocks/subjects.ts`), pesquisa por nome, cadastro, edição e
ativação/inativação pelo menu **Opções (⋮)**. Dados no `localStorage` (chave `profly:subjects`).

Regras do cadastro:

- O usuário informa apenas o **Nome** (obrigatório, 3 a 100 caracteres).
- **Sem nomes duplicados:** não podem existir duas disciplinas — ativas ou inativas — com o mesmo
  nome. A comparação ignora maiúsculas, acentos e espaços extras. Para reutilizar uma disciplina
  inativa, reative-a.

### Código gerado automaticamente

O **Código** é definido pelo sistema no momento em que a nova disciplina é salva
(`src/features/subjects/codeGenerator.ts`):

1. Formato `DIR` + número com pelo menos 3 dígitos, compatível com os códigos existentes
   (`DIR101`, `DIR201`…). Os dígitos não têm significado institucional definido.
2. O número é o **maior número já usado + 1**, considerando todas as disciplinas guardadas,
   ativas e inativas. Com os dados fictícios, o primeiro código gerado é `DIR502`.
3. Números vagos (ex.: `DIR104`) **não são reaproveitados**.
4. Códigos fora do formato (ex.: `DIR-601`) são preservados, não entram na contagem e nunca são
   repetidos; se o código calculado já existir, o sistema usa o número seguinte.
5. O código aparece na listagem e no formulário sempre **somente para leitura**: no cadastro, o
   campo mostra “Gerado automaticamente ao salvar” e, depois de salvar, a mensagem informa o
   código definitivo. Na edição, o código existente é mantido mesmo que o nome mude.
6. Códigos já existentes, incluindo os 12 registros fictícios, nunca são alterados.

## Scripts

```bash
npm install
npm run dev          # servidor de desenvolvimento
npm run build        # checagem de tipos + build de produção
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format:check # Prettier
npm test             # Vitest
```

## Estrutura

```
public/images/        logo, brasão, foto do campus (provisória) e ícones do menu (extraídos dos protótipos)
src/app/              rotas, caminhos e itens do menu
src/layouts/          AuthLayout (telas de acesso) e AppLayout (menu lateral + conteúdo)
src/components/       componentes reutilizáveis (navigation/, ui/)
src/features/         uma pasta por funcionalidade (auth, account, teachers, subjects)
src/styles/           tokens.css (identidade visual) e global.css
docs/prototipos/      referências do protótipo (não alterar)
```
