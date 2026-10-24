# ProFly

Sistema web de apoio à gestão e à alocação de professores, competências e disciplinas da UNIFACISA.

O projeto nasceu para atender à coordenação do curso de Direito. A nova direção é expandir esse atendimento para toda a faculdade, contemplando vários cursos e coordenações. Essa expansão está em definição: a implementação disponível ainda é um front-end de demonstração voltado ao cenário original.

## Comece por aqui

- [Estado e funcionamento do front-end](docs/FRONTEND_ATUAL.md): telas, regras existentes, armazenamento e limites da demonstração.
- [Expansão para toda a faculdade](docs/EXPANSAO_INSTITUCIONAL.md): proposta inicial, impactos, decisões em aberto e etapas sugeridas.
- [Definição do back-end](docs/BACKEND.md): decisões confirmadas, responsabilidades, modelo conceitual e regras pendentes.
- [Proposta de compatibilidade docente](docs/PROPOSTA_COMPATIBILIDADE.md): campos do perfil, requisitos por disciplina, árvore de elegibilidade e score ilustrado para discutir com a coordenação.
- [Protótipos e referências originais](docs/prototipos/README.md).
- [Resumo acadêmico do projeto](docs/prototipos/Resumo%20Expandido%20ProFly.pdf).
- [Referência do Figma](docs/prototipos/FIGMA.md).

## Qual problema o ProFly procura resolver?

A distribuição de disciplinas exige cruzar área de atuação, competências, disponibilidade e carga horária dos professores. Quando essas informações ficam dispersas, a coordenação precisa conferir manualmente conflitos e possibilidades de alocação.

A proposta original é centralizar as informações e apresentar professores possíveis para cada necessidade. A decisão final de alocação permanece com a coordenação. O resumo acadêmico também prevê disponibilidade, recomendações e histórico, mas esses módulos ainda não foram implementados nesta base.

## Situação do repositório

