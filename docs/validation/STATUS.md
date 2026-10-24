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
| Testes unitarios da base, identidade, perfil e catalogo | PASS | 8 testes, 0 falhas, 0 pulados. Configuracao, entradas, erros, credenciais, estados desconhecido/nenhum, disponibilidade e configuracao academica. |
| Integracao MongoDB da base, identidade, perfil e catalogo | PASS | 22 testes, 0 falhas, 0 pulados; replica set local real MongoDB 7.0.24. HTTP por app.inject, persistencia, concorrencia, permissoes, solicitacoes e referencias academicas. Nao representa navegador integrado. |
| Perfil e aprovacao por curso | PASS | REQ-03/04 e partes de REQ-02/06/12/13/14: CASE-009/010/011/012/013/014/016 e validacao inicial de janelas do CASE-020. Experiencia desconhecida/ausente distinguida no contrato (CASE-015 parcial); motor/score ainda pendentes. |
| Catalogo academico e integridade inicial | PASS | REQ-05 e partes de REQ-02/06/13/14: CASE-017/018/019/020. Codigos concorrentes, referencias entre cursos/periodos, grade e copias versionadas. Revisao de planejamento publicado ainda pendente. |
| Autenticacao e autorizacao por curso | PASS | Rotas reais de identidade, cursos e coordenadores verificadas. CASE-001/002/003/004/005/006/008 e partes de 009/013/049/051/053/054/055 exercitados; aprovacao docente e demais partes desses cenarios ainda pendentes. |
| Envio real de e-mail | NOT_IMPLEMENTED | Porta Notifications testada com mensagens sinteticas; sem adaptador no servidor principal. Fluxos dependentes retornam 503, sem simular envio. |
| Concorrencia e cenarios adversariais dos modulos | NOT_IMPLEMENTED | Ainda exigem os modulos de negocio; os testes iniciais nao representam a matriz completa. |
| Build, tipos, lint e testes do front-end | PASS | Vite build, tsc -b --noEmit, eslint . e 195 testes em 30 arquivos passaram na interface atualizada. Descoberta Vitest limitada a src; consultas de rede bloqueadas por padrao nos testes. |
| Navegacao visual da demonstracao | PASS | Login ficticio, listas de professores/disciplinas, abertura/fechamento do modal conferidos no Chrome local; 4 prints em outputs/prints (fora do repositorio). Sem integracao desta interface com a API. |

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

## Etapa 3: perfil e analise por curso

Rascunho progressivo, lista de campos pendentes, copias imutaveis por versao, referencias academicas validadas e analise independente por curso implementados. As confirmacoes de itens ficam em revisao separada dos dados declarados. Aprovacao cria somente vinculo docente, preserva decisoes de outros cursos e nao cria aulas. Atualizacao obsoleta e segunda decisao simultanea retornam 409.

A integracao inicial encontrou codigo academico ausente nas fixtures de disciplinas, acionando corretamente o indice unico courseId/code. As fixtures foram corrigidas com codigos unicos e o teste de isolamento passou a criar seus proprios dados, sem depender de resultado de outro teste. A nova execucao passou os 20 testes, sem pulos. Um erro de inferencia do TypeScript no teste foi corrigido com tipo explicito da resposta HTTP; checagem de tipos repetida com sucesso.

Comandos: tsc -p tsconfig.check.json, eslint src test scripts, tsc -p tsconfig.json, node --import tsx scripts/export-openapi.ts, node --import tsx --test test/unit.test.ts e a suite de integracao explicitamente habilitada. O catalogo academico ainda nao tem rotas; referencias sinteticas nos testes nao representam cadastro institucional. Nao ha motor de elegibilidade/score nem interface conectada ao modulo.

Na verificacao da interface, o primeiro Vitest coletou tambem os testes Node do backend e falhou em 2 suites, apesar de os 174 testes da interface passarem. Corrigido em vite.config.ts limitando include a src/**/*.test.{ts,tsx}; repeticao: 20 arquivos e 174 testes aprovados. O back-end continua com comandos proprios e integracao explicitamente habilitada. A instalacao local para visualizar as telas preservou package-lock.json.

