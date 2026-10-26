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
src/scheduling/        Elegibilidade, reservas, publicacao, historico e ausencias
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

Com o servidor iniciado, `GET http://127.0.0.1:3333/health/ready` deve responder `{"status":"ready"}`. Isso confirma acesso da API ao MongoDB. A interface usa a API por padrao, com proxy /api pelo Vite; uma resposta de health nao substitui a validacao de cada fluxo. Nao execute suites de integracao contra esse banco; elas criam seu proprio replica set efemero.

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

O adaptador SMTP com Nodemailer esta implementado e integrado ao servidor. EMAIL_TRANSPORT=disabled e o padrao: cadastro publico, reenvio e recuperacao retornam 503 EMAIL_UNAVAILABLE quando o envio nao foi configurado. Para desenvolvimento foi preparada uma captura Mailpit local, com remetente ficticio profly@profly.test e caixa em http://127.0.0.1:8025, sem entrega externa. As credenciais institucionais ainda dependem da faculdade. A verificacao ativa somente a identidade, sem aprovar participacao em cursos. Configuracao, testes, contrato dos links e limites em [E-mail no backend](../docs/EMAIL_BACKEND.md); as telas conectadas e seus limites estao em [INTERFACE_API.md](../docs/INTERFACE_API.md).

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

Os prefixos /api/v1 se aplicam aos caminhos abreviados na tabela. Contratos completos de entrada estao em [openapi.json](docs/openapi.json). A interface conectada usa estas rotas; a demonstracao anterior exige opt-in explicito.

## Perfil e aprovacao docente

PUT /me/profile substitui os dados editaveis do proprio perfil; exige expectedVersion (0 na criacao), sem aceitar campos de aprovacao. Campos validos podem ser omitidos no rascunho. A resposta lista missingFields para a submissao. Cada salvamento cria uma copia imutavel em profileVersions; analises anteriores continuam associadas a sua versao, sem confirmar alteracoes futuras automaticamente.

O perfil recebe contato, formacao, conhecimentos por competencia/nivel 1 a 5, experiencias docente e profissional, disponibilidade e dedicacao pretendida. Cada item tem UUID estavel. Experiencia usa UNKNOWN, NONE ou PROVIDED; completedUnits representa **semestres completos** na experiencia docente e **meses completos** na profissional, sempre declarados, sujeitos a analise. Nao e carga contratual. Janelas de disponibilidade incluem fuso IANA, dia ISO 1 a 7, horario HH:MM e vigencia. Sobreposicao, horario invertido, meia-noite e datas invalidas sao recusados; adjacencia e permitida.

A submissao exige contato, formacao, conhecimentos, situacao conhecida de experiencia/disponibilidade e disponibilidade conhecida. A dedicacao semanal pretendida e opcional e nao equivale ao limite institucional de carga. Esses campos sao o contrato do formulario; exigencias de habilitacao de cada disciplina ainda dependem de configuracao institucional. Referencias de competencia e disciplina precisam existir e estar ativas; disciplinas devem pertencer ao curso. Os testes criam suas referencias sinteticas pelas rotas reais do catalogo academico.

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

Criterios da disciplina podem ficar null ou DRAFT. A estrutura permite conhecimentos obrigatorios/desejaveis, formacao minima, pertinencia de experiencia, minimos e politica de score. Pesos precisam somar 100 e ter criterios correspondentes. REVIEWED registra uma configuracao explicitamente marcada pelo responsavel autenticado, sem aplicar pesos oficiais automaticamente. O motor executa os criterios atuais, com versoes, motivos e pendencias explicitas; configuracao REVIEWED nao significa homologacao institucional dos pesos.

Cada alteracao preserva copia em academicVersions e autoria na auditoria. Escritas do catalogo e validacoes de referencia do perfil usam a mesma guarda transacional. A API recusa inativar recursos com dependencias ativas e bloqueia alteracoes de periodo/turma com ofertas ativas ou de oferta com alocacoes em rascunho/publicadas. Esse bloqueio conservador preserva o planejamento existente; alteracoes de estruturas com dependencias exigem revisar/liberar o planejamento, preservando a escala anterior ate republicacao.

## Decisoes tecnicas

