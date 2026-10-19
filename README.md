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

## Solicitação de cadastro (WhatsApp)

Na tela de login, o link **“Cadastrar?”** (logo abaixo do logo da UNIFACISA) abre uma conversa no
WhatsApp com o coordenador (`https://wa.me/5583986693221`), já com a mensagem:

> Olá! Sou professor e gostaria de solicitar meu cadastro no ProFly para ter acesso ao sistema.
> Como posso prosseguir?

O link `wa.me` funciona no celular (aplicativo) e no desktop (WhatsApp Web ou aplicativo) e abre em
nova aba. O ProFly não envia nenhum dado; número e mensagem ficam em
`src/features/auth/registrationRequest.ts`.

### Fluxo futuro (não implementado)

Hoje o cadastro de professores (`src/features/teachers`) guarda apenas dados cadastrais (nome,
e-mail, contato, área de atuação, carga horária e status), sem conta de acesso, e o único login é
o do coordenador de demonstração. Quando houver back-end, o fluxo deverá:

1. Permitir ao coordenador criar a **conta de acesso vinculada ao professor** (a partir do
   cadastro existente, usando o e-mail do professor).
2. Enviar um **convite seguro** (link de uso único e com validade) para que o **próprio professor
   defina sua senha**.
3. Nunca gerar, exibir ou trafegar senhas pelo front-end nem pelo WhatsApp.

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