Leitura inicial realizada em **23/10/2026**, a partir do repositório [CarlosAdrians/ProFly](https://github.com/CarlosAdrians/ProFly).

| Referência examinada | Conteúdo encontrado |
| --- | --- |
| `main` em `19f5b7b` | Documentação, protótipos em PDF e recursos visuais; sem aplicação executável. |
| `claude/pensive-dirac-5rithn` em `6e78ca6` | Front-end React, serviços locais, componentes e testes automatizados. Base utilizada nesta leitura. |
| `docs/leitura-inicial` | Branch local criada a partir do front-end para organizar esta documentação. |

Essas referências descrevem a fotografia inicial do repositório e podem mudar com novos commits. Para baixar a implementação examinada diretamente:

```bash
git clone --branch claude/pensive-dirac-5rithn https://github.com/CarlosAdrians/ProFly.git
cd ProFly
```

## O que existe hoje

| Área | Comportamento atual |
| --- | --- |
| Login | Autenticação simulada de um coordenador fictício e proteção das rotas no navegador. |
| Recuperação de senha | Formulário demonstrativo; não envia e-mail. |
| Conta | Consulta do perfil, edição do nome e encerramento da sessão. |
| Professores | Listagem, pesquisa por nome, cadastro, edição e ativação/inativação. |
| Disciplinas | Listagem, pesquisa por nome, cadastro, edição e ativação/inativação; códigos gerados com prefixo `DIR`. |
| Convites | Geração e consulta locais de links de convite; tela para informar uma senha. A ativação da conta está bloqueada até a integração com o back-end. |

**Ainda não implementado:** gestão de cursos e coordenações, permissões por curso, acesso efetivo do professor, cadastro estruturado de competências, disponibilidade, calendário, recomendações, alocações, histórico e dashboard.

Os PDFs incluem algumas dessas telas futuras; sua presença nos protótipos não significa que exista uma funcionalidade correspondente no código.

## Como executar o front-end

Use Node.js e npm. Como referência de ambiente para esta base, adote Node.js 24; as dependências têm requisitos próprios registrados no `package-lock.json`.

```bash
npm ci
npm run dev
```

Abra o endereço informado pelo Vite no terminal. Não há back-end, banco de dados ou arquivo `.env` exigido pela implementação atual.

### Acesso de demonstração

- E-mail: `felipe.araujo@profly.test`
- Senha: `profly123`

São credenciais fictícias, definidas em `src/mocks/coordinator.ts`. O login demonstrativo não oferece autenticação segura para uso institucional.

### Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | Checagem de tipos e geração do build. |
| `npm run preview` | Visualização local do build. |
| `npm run lint` | Análise com ESLint. |
| `npm run typecheck` | Checagem de tipos com TypeScript. |
| `npm run format:check` | Conferência de formatação com Prettier. |
| `npm test` | Execução dos testes existentes com Vitest. |

### Rotas existentes

| Rota | Acesso |
| --- | --- |
| `/login` | Público; redireciona sessões já autenticadas. |
| `/esqueceu-senha` | Público. |
| `/convite/:token` | Público; consulta um convite armazenado localmente. |
| `/conta` | Coordenador. |
| `/professores` | Coordenador. |
| `/disciplinas` | Coordenador. |

Após o login, o destino é `/professores`. A raiz e as rotas desconhecidas levam ao login ou à tela de professores quando já existe sessão. Não existem rotas para dashboard, calendário ou alocações.

## Tecnologias e organização

React 19, TypeScript, Vite 8, React Router 7, CSS Modules e variáveis CSS. A base usa Vitest e Testing Library para testes, além de ESLint e Prettier.

```text
public/images/       Identidade visual, ícones e imagens
src/app/             Rotas e navegação
src/components/      Componentes reutilizáveis
src/layouts/         Estruturas das telas públicas e internas
src/features/        auth, account, teachers, subjects e invites
src/services/        Armazenamento e coleções locais
src/mocks/           Dados fictícios da demonstração
src/styles/          Tokens visuais e estilos globais
src/test/            Configuração e utilitários de testes
docs/                Documentação de funcionamento e evolução
docs/prototipos/     Referências originais
```

Em **24/10/2026**, foram definidos **Node.js para o back-end e MongoDB para o banco de dados**. A configuração do banco ficará com outro integrante do grupo, com contratos de integração combinados entre as partes. A implementação atual ainda não contém esses serviços nem uma conexão com o banco. Consulte a [definição do back-end](docs/BACKEND.md).

## Limites importantes da demonstração

- Professores, disciplinas, dados editáveis da conta e convites ficam no `localStorage`; a sessão fica no `sessionStorage`.
- Os dados não são compartilhados entre computadores, navegadores ou origens diferentes. Um link de convite enviado a outro navegador não leva os dados locais junto.
- O único login disponível é o do coordenador fictício. O tipo de sessão prevê `teacher`, mas não existe login funcional nem área interna habilitada para professores.
- A criação de senha falha deliberadamente enquanto o serviço de ativação não estiver integrado. Nenhuma senha é persistida e o convite continua pendente.
- A solicitação de cadastro abre o WhatsApp de um contato fixo; o sistema não envia a mensagem automaticamente.
- Os controles do navegador não substituem autenticação e autorização no servidor.

## Próxima etapa: definir o funcionamento institucional

Os perfis definidos são **administrador, coordenador e professor**. O administrador cadastra cursos e coordenadores e define responsabilidades. Cada coordenador cadastra professores e disciplinas nos cursos que gerencia. O professor completa seu próprio cadastro com informações de atuação, conhecimentos e disponibilidade e consulta sua escala. O fluxo de convite e os detalhes de validação estão propostos na [definição do back-end](docs/BACKEND.md).

A entrada do professor exige análise da coordenação: ele solicita participação indicando curso e disciplinas, e a coordenação aprova, pede ajustes ou recusa. Antes da aprovação, o acesso fica limitado aos próprios dados e solicitações. Também foi definido o envio de ausência com atestado pela área do professor: o afastamento afeta a disponibilidade nas datas aplicáveis e preserva o score acadêmico.

O front-end deve preservar a estética atual e aproveitar os componentes de modal existentes para cadastros. Estão previstas as telas de alocações e calendário, com seleção de dia e turno e cartões de aula que possam ser adicionados, editados e movimentados.

A dashboard do professor deve reunir escala, solicitação de entrada, perfil acadêmico, disponibilidade e comunicação de ausência. O cadastro será proposto por etapas, com formação, competências e experiências úteis à recomendação. A [proposta de compatibilidade](docs/PROPOSTA_COMPATIBILIDADE.md) apresenta uma fórmula inicial e um exemplo fictício; a validação com a coordenação ainda está pendente.

Também foi definido o histórico das últimas 10 aulas na dashboard, reunindo os cursos do professor e permitindo acessar o histórico completo. A proposta detalha vários nós de elegibilidade alimentados pelos dados do cadastro; os três grupos de pontuação resumem seus fatores, sem limitar a árvore a três perguntas. O recorte de 10 aulas é apenas visual; a experiência considera o histórico pertinente confirmado conforme regras próprias.

A prioridade atual é concluir a definição do back-end e estruturar os fluxos do front-end. As regras de disponibilidade, publicação da escala e cálculo da compatibilidade estão destacadas no [documento do back-end](docs/BACKEND.md). O [documento de expansão](docs/EXPANSAO_INSTITUCIONAL.md) mantém o contexto dessa evolução.

Esta entrega organiza a leitura e a documentação. O comportamento e a aparência da aplicação foram preservados. A conferência foi documental e estática; build, testes e navegação no navegador não foram executados nesta etapa.