As validacoes rejeitam campos extras e tipos incorretos, sem remover silenciosamente dados enviados pelo cliente. Essa configuracao foi conferida na [documentacao do Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

As operacoes consistentes entre documentos usam a fronteira de transacao do [driver oficial do MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/). Ativacao de token, estado da identidade e vinculos usam guardas transacionais. Reservas de professor/turma/carga usam guarda transacional e foram exercitadas sob concorrencia real em MongoDB efemero.

Scripts de dependencias sao permitidos individualmente em pnpm-workspace.yaml: esbuild para a ferramenta TypeScript; o download automatico do MongoDB no postinstall fica desabilitado, sendo feito somente na integracao explicita. A politica segue o [controle de builds do pnpm](https://github.com/pnpm/pnpm.io/blob/main/docs/settings/build.md).

O estado do projeto e dos testes esta em [STATUS.md](../docs/validation/STATUS.md). As regras de produto permanecem na [spec](../docs/specs/BACKEND_V1.md).

## Proteção das respostas privadas

Respostas de /api/ recebem Cache-Control: no-store, incluindo erros. Origem fora de ALLOWED_ORIGINS é recusada; comandos com sec-fetch-site cross-site sem Origin também são rejeitados. A proteção CSRF continua obrigatória nas alterações autenticadas. Permissions-Policy desabilita câmera, microfone e geolocalização nesta API. Esses controles complementam cookie, validação e autorização existentes. Evidências e limites de implantação: [Segurança do ambiente](../docs/SEGURANCA.md).

## Cadastro e conta conectados

POST `/api/v1/auth/enroll` recebe identidade, perfil, aceites legais versionados e cursos/disciplinas solicitados. Tudo e validado e persistido atomicamente; confirmacao de e-mail encaminha SUBMITTED, sem vinculo aprovado. POST `/auth/register` permanece como contrato minimo de identidade.

PUT `/me/account` exige expectedVersion. POST `/me/email-change` exige senha atual, versao e novo endereco; somente confirmar prova altera o acesso. POST `/me/password` exige senha atual e revoga todas as sessoes. POST/GET/DELETE `/me/photo` usa autorizacao, validacao de imagem e foto normalizada privada. Telefone valida DDD brasileiro e formato; senha nova exige letra, numero e 8 a 72 caracteres.

Planejamento, recomendacoes em snapshot unico, historico e atestados estao em [PLANEJAMENTO_API.md](../docs/PLANEJAMENTO_API.md). Recomendar nao reserva; salvar e publicar revalidam dados atuais. Nao ha PDF neste fluxo de atestados.

## Previa isolada opcional

`scripts/dev-isolated.ts` exige PROFLY_RUN_INTEGRATION=1 e cria um MongoDB efemero `_test`, sem carregar .env. Usa exclusivamente contas ficticias de `test/ui-fixture.ts`; nao e comando de populacao do banco institucional. Porta 3334, frontend separado 5175 com PROFLY_API_TARGET correspondente. A captura Mailpit local precisa estar disponivel. Encerrar a previa remove seu banco efemero; nenhuma identidade real e criada por esse script.

## Origens e sessão HTTPS

ALLOWED_ORIGINS aceita somente origens exatas, sem wildcard. O guard de origem roda antes do preflight; métodos PUT/PATCH/DELETE e o header CSRF são explicitamente permitidos. Origem hostil é recusada mesmo no OPTIONS. Helmet também cobre essas recusas; HSTS fica ativo somente em produção, sem preload nem includeSubDomains.

COOKIE_SECURE=true permite desenvolvimento atrás de proxy HTTPS; em produção o cookie é sempre Secure e uma tentativa de desligá-lo é recusada. A prévia isolada aceita PROFLY_PREVIEW_HTTPS=1 para API3335, origens HTTPS5176 e cookie seguro, em outro banco efêmero. [Segurança do ambiente](../docs/SEGURANCA.md) registra os controles e limites de implantação.

## Privacidade e direitos do titular

GET /api/v1/catalog/privacy publica somente configuração pública do tratamento. GET/POST /api/v1/me/privacy/requests recebem/consultam protocolos próprios; GET/PATCH /api/v1/admin/privacy/requests atende administradores, com versão e eventos preservados. POST /api/v1/me/privacy/export exige currentPassword/CSRF e entrega cópia privada estruturada. Curso/coordenador não autoriza acessar protocolos de outro titular. Detalhes, configuração e limites em [LGPD.md](../docs/LGPD.md). A matriz foi ampliada com REQ-15/CASE-057..062; o status da matriz continua planejamento, e resultados reais são registrados no relatório de validação.

## Semana visual de cinco aulas na prévia

`scripts/seed-preview-week.mjs` é uma operação explícita de apresentação sintética, não carga de dados institucionais. Exige PROFLY_SEED_PREVIEW_WEEK=1, PROFLY_PREVIEW_PASSWORD no ambiente e API local3334/3337 identificada como SYNTHETIC_ONLY e sem homologação. Não lê.env; identidades fixas @profly.test. A escola/servidor real em3333 e URLs externas são recusados antes da conexão.

O script usa as APIs de administrador, professor e coordenador do curso: cria um período/turma visual e ofertas, preserva a disponibilidade anterior, acrescenta janelas diurnas, submete e aprova o perfil sintético, aloca e publica cinco encontros na próxima semana. A aprovação/publicação usa o coordenador responsável. Não insere ocorrências diretamente no MongoDB nem apaga dados. Reexecução preserva ofertas/alocações existentes e não duplica os cinco encontros; sessões temporárias criadas pelo script são encerradas ao terminar com sucesso, sem revogar a sessão do navegador. Se houver outro rascunho no período, interrompe a publicação para revisão.

```powershell
$env:PROFLY_SEED_PREVIEW_WEEK='1'
$env:PROFLY_PREVIEW_API='http://127.0.0.1:3337'
# Defina PROFLY_PREVIEW_PASSWORD somente no ambiente local do processo.
node scripts/seed-preview-week.mjs
```

A semana é calculada em America/Fortaleza. Nesta preparação:26/10 a01/11/2026, aulas segunda08:00/14:00, terça09:00, quinta14:00 e sexta15:00,50 minutos cada. Esse conjunto é fictício, não currículo aprovado pela instituição. Não executar a rotina em conta real.

## Comprovantes academicos e PDF

Implementacao backend (CASE-064/065): atestados e comprovantes aceitam JPG/PNG/WebP e PDF passivo. Limite por documento: menor entre UPLOAD_MAX_BYTES e 5 MB; imagens com ate 16 megapixels, PDF com ate 50 paginas. PDF criptografado, formulario interativo, scripts, links ativos e anexos incorporados sao recusados. Parser [pdf-lib](https://pdf-lib.js.org/docs/api/classes/pdfdocument) com versao fixa, worker separado, prazo de 5 segundos, heap de 64 MB e no maximo dois parsers simultaneos; limite de heap nao representa limite de toda memoria nativa. Nao e antivirus nem validacao de assinatura/autenticidade. Downloads sempre autenticados, no-store, nosniff e Content-Disposition attachment, preservando bytes originais. Bloqueio institucional de atestados continua aplicado antes da leitura do arquivo.

| Rota | Contrato |
| --- | --- |
| POST /api/v1/me/academic-documents | profileVersion, section (education/knowledge/teaching/professional), itemId e title; cria metadados para item proprio da versao atual. |
| POST /api/v1/me/academic-documents/:documentId/file | Multipart com um arquivo; permite retomar envio incompleto, recusa substituir original ou enviar apos retirada. |
| GET /api/v1/me/academic-documents | cursor UUID e limit de 1 a 100; items e nextCursor, inclui documentos retirados do proprio titular. |
| GET /api/v1/me/academic-documents/:documentId/file | Baixa original proprio, inclusive apos retirada da analise. |
| POST /api/v1/me/academic-documents/:documentId/withdraw | expectedVersion; retira da analise sem apagar original/auditoria nem mudar score. |
| GET /api/v1/courses/:courseId/applications/:applicationId/documents | Somente coordenador responsavel; comprovantes ativos com arquivo ligados a versao submetida. |
| GET /api/v1/courses/:courseId/academic-documents/:documentId/file | Revalida coordenacao ativa, solicitacao correspondente e documento ativo a cada acesso. |

Quotas conservadoras: 100 metadados e 50 MB por conta, inclusive originais retirados, serializados contra uploads concorrentes. Retirada nao e eliminacao LGPD; descarte e retencao dependem de politica institucional. Exportacao propria inclui metadados e links privados separados, nunca bytes ou arquivos alheios. Anexar comprovante nao confirma automaticamente formacao, experiencia, elegibilidade ou score; a analise continua no fluxo do coordenador. Interfaces de envio/consulta desses novos comprovantes serao conectadas na etapa de frontend.

## Consultas paginadas e fechamento local

CASE-066: listas de cursos, usuarios, catalogos academicos, periodos, solicitacoes, docentes, avisos e ausencias retornam items, limit, offset e nextOffset (null no fim). Catalogos de competencias/disciplinas conservam maximo 100; listagens gerais maximo 200, usuarios maximo 100, ocorrencias maximo 500. Defaults anteriores preservados quando aplicavel. Ordenacao inclui ID como desempate; offset nao e snapshot entre requisicoes, portanto recarregue apos alteracoes concorrentes. Escopo por curso/titular e aplicado antes de paginar. Papeis de cursos refletem vinculos reais; acesso global de administrador nao cria coordenacao ficticia.

GET /api/v1/courses/:courseId/planning aceita periodId opcional e recusa agregados acima de 500 alocacoes/publicacoes ou 100 planos com PLANNING_LIMIT. Alternativas paginadas: /allocations, /published-allocations e /plans, com periodId opcional. /occurrences aceita from/until, limit e offset. Calendario docente recusa mais de 4096 encontros, solicitando reduzir intervalo; comparacao recusa mais de 200 candidatos e nao publica ranking parcial. Avisos retornam unreadCount separado do tamanho da pagina.

Verificacao completa, sem ler .env nem enviar mensagens externas:

```powershell
node scripts/verify.mjs
```

O comando usa apenas testes sinteticos com MongoDB efemero/SMTP local. Valida tipos, lint completo, build, suites e documentos; escreve .data/validation/last-run.json fora do Git. Falha em teste, skip/todo, ausencia de resumo ou mudanca de codigo durante a execucao impede PASS. Consulte a [aceitacao do backend](../docs/validation/BACKEND_ACCEPTANCE.md) para evidencias por cenario e limites institucionais. Configuracao definitiva do banco, remetente, dominio, backup/restore e privacidade real nao e substituida por esse resultado local.


## Manutencao planejada e historico ficticio

CASE-067: MAINTENANCE_MODE=false por padrao. Para uma pausa planejada, defina true no ambiente e reinicie a API. Operacoes /api/v1 e readiness retornam 503 MAINTENANCE com Retry-After de300 segundos e CORS da origem permitida; /health/live e /api/v1/status continuam consultaveis. Voltar para false e reiniciar restabelece o acesso sem revogar sessoes ou apagar dados. Nao e uma ferramenta de migracao, drenagem de requisicoes em andamento ou manutencao sem MongoDB disponivel. A interface exibe a tela institucional quando a consulta de sessao recebe esse codigo; erros durante formularios permanecem locais para preservar campos.

CASE-068: scripts/seed-preview-history.mjs acrescenta cinco ocorrencias da semana anterior somente a docente.ui@profly.test. Exige opt-in PROFLY_SEED_PREVIEW_HISTORY=1 e porta explicita PROFLY_PREVIEW_MONGO_PORT de um replica set testset em127.0.0.1. Nao le.env. Aceita exatamente um banco profly_ui_<32hex>_test; a funcao revalida ambiente test, politica SYNTHETIC_ONLY nao homologada, curso DIR-UI e vinculos ativos das identidades ficticias. Nao exponha essa rotina como endpoint.

A importacao transacional representa registros antigos de uma turma/período ficticios arquivados, sem criar novas alocacoes publicas no passado: tres realizados, um cancelado e um planejado ainda a confirmar, com turnos diferentes. Identificadores estaveis tornam a repeticao idempotente; registro parcial interrompe sem sobrescrever. Preserva perfil, criterios, solicitacoes, escalas e ocorrencias existentes. A autoria e os estados sao dados sinteticos para demonstracao, nao confirmacao institucional de aulas reais.

```powershell
# Execute apenas no banco efemero da previa, depois do build.
$env:PROFLY_SEED_PREVIEW_HISTORY='1'
$env:PROFLY_PREVIEW_MONGO_PORT='<porta-local-do-replica-set-de-teste>'
node scripts/seed-preview-history.mjs
```

A interface de atestados agora aceita PDF passivo e imagens pelo contrato privado existente, com retomada de upload e paginacao. O bloqueio de documentos reais na previa permanece. Comprovantes academicos possuem API propria; seus controles completos de interface continuam fora desta melhoria visual.