## Etapa 4: catalogo academico

Implementados cadastro, listagem paginada e substituicao versionada de competencias, periodos, disciplinas, turmas e ofertas. Criterios e grade podem permanecer incompletos/em rascunho. A aplicacao nao presume pesos oficiais, grade noturna universal nem intervalo padrao. A guarda compartilhada serializa escritas do catalogo com validacoes de referencia do perfil; copias de alteracoes ficam em academicVersions. Dependencias ativas bloqueiam inativacoes/alteracoes que exigem revisao do planejamento.

Verificacoes: 8 unitarios e 22 testes de integracao aprovados, sem falhas/pulos; tipos, lint, build, formatacao e exportacao OpenAPI aprovados. O cadastro de referencias usado pelos testes de perfil passou a acontecer pelas rotas HTTP reais. A concorrencia de codigo preserva exatamente um registro; ofertas com disciplina/turma de outro curso, vigencia fora do periodo ou horario fora de bloco sao recusadas sem persistir oferta invalida.

A primeira execucao expandida chegou ao limite real de tentativas porque todas as pessoas sinteticas compartilhavam o mesmo IP. Os clientes dos testes funcionais foram separados por pessoa; o teste dedicado de abuso continua usando um unico IP e confirma o 429. A protecao da aplicacao nao foi alterada. Nova execucao: 22/22 aprovados.

Limites atuais: motor de elegibilidade/score, carga institucional, alocacao/publicacao, atestados, ocorrencias/historico e integracao das novas telas continuam pendentes. Configuracoes sinteticas REVIEWED validam os mecanismos, sem representar homologacao da faculdade.

## Interface: cadastro docente e planejamento demonstrativo

Cadastro acessivel pelo login, em quatro etapas, com formacao, conhecimentos, experiencia, cursos, disciplinas, disponibilidade, foto opcional e aceite separado dos termos/aviso. Coordenacao analisa cada solicitacao por curso; nao cadastra a identidade do professor. Calendario semanal/diario com cartoes arrastaveis e alternativa por formulario, lista de alocacoes com conflito de professor entre cursos e turma no curso, edicao versionada e cancelamento demonstrativos.

Validacao: 173 testes em 23 arquivos passaram; build Vite, TypeScript e ESLint aprovados. Testes React legados ainda emitem avisos act sem falhas. No Chrome foram conferidos cadastro completo, preservacao ao voltar/abrir termos, login docente, foto, aprovacao somente em um curso e arrastar um cartao para o horario. Prints 06 a 13 em outputs/prints, fora do repositorio. Todas essas operacoes da interface usam armazenamento local do navegador. Nao ha integracao com a API, publicacao de escala nem controle de acesso institucional nesta demonstracao. Termos e aviso sao minutas do projeto, pendentes de homologacao pela faculdade.

## Conexao local ao MongoDB fornecida pelo usuario

Em 24/10/2026, backend/.env foi preparado e preenchido diretamente pelo usuario no editor. Arquivo conferido como ignorado pelo Git; valores da URI/senha nao foram exibidos nem adicionados ao repositorio. Ping autenticado e verificacao de topologia passaram. API iniciada na porta local 3333, criando os indices previstos pela inicializacao; GET /health/ready respondeu status ready. Nao foram criados usuarios sinteticos nem executados testes de integracao nesse banco.

Esta evidencia confirma API -> MongoDB. Os formularios React continuam no adaptador de demonstracao local; envio de e-mail e integracao navegador -> API seguem pendentes. Nenhuma credencial deve ser colocada em variavel VITE_*.


## Interface: calendario mensal, aparencia e contatos

Visao mensal com dias em grade, cartoes por turno e acesso ao dia, mantendo semana/dia e arrastar da coordenacao. Professor abre o mes e feriados, sem exibir rascunhos nao publicados. BrasilAPI consultada por ano com validacao, cache de 24 horas, prazo de 8 segundos e erro explicito; datas como Carnaval e Corpus Christi exigem confirmacao local. Referencia estadual da Paraiba em 5 de agosto; feriados municipais/recessos institucionais ainda pendentes.

