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

Qualquer outra rota redireciona para `/login`.

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
