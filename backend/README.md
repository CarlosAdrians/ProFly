# Back-end do ProFly

API Node.js com TypeScript, Fastify, validacao Zod e driver oficial do MongoDB. Modulo independente do front-end, com dependencias e lockfile proprios.

## Estrutura

```text
src/config.ts          Configuracao validada, sem credenciais padrao
src/database.ts        Conexao, indices e fronteira de transacao
src/app.ts             Composicao HTTP, protecoes, erros e health checks
src/server.ts          Inicializacao e encerramento
src/shared/            Erros e validacao de contratos
src/identity/          Contas, sessoes, convites, cursos e responsabilidades
test/                  Testes unitarios e integracao explicitamente habilitada
scripts/               Exportacao do contrato OpenAPI e administrador inicial
docs/openapi.json      Contrato gerado das rotas implementadas
```

## Executar

Requisitos: Node.js 24+, pnpm 11.25 e MongoDB com suporte a transacoes. O integrante responsavel pelo banco deve fornecer URI e banco de desenvolvimento apropriados.

Na pasta backend:

```bash
pnpm install
```

Copiar .env.example para .env local e ajustar os valores com o responsavel pelo banco. O exemplo nao contem credenciais reais. Depois:

```bash
pnpm dev
```

O servidor recusa configuracao incompleta e MongoDB standalone sem suporte a transacoes. Nao troca uma falha do banco por persistencia simulada.

## Verificacoes

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test:unit
pnpm format:check
pnpm openapi
```

Os testes unitarios nao iniciam banco nem fazem download. A integracao precisa ser habilitada explicitamente. Em PowerShell:

```powershell
$env:PROFLY_RUN_INTEGRATION = '1'
pnpm test:integration
```

Esse comando inicia um replica set MongoDB efemero, local, usado exclusivamente pelos testes, e encerra seus processos ao terminar. O primeiro uso pode baixar um binario oficial. Nenhuma credencial da faculdade e utilizada. O banco de teste precisa ter nome terminado em _test; testes padrao nao usam banco de producao.

## Identidade e acesso institucional

O primeiro administrador e criado explicitamente com `pnpm create-admin`, usando BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD no ambiente local. O comando exige MongoDB conectado, nao fornece senha padrao e recusa sobrescrever um administrador existente. Remover as variaveis de bootstrap depois do uso.

O administrador cadastra cursos e convida coordenadores para cursos especificos. O token do convite e retornado uma unica vez ao administrador para entrega por canal apropriado. Convites expiram em 48 horas e sao de uso unico. A consulta de convite nao retorna senha nem papeis administrativos editaveis.

Sessoes usam cookie HttpOnly/SameSite Strict (Secure em producao), token aleatorio com hash no banco e CSRF nas alteracoes autenticadas. Senhas usam scrypt; desativacao da conta e redefinicao de senha revogam sessoes. As permissoes e os vinculos ativos sao consultados no servidor. Atualizacoes administrativas exigem expectedVersion e rejeitam versoes antigas.

**Dependencia ainda pendente:** o servidor principal nao possui adaptador de envio de e-mail configurado. Cadastro publico, reenvio de verificacao e recuperacao de senha retornam 503 EMAIL_UNAVAILABLE nessa situacao. A porta Notifications existe e foi exercitada com mensagens sinteticas capturadas apenas pelos testes; nenhum e-mail real foi enviado. A verificacao de e-mail ativa somente a identidade, sem aprovar participacao em cursos.

## Rotas implementadas

| Rota | Funcao |
| --- | --- |
| GET /health/live | Processo HTTP respondendo. |
| GET /health/ready | Confere acesso ao MongoDB. |
| GET /openapi.json | Especificacao gerada das rotas reais. |
| POST /api/v1/auth/register | Solicita identidade docente e verificacao de e-mail. |
| POST /api/v1/auth/login e /logout | Abre/encerra sessao; GET /auth/session consulta a sessao. |
| POST /api/v1/auth/verify-email e /resend-verification | Confirma identidade ou solicita novo envio. |
| POST /api/v1/auth/forgot-password e /reset-password | Recuperacao por token temporario de uso unico. |
| POST /api/v1/auth/invites/lookup e /accept | Consulta e ativacao de convite. |
| GET /api/v1/catalog/courses | Catalogo publico limitado de cursos ativos. |
| GET /api/v1/courses | Cursos acessiveis ao usuario autenticado. |
| POST /api/v1/admin/courses | Cadastro de curso pelo administrador. |
| PATCH /api/v1/admin/courses/:courseId | Atualizacao versionada do curso. |
| POST /api/v1/admin/coordinators | Cadastro/convite e atribuicao de coordenacao. |
| GET /api/v1/courses/:courseId/coordinators | Coordenadores do curso autorizado. |
| PATCH /api/v1/admin/courses/:courseId/coordinators/:userId | Ativa/revoga responsabilidade com controle de versao. |
| PATCH /api/v1/admin/users/:userId/state | Desativa/reativa identidade; protege o ultimo administrador. |
| GET /api/v1/admin/users | Consulta administrativa paginada, sem hashes ou tokens. |

Os prefixos /api/v1 se aplicam aos caminhos abreviados na tabela. Contratos completos de entrada estao em [openapi.json](docs/openapi.json). Perfil docente, aprovacao por curso e demais modulos ainda estao pendentes. A interface existente continua demonstrativa e ainda nao usa estas rotas.

## Decisoes tecnicas

As validacoes rejeitam campos extras e tipos incorretos, sem remover silenciosamente dados enviados pelo cliente. Essa configuracao foi conferida na [documentacao do Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

As operacoes consistentes entre documentos usam a fronteira de transacao do [driver oficial do MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/). Ativacao de token, estado da identidade e vinculos usam guardas transacionais. As regras de concorrencia das alocacoes ainda precisam de implementacao e testes especificos.

Scripts de dependencias sao permitidos individualmente em pnpm-workspace.yaml: esbuild para a ferramenta TypeScript; o download automatico do MongoDB no postinstall fica desabilitado, sendo feito somente na integracao explicita. A politica segue o [controle de builds do pnpm](https://github.com/pnpm/pnpm.io/blob/main/docs/settings/build.md).

O estado do projeto e dos testes esta em [STATUS.md](../docs/validation/STATUS.md). As regras de produto permanecem na [spec](../docs/specs/BACKEND_V1.md).