Modo claro/escuro com preferencia do sistema, seletor acessivel e persistencia local. Cores de campos, textos, tabelas, modais e cartoes adaptadas; fundo branco do simbolo removido. Conta permite nome/e-mail/telefone e foto opcional, sem liberar edicao do papel. Mudanca do e-mail preserva identidade/solicitacoes/foto e atualiza o proximo login da demonstracao; tratamento de duplicidade e falha de gravacao cobertos. A verificacao institucional do novo e-mail ainda depende da API.

Verificacao final: 180 testes em 25 arquivos, 0 falhas/pulos; tsc -b --noEmit, eslint ., Vite build, Prettier dos arquivos alterados, check-docs e diff --check aprovados. A contagem anterior de 182 incluia dois testes do helper WhatsApp removido por obsolescencia; o cadastro interno continua coberto. Permanecem avisos act em testes React assincronos legados, sem falhas. No Chrome: mensal com cartoes/feriado nacional, navegacao ate agosto e marcador estadual, alternancia claro/escuro, conta editavel, modal de alocacao escuro e cancelamento somente do cartao sintetico criado para testar arrastar. Os rascunhos do usuario foram preservados. Capturas 14 a 17 em outputs/prints (fora do repositorio). Conferencia visual em desktop; nao houve ensaio em dispositivo iOS real.

Limites: interface continua local; API -> MongoDB foi verificada separadamente. Publicacao, historico, atestados e motor de elegibilidade/score ainda pendentes. Arquivo .env continua ignorado e nao integra os commits. Houve trava vazia antiga do indice Git sem processo Git ativo; removida apos conferencia para concluir os commits locais.

## Ajuste de datas de alocacao

Regra solicitada: criar ou mover um rascunho para uma data anterior a hoje e recusado. Datas antigas continuam consultaveis e os registros existentes nao sao removidos. O dia e calculado no fuso America/Fortaleza; hoje continua permitido. O adaptador confere novamente a data depois das consultas assincronas e antes de salvar, protegendo tambem o arrastar.

Verificacao: 7 testes do servico de planejamento passaram com data controlada, incluindo dias/meses/anos passados, preservacao do rascunho e virada de dia as 03:00 UTC. Esta regra esta no adaptador demonstrativo; a API de alocacao ainda precisa ser implementada e validar a mesma politica no servidor.

## Revisao de disciplinas e modais

Catalogo de Direito reorganizado com busca por nome/codigo, filtros por situacao, codigos preservados, estado vazio e orientacoes para alocacao. Formulario com titulo visivel, foco inicial, acoes Criar/Salvar/Cancelar, erro de persistencia sem apagar os campos e tentativa posterior habilitada. O catalogo nao substitui dados corrompidos pelos exemplos nem confirma uma escrita que falhou.

Modal compartilhado: clique interno nao fecha, fechamento e edicao bloqueados durante salvamento, foco devolvido ao acionador e apresentacao adaptada a telas estreitas. Formulario de alocacao recebe data minima, sinaliza data passada e mantem os dados em erro. Botoes recebem feedback de pressionamento e diferenciam indisponibilidade de salvamento.

Evidencia: suite integrada do front-end passou 190 testes em 28 arquivos; validacao de nome/codigo, duplicidade, status e preservacao em falha de gravacao exercitadas. No Chrome, abrir, validar vazio, cancelar e devolver foco do modal de disciplina conferidos sem criar registros. Prints 19/20 em outputs/prints fora do repositorio.


## Inicio docente, configuracoes e navegacao

Inicio reformulado com agenda ainda aguardando publicacao, resumo dos dados reais do perfil demonstrativo, disponibilidade por dia, retornos por curso e proximos passos. Criadas Configuracoes e Minha disponibilidade. Tema foi movido ao rodape lateral, junto a Ajustes. Preferencias por conta definem visualizacao, turno inicial e feriados; desligar feriados impede a consulta externa enquanto a opcao estiver desligada. Tema claro/escuro/sistema continua compartilhado pelo navegador.

