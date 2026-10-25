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
src/notifications/     Configuracao e adaptador SMTP para verificacao/reset
src/teachers/          Perfil versionado, solicitacoes e analise por curso
src/academics/         Competencias, disciplinas, periodos, turmas e ofertas
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

A URI deve ficar somente em `backend/.env`, arquivo ignorado pelo Git. Nao coloque a conexao em variaveis `VITE_*` nem no codigo da interface. O arquivo local pode ser preenchido no editor sem compartilhar senha em mensagens. `ALLOWED_ORIGINS` precisa conter a origem exata informada pelo Vite; o exemplo inclui localhost:5173 e 127.0.0.1:5174.

Com o servidor iniciado, `GET http://127.0.0.1:3333/health/ready` deve responder `{"status":"ready"}`. Isso confirma acesso da API ao MongoDB, mas nao confirma que os formularios da interface estejam integrados: o adaptador demonstrativo continua independente. Nao execute suites de integracao contra esse banco; elas criam seu proprio replica set efemero.

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

O adaptador SMTP com Nodemailer esta implementado e integrado ao servidor. EMAIL_TRANSPORT=disabled e o padrao: cadastro publico, reenvio e recuperacao retornam 503 EMAIL_UNAVAILABLE quando o envio nao foi configurado. Para desenvolvimento foi preparada uma captura Mailpit local, com remetente ficticio profly@profly.test e caixa em http://127.0.0.1:8025, sem entrega externa. As credenciais institucionais ainda dependem da faculdade. A verificacao ativa somente a identidade, sem aprovar participacao em cursos. Configuracao, testes, contrato dos links e limites em [E-mail no backend](../docs/EMAIL_BACKEND.md); as telas e a integracao do frontend continuam pendentes.

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
| GET e PUT /api/v1/me/profile | Consulta/salva o proprio perfil e informa pendencias. |
| GET /api/v1/me/applications | Solicitações do proprio professor. |
| POST /api/v1/me/applications/:courseId | Submete disciplinas e versao do perfil para o curso. |
| POST /api/v1/courses/:courseId/teachers/invites | Convite docente pela coordenacao, sem aprovacao automatica. |
| GET /api/v1/courses/:courseId/applications | Solicitacoes do curso autorizado. |
| GET /api/v1/courses/:courseId/applications/:applicationId | Perfil submetido e resultado da analise. |
| POST /api/v1/courses/:courseId/applications/:applicationId/review | Aprova, pede ajustes ou recusa, com motivo e autoria real. |

Os prefixos /api/v1 se aplicam aos caminhos abreviados na tabela. Contratos completos de entrada estao em [openapi.json](docs/openapi.json). A interface existente continua demonstrativa e ainda nao usa estas rotas.

## Perfil e aprovacao docente

PUT /me/profile substitui os dados editaveis do proprio perfil; exige expectedVersion (0 na criacao), sem aceitar campos de aprovacao. Campos validos podem ser omitidos no rascunho. A resposta lista missingFields para a submissao. Cada salvamento cria uma copia imutavel em profileVersions; analises anteriores continuam associadas a sua versao, sem confirmar alteracoes futuras automaticamente.

O perfil recebe contato, formacao, conhecimentos por competencia/nivel 1 a 5, experiencias docente e profissional, disponibilidade e dedicacao pretendida. Cada item tem UUID estavel. Experiencia usa UNKNOWN, NONE ou PROVIDED; completedUnits representa **semestres completos** na experiencia docente e **meses completos** na profissional, sempre declarados, sujeitos a analise. Nao e carga contratual. Janelas de disponibilidade incluem fuso IANA, dia ISO 1 a 7, horario HH:MM e vigencia. Sobreposicao, horario invertido, meia-noite e datas invalidas sao recusados; adjacencia e permitida.

A submissao exige contato, formacao, conhecimentos, situacao conhecida de experiencia/disponibilidade e dedicacao pretendida positiva. Esses campos sao o contrato do formulario; exigencias de habilitacao de cada disciplina ainda dependem de configuracao institucional. Referencias de competencia e disciplina precisam existir e estar ativas; disciplinas devem pertencer ao curso. Os testes criam suas referencias sinteticas pelas rotas reais do catalogo academico.

A coordenacao analisa somente seus cursos, recebe a copia submetida e confirma/rejeita itens de formacao, conhecimento ou experiencia individualmente. Itens omitidos continuam sem confirmacao. Declaracoes de ausencia de experiencia ficam registradas na revisao aprovada. Aprovacao cria vinculo docente apenas naquele curso, sem criar aulas. Alterar o perfil exige nova submissao antes de uma nova analise; revisao obsoleta retorna 409. O vinculo de participacao existente e preservado, mas a confirmacao academica antiga nao se aplica a outra versao do perfil.

