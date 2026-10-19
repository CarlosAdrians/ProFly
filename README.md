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

A autenticação é **simulada** (sem back-end). Use o coordenador fictício definido em
`src/mocks/coordinator.ts`:

- E-mail: `felipe.araujo@profly.test`
- Senha: `profly123`

A sessão fica no `sessionStorage` do navegador e termina ao fechar a aba. As rotas `/conta`,
`/professores` e `/disciplinas` exigem sessão. A recuperação de senha apenas exibe uma mensagem;
nenhum e-mail é enviado.

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

- **Nome** e **Código** são obrigatórios; nome com 3 a 100 caracteres.
- O código é salvo em maiúsculas e aceita de 2 a 20 caracteres (letras sem acento, números, ponto
  ou hífen).
- **Sem duplicidade:** não podem existir duas disciplinas — ativas ou inativas — com o mesmo código
  ou com o mesmo nome. A comparação ignora maiúsculas, acentos e espaços extras. Para reutilizar
  uma disciplina inativa, reative-a.

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
