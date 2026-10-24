# Estado da validacao

Atualizado em 24/10/2026. Branch da etapa: feat/backend-institucional.

## Evidencia disponivel

| Area | Estado | Evidencia ou limitacao |
| --- | --- | --- |
| Documentacao inicial | PASS | Links locais e git diff --check conferidos antes do commit adc432f. |
| Spec e matriz de cenarios | PASS | node scripts/check-docs.mjs executado; estrutura de documentos/links e rastreio de 14 requisitos e 56 cenarios planejados conferidos. Nao e evidencia de comportamento de runtime. |
| Sintaxe do verificador documental | PASS | node --check scripts/check-docs.mjs executado sem erro. |
| Espacos e conflitos no diff | PASS | git diff --check executado sem erro; repetir no staged antes do commit. |
| Estrutura do servidor | PASS | TypeScript, Fastify, configuracao validada, driver MongoDB, indices, health checks e contrato OpenAPI implementados. Modulos de negocio pendentes. |
| Tipos, lint e build da base | PASS | tsc -p tsconfig.check.json, eslint src test scripts e tsc -p tsconfig.json executados no backend. |
| Testes unitarios da base e identidade | PASS | 5 testes, 0 falhas, 0 pulados. Configuracao, entradas, erros seguros, hash de senha, verificacao e tokens. |
| Integracao MongoDB da base e identidade | PASS | 16 testes, 0 falhas, 0 pulados; replica set local real MongoDB 7.0.24. HTTP por app.inject, persistencia, tokens concorrentes, sessoes, CSRF, origens e limites. Nao representa navegador integrado. |
| Autenticacao e autorizacao por curso | PASS | Rotas reais de identidade, cursos e coordenadores verificadas. CASE-001/002/003/004/005/006/008 e partes de 009/013/049/051/053/054/055 exercitados; aprovacao docente e demais partes desses cenarios ainda pendentes. |
| Envio real de e-mail | NOT_IMPLEMENTED | Porta Notifications testada com mensagens sinteticas; sem adaptador no servidor principal. Fluxos dependentes retornam 503, sem simular envio. |
| Concorrencia e cenarios adversariais dos modulos | NOT_IMPLEMENTED | Ainda exigem os modulos de negocio; os testes iniciais nao representam a matriz completa. |
| Build, testes e navegacao do front-end nesta etapa | NOT_RUN | Aplicacao visual preservada e ainda demonstrativa. Verificacao visual sendo preparada separadamente. |

## Como registrar as proximas entregas

Associar cada resultado ao requisito/cenario, ao teste real, ao comando executado e ao commit da implementacao. Registrar PASS, FAIL, NOT_RUN ou NOT_IMPLEMENTED conforme o [fluxo de trabalho](../WORKFLOW.md).

Na conclusao integrada do back-end, todos os gates obrigatorios da [spec](../specs/BACKEND_V1.md) precisam de evidencia. O verificador documental aprova somente a integridade estrutural dos documentos e da matriz; nao comprova os comportamentos descritos.

Os cenarios permanecem com status PLANNED na matriz porque ela descreve o plano de verificacao. Os resultados reais e os testes implementados devem ser registrados como evidencia, sem confundir planejamento com aprovacao.

## Ocorrencia de validacao da etapa 1

A primeira tentativa de iniciar o MongoDB temporario excedeu o limite padrao de 10 segundos. O prazo de inicializacao do teste foi ajustado para 60 segundos e a suite foi repetida: 2/2 testes aprovados. O binario responde como MongoDB 7.0.24 e e utilizado somente no ambiente efemero de testes. Nenhum banco da faculdade foi acessado.

Comandos usados, na pasta backend: node --import tsx --test test/unit.test.ts e, com PROFLY_RUN_INTEGRATION=1, node --import tsx --test --test-concurrency=1 test/integration.test.ts. A integracao roda fora do sandbox restrito para permitir o processo MongoDB local. Sem a variavel explicita, a suite recusa a execucao em vez de marcar testes pulados como sucesso.

## Etapa 2: identidade e responsabilidades

Implementados cadastro docente pendente de verificacao, login/logout, cookie de sessao e CSRF, convite/ativacao, recuperacao de senha, bootstrap do administrador, cursos e atribuicoes de coordenacao. As consultas nao expoem hashes de senha ou tokens. A verificacao de e-mail nao concede vinculo academico. O ultimo administrador ativo nao pode ser desativado.

TypeScript, lint e 5 testes unitarios passaram. A primeira solicitacao de integracao nao foi executada por limite temporario da revisao automatica; apos o horario de renovacao, uma nova solicitacao pela mesma via foi liberada e os 16 testes passaram sem pulos. A suite cobre isolamento horizontal e vertical, campos protegidos, tokens expirados/reutilizados/concorrentes, revogacao, redefinicao, logout, expiracao, CSRF, corpo malformado/excessivo, limite de tentativas, persistencia apos recriar a aplicacao e falta de envio configurado.

Limites: o teste de reinicio recria aplicacao/conexao mantendo o MongoDB efemero, sem simular reinicio do sistema operacional. Nao houve envio real de e-mail, uso do banco institucional ou integracao da interface. A recuperacao usa a porta de notificacao injetada nos testes. Modulos posteriores continuam sem implementacao.