O motivo e obrigatorio nas tres decisoes. Versoes esperadas e guardas transacionais impedem duas decisoes simultaneas ou sobrescrita silenciosa. Convites docentes ativam identidade para completar o cadastro, mantendo obrigatoria a analise academica por curso.

## Catalogo academico

Cada recurso abaixo possui POST para criar, GET para listar com limit/offset e PUT /:recordId para substituir os campos editaveis. O PUT recebe `{ expectedVersion, data }`, com os mesmos campos completos do cadastro dentro de data. Campos de autoria/versao e curso sao definidos pelo servidor. Codigos sao normalizados para maiusculas e protegidos por indices unicos.

| Caminho | Responsabilidade |
| --- | --- |
| /api/v1/admin/competencies | Administrador mantem o catalogo comum de conhecimentos. |
| /api/v1/admin/periods | Administrador configura vigencia, fuso e blocos da grade. |
| /api/v1/courses/:courseId/subjects | Coordenacao do curso mantem disciplinas e criterios. |
| /api/v1/courses/:courseId/groups | Coordenacao mantem turmas vinculadas ao periodo. |
| /api/v1/courses/:courseId/offerings | Coordenacao liga disciplina, turma, periodo e encontros. |

Os catalogos publicos GET /api/v1/catalog/competencies e GET /api/v1/catalog/courses/:courseId/subjects retornam somente id, codigo e nome de itens ativos, com paginacao. Permitem selecionar conhecimentos e disciplinas antes de receber um vinculo academico; nao expoem perfis docentes.

Periodo possui blocos por dia ISO, inicio/fim e turno MORNING/AFTERNOON/NIGHT. Espacos entre blocos representam intervalos configurados; nenhum horario ou intervalo de 15 minutos e presumido como regra oficial. Oferta valida cada encontro contra um bloco exato da grade e dentro da vigencia, sem sobreposicao ou intervalo vazio de datas para o dia escolhido. Encontros vazios podem ser salvos para planejamento incompleto; nao comprovam disponibilidade nem elegibilidade.

Criterios da disciplina podem ficar null ou DRAFT. A estrutura permite conhecimentos obrigatorios/desejaveis, formacao minima, pertinencia de experiencia, minimos e politica de score. Pesos precisam somar 100 e ter criterios correspondentes. REVIEWED registra uma configuracao explicitamente marcada pelo responsavel autenticado, sem aplicar pesos oficiais automaticamente. O **motor de avaliacao ainda nao executa esses criterios**.

Cada alteracao preserva copia em academicVersions e autoria na auditoria. Escritas do catalogo e validacoes de referencia do perfil usam a mesma guarda transacional. A API recusa inativar recursos com dependencias ativas e bloqueia alteracoes de periodo/turma com ofertas ativas ou de oferta com alocacoes em rascunho/publicadas. Esse bloqueio conservador preserva o planejamento existente; fluxo de revisao/publicacao e reconciliacao de dependencias ainda sera implementado.

## Decisoes tecnicas

As validacoes rejeitam campos extras e tipos incorretos, sem remover silenciosamente dados enviados pelo cliente. Essa configuracao foi conferida na [documentacao do Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

As operacoes consistentes entre documentos usam a fronteira de transacao do [driver oficial do MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/). Ativacao de token, estado da identidade e vinculos usam guardas transacionais. As regras de concorrencia das alocacoes ainda precisam de implementacao e testes especificos.

Scripts de dependencias sao permitidos individualmente em pnpm-workspace.yaml: esbuild para a ferramenta TypeScript; o download automatico do MongoDB no postinstall fica desabilitado, sendo feito somente na integracao explicita. A politica segue o [controle de builds do pnpm](https://github.com/pnpm/pnpm.io/blob/main/docs/settings/build.md).

O estado do projeto e dos testes esta em [STATUS.md](../docs/validation/STATUS.md). As regras de produto permanecem na [spec](../docs/specs/BACKEND_V1.md).

## Proteção das respostas privadas

Respostas de /api/ recebem Cache-Control: no-store, incluindo erros. Origem fora de ALLOWED_ORIGINS é recusada; comandos com sec-fetch-site cross-site sem Origin também são rejeitados. A proteção CSRF continua obrigatória nas alterações autenticadas. Permissions-Policy desabilita câmera, microfone e geolocalização nesta API. Esses controles complementam cookie, validação e autorização existentes. Evidências e limites de implantação: [Segurança do ambiente](../docs/SEGURANCA.md).