Aviso de feriados apresenta data, abrangencia e fonte em cartoes, com detalhes recolhiveis. Sem anunciar completude municipal ou cancelamento automatico. Editor de disponibilidade valida sobreposicao, dados obrigatorios, quantidade, horas pretendidas, gravacao e versao; preserva vinculos e analises academicas. Atualizacao de perfil em outra tela avisa sobre obsolescencia sem apagar a edicao aberta.

Verificacoes: 190 testes em 28 arquivos, sem falhas/pulos; tipos, ESLint e build Vite aprovados. Novos cenarios incluem configuracoes aplicadas ao calendario, isolamento por conta, rede desabilitada quando feriados estao ocultos, disponibilidade preservando solicitacoes, perfil obsoleto e falha de gravacao. Persistem avisos act em testes assincronos legados sem falhas. No Chrome foram conferidos os novos formularios, erro de sobreposicao sem gravar alteracoes, avisos de feriados e os temas claro/escuro. Prints 19 a 25 em outputs/prints, fora do repositorio. A preferencia de tema anterior foi restaurada apos a conferencia. Nao houve teste em aparelho iOS real.

Escopo continua demonstrativo no navegador. API de alocacao, integracao das telas, publicacao, historico, atestados e motor de elegibilidade/score continuam pendentes. A conexao MongoDB e o arquivo .env nao foram alterados nesta entrega. Nenhum dado de teste foi escrito no MongoDB institucional.

## Refinamento institucional do acesso e da rotina docente

Login e recuperação sem seletor de tema; marca UNIFACISA e nome ProFly hierarquizados, foto limitada à resolução original, dimensões declaradas e escudo institucional na guia. Recuperação não confirma envio fictício e trata falha de serviço sem apagar e-mail. Aceite explícito dos termos e ciência de privacidade do cadastro novamente cobertos pelo fluxo automatizado.

Início sem bloco de apresentação nem KPIs de preenchimento. Agenda, histórico sem ocorrências inventadas, formação declarada e preferências semanais priorizados. Solicitações recolhidas por padrão e abertas quando há ajustes solicitados. Comprovantes/certificados ainda não estão disponíveis na interface. Horários pretendidos abre em consulta, tem início/cancelamento explícitos de edição e ligação para a semana do calendário. Mês, semana e dia mostram preferências identificadas separadamente de aulas atribuídas. Janelas que cruzam turnos são recortadas visualmente, preservando os dados. Células de coordenação com menor altura e espaçamento; feriados depois da grade.

Verificação: 195 testes em 30 arquivos aprovados, sem falhas/pulos; tsc -b --noEmit, ESLint e Vite build aprovados. Os cenários novos cobrem edição/cancelamento, ligação início-horários-calendário, preferência versus aula, cruzamento de turnos, recuperação indisponível/falha e limite da demonstração a hosts locais. Avisos act de testes assíncronos permanecem sem falha. No Chrome: login, redirecionamento docente, semana/mês com preferências, tema escuro e retorno da recuperação conferidos. Build local com CSP renderizado sem erros de console observados. Prints 27 a 31 em outputs/prints fora do repositório; tema claro restaurado. Sem teste em aparelho iOS real.

Ambiente demonstrativo restrito a loopback, com aviso em hosts públicos. Prévia do build recebe CSP, proteção contra enquadramento, nosniff, política de referência e de permissões. Os cabeçalhos precisam ser configurados no futuro servidor de hospedagem; não há implantação pública nesta entrega. Consulta de produção do lockfile front-end ao serviço oficial de advisories npm: 7 pacotes, nenhum aviso retornado. backend/.env recusado via HTTP com 403, sem impressão de conteúdo. Detalhes e pendências em [SEGURANCA.md](../SEGURANCA.md). Isso não transforma a autenticação demonstrativa em autenticação institucional. As telas continuam sem integração com a API.
