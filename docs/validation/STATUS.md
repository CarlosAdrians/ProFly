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
| Testes da base, identidade, perfil, catalogo e SMTP | PASS | 12 testes, 0 falhas, 0 pulados. Incluem captura SMTP sintetica em loopback, sem servicos externos ou banco. |
| Integracao MongoDB da base, identidade, perfil e catalogo | PASS | 24 testes, 0 falhas, 0 pulados; replica set local real MongoDB 7.0.24. HTTP por app.inject, persistencia, concorrencia, permissoes, solicitacoes, referencias academicas e fluxo SMTP local. Nao representa navegador integrado. |
| Perfil e aprovacao por curso | PASS | REQ-03/04 e partes de REQ-02/06/12/13/14: CASE-009/010/011/012/013/014/016 e validacao inicial de janelas do CASE-020. Experiencia desconhecida/ausente distinguida no contrato (CASE-015 parcial); motor/score ainda pendentes. |
| Catalogo academico e integridade inicial | PASS | REQ-05 e partes de REQ-02/06/13/14: CASE-017/018/019/020. Codigos concorrentes, referencias entre cursos/periodos, grade e copias versionadas. Revisao de planejamento publicado ainda pendente. |
| Autenticacao e autorizacao por curso | PASS | Rotas reais de identidade, cursos e coordenadores verificadas. CASE-001/002/003/004/005/006/008 e partes de 009/013/049/051/053/054/055 exercitados; aprovacao docente e demais partes desses cenarios ainda pendentes. |
| Transporte de e-mail | PARTIAL | Adaptador Nodemailer SMTP implementado e integrado. Verificacao/reset exercitados por HTTP e captura SMTP local; Mailpit com mensagens ficticias disponivel. Entrega institucional, OAuth2, outbox e integracao das telas pendentes. |
| Concorrencia e cenarios adversariais dos modulos | NOT_IMPLEMENTED | Ainda exigem os modulos de negocio; os testes iniciais nao representam a matriz completa. |
| Build, tipos, lint e testes do front-end | PASS | Vite build, tsc -b --noEmit e eslint . aprovados. Suite completa: 209 testes em 34 arquivos; cenario posterior de aprovacao pela interface e regressoes direcionadas tambem aprovados (210 cenarios unicos verificados). Descoberta Vitest limitada a src; consultas de rede bloqueadas por padrao nos testes. |
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

## Protecao HTTP adicional da API

REQ-02/13/14, complemento aos cenarios de origem, CSRF e erros dos CASE-006/049/051. Respostas de /api/ recebem Cache-Control: no-store, inclusive quando a sessao esta ausente ou a origem e recusada. Permissions-Policy desabilita camera, microfone e geolocalizacao. Comandos cross-site sem Origin sao recusados antes de consultar dados; a origem explicitamente permitida e clientes de servidor sem Fetch Metadata continuam aceitos pela fronteira HTTP, sujeitos a autenticacao, CSRF e validacao existentes.

Verificacoes: 9 unitarios e 22 testes de integracao aprovados, sem falhas/pulos; tipos (tsc -p tsconfig.check.json), lint e build aprovados. Teste adicional em unit.test.ts monta a aplicacao sem abrir conexao de banco e confere headers de erro/privacidade, origem hostil, Fetch Metadata e cliente permitido. A integracao usou somente MongoDB efemero local, notificacoes sinteticas e contas ficticias; nao carregou .env nem gravou no banco institucional. pnpm audit --prod retornou zero avisos para 79 dependencias de producao no momento da consulta. Nao equivale a auditoria completa nem conclusao dos modulos pendentes.

## Restauracao do layout de login por orientacao do usuario

Composicao anterior restaurada: foto na metade esquerda, fundo azul e cartao centralizado na metade direita, com marca ProFly e Cadastrar centralizados. Seletor de tema continua removido conforme pedido anterior. Recuperacao preserva a apresentacao atual e o tratamento de envio indisponivel. Sem alteracoes no dashboard, calendario, seguranca ou banco.

Otimizacao tecnica da mesma imagem: WebP com 36.138 bytes em vez de JPEG com 46.256 bytes (21,9% menor), mesma resolucao 399 x 501, JPEG original preservado como alternativa, recorte central cover e prioridade de carregamento. Nao houve aumento artificial de resolucao ou substituicao da fotografia.

Verificacoes desta correcao: 49 testes existentes de login, recuperacao, rotas e conta aprovados em 4 arquivos; tipos, lint dos arquivos alterados e build aprovados. Chrome confirmou a composicao restaurada e currentSrc carregando campus.webp com dimensoes naturais corretas. Print 33 em outputs/prints, fora do repositorio. Nao foi repetida a suite inteira nem os testes do back-end por se tratar desta correcao visual localizada.

## Qualidade visual da fotografia do login

Pedido posterior esclareceu que a melhoria desejada era de nitidez/resolucao, e nao apenas compressao. A foto recebeu tratamento conservador de super-resolucao na ferramenta integrada image_gen, partindo do JPEG original 399 x 501. Resultado efetivo 1119 x 1405; detalhes reconstruidos por IA sao estimativas. Foto original preservada, resultado versionado como campus-hd.webp e campus-hd.jpg; layout, recorte cover, formulario e regras de acesso mantidos. Prompt e processo em [CAMPUS.md](../assets/CAMPUS.md).

Verificacoes: tipos e build aprovados; links documentais e diff conferidos. Chrome confirmou carregamento de campus-hd.webp com naturalWidth 1119 e naturalHeight 1405, e a nitidez foi conferida no login renderizado. Print 34 em outputs/prints e PNG de alta resolucao em outputs/imagens/campus-melhorado.png, fora do repositorio. Nao foram repetidos testes de logica ou back-end, pois somente os caminhos/dimensoes da foto e os recursos de imagem foram alterados.

## Refinamento de Login e Conta e editor da foto

Escopo solicitado: Login e Conta, mantendo a composicao aprovada do login e a fotografia do campus. Conta reorganizada em identidade/acesso, dados cadastrais e perfil academico; nome, e-mail e telefone continuam editaveis, papel permanece protegido. Telefone formatado apenas na leitura. Saida da conta deslocada para o bloco de acesso, sem chamada vermelha dominante. Icones SVG locais padronizam acoes de acesso, edicao, salvamento, cancelamento e foto. Os avisos do login e o rodape compartilhado interno foram removidos conforme pedido; os adaptadores continuam demonstrativos e a integracao com API permanece pendente.

Avatar abre dialogo de edicao: escolher arquivo, ajustar foto atual, previa circular, zoom e posicao horizontal/vertical, centralizar, salvar, cancelar e remover. A alteracao e preparada em memoria; apenas Salvar foto ou Remover foto persiste. Aceita JPG/PNG/WebP ate 2 MB e dimensoes ate 40 megapixels, recorta para JPEG 256 x 256, libera URLs temporarias e preserva a foto atual em falha. Fechamento e acoes bloqueados durante processamento/gravacao. Cadastro original mantem seu PhotoField existente.

Evidencias: 202 testes em 32 arquivos aprovados, sem falhas/pulos. Novos testes cobrem geometria do recorte, arquivos invalidos, avatar como acionador, foco apos cancelar, gravacao apenas explicita, erro de persistencia e bloqueio durante remocao. Tipos, ESLint e build aprovados. A suite mantem avisos act de testes assincronos legados sem falhas. Conferencia no Chrome com conta sintetica: login sem aviso, conta e formulario, editor com foto atual e selecao real de JPG, previa e controles, cancelar sem salvar e modo escuro. Nenhuma foto/dado da conta foi alterado durante a conferencia; tema claro restaurado. Prints 35 a 40 em outputs/prints fora do repositorio. Nao houve validacao em aparelho iOS real nem nova execucao de testes do back-end, que nao foi alterado.

## Dedicacao semanal opcional no contrato do servidor

REQ-04/12, CASE-013/014: a ausencia de desiredWeeklyMinutes deixou de ser uma pendencia obrigatoria. O campo continua tipado e limitado quando informado; o perfil pode ser enviado sem meta semanal e permanece SUBMITTED, aguardando analise da coordenacao. Nao ha aprovacao automatica ou criacao de aula. A politica de acesso por curso permanece aplicada no servidor.

Verificacao: 9 testes unitarios e 23 de integracao aprovados, sem falhas ou pulos; tipos, lint e build do backend aprovados. Novo cenario HTTP salva perfil sem dedicacao, envia a solicitacao e consulta a persistencia para confirmar a ausencia da meta e o estado SUBMITTED. Cenarios de permissao por curso e aprovacao independente tambem passaram. Banco MongoDB efemero local; nenhum .env carregado ou banco institucional acessado. A interface continua sem integracao com a API.

## Cadastro por campo, analise restrita ao curso e refinamentos visuais

Ano futuro de uma formacao concluida agora gera erro apenas no ano, com mensagem especifica, descricao acessivel e foco no campo. Curso, instituicao, titulacao e campos de experiencia recebem erros individuais. Instituicao tem exemplo de nome/sigla e orientacao sobre o diploma. Telefone valida DDD nacional e formato fixo/celular; nova senha mostra os requisitos de tamanho, letra, numero e confirmacao, sem alterar a regra de login existente. Dedicacao semanal e opcional no cadastro e na edicao; ausencia aparece como nao informada e nao como zero. Meta de horas realizadas continua pendente do historico confirmado.

Conta criada continua com pedidos PENDING. O dashboard sinaliza cursos em analise; o coordenador ficticio esta atribuido somente a Direito e o adaptador recusa professor, coordenacao desconhecida ou curso fora de seu escopo. Teste pela interface verifica que o novo professor nao aparece nos vinculos antes de ser analisado, entra na lista depois da aprovacao e conserva outro curso pendente. Essas restricoes locais nao substituem autorizacao do servidor nem significam que a interface ja esta integrada a API.

O erro profiles.filter foi observado no Chrome em uma aba antiga e deixou de ocorrer ao recarregar somente a tela de professores, sem alterar o armazenamento. A causa exata desse estado transitorio nao foi reproduzida em inicializacao limpa. A leitura foi reforcada com validacao estrutural dos registros e useSyncExternalStore, em vez de manter snapshots de formatos potencialmente antigos em estado. Testes cobrem colecao invalida, listas internas malformadas, dados preservados e sincronizacao entre abas. Erros inesperados de rota usam tela institucional de recuperacao sem stack publico e sem limpar dados.

Login exibe a logo completa centralizada, preservando a foto e a composicao anterior. Seletores nativos receberam seta SVG e acoes do cadastro usam o componente Icon. Toggle de sol/lua conserva foco, teclado, semantica e persistencia. Pins receberam horario destacado e icones de professor/turma, com largura minima das celulas e rolagem interna da grade para evitar horario quebrado. Handlers de arraste/formulario mantidos.

Verificacao: suite completa de 209 testes em 34 arquivos aprovada com --maxWorkers=2; a primeira execucao simultanea com outros checks teve dois timeouts e foi repetida sem aumentar o limite dos testes. Depois foi acrescentado o cenario real de aprovacao pela interface; ele e as regressoes direcionadas passaram. Tipos, ESLint e build finais aprovados. Nenhuma integracao de navegador com API ou aparelho fisico foi declarada. A revisao visual usou Chrome para o erro original e previa integrada para login/cadastro/calendario em 1366 x 900 e 390 x 844; cadastro avanca com ano valido e sem dedicacao, ano futuro recebe foco correto, pagina sem rolagem horizontal em celular e calendario legivel nos dois temas. Console da previa sem erros. Arraste nativo nao foi repetido manualmente; os testes existentes de movimentacao/regra foram conservados. Prints 41 a 48 em outputs/prints, fora do repositorio; nenhuma conta foi criada pela conferencia visual e nenhum cadastro existente foi apagado.

## SMTP no backend e caixa ficticia local

REQ-01/02/03/12/13, CASE-001/004/009/051/053. Nodemailer 10.2.1 integra a porta Notifications, com confirmacao de e-mail e recuperacao de senha em HTML/texto. Configuracao opt-in validada; modo desativado por padrao. TLS direto ou STARTTLS obrigatorio para SMTP externo, certificados verificados, plaintext apenas em captura loopback nao produtiva sem credenciais. Remetente/origem dos links definidos no ambiente do servidor; tokens ficam em fragmentos para futuras telas. Mensagens nao leem arquivos/URLs externos; logs SMTP desativados, erros sem resposta privada do provedor e envio limitado a um destinatario.

Decisao do usuario: endereco ficticio nesta fase, remetente institucional apos apresentacao/aprovacao. Mailpit v1.32.0 obtido da release oficial, digest SHA-256 conferido e executado em 127.0.0.1:8025/1025, sem forwarding/relay. Aceita apenas destinatarios @profly.test nesta maquina. Duas previas sinteticas capturadas para apresentacao@profly.test; tokens nao persistidos e sem capacidade de ativacao. Ferramenta, dados e logs em work fora do repositorio. .env recebeu somente parametros locais de e-mail, preservando MongoDB; arquivo continua ignorado. Nenhuma conta pessoal/institucional foi conectada e nenhum e-mail externo enviado.

Verificacao: 12 testes da base/e-mail e 24 de integracao aprovados, sem falhas/pulos. Novo cenario HTTP usa o adaptador SMTP real com servidor de captura loopback e MongoDB efemero isolado: cadastro PENDING_EMAIL, verificacao, ausencia de vinculo academico aprovado, recuperacao, revogacao da sessao, token reutilizado recusado, destinatario inexistente sem envio e erro SMTP tratado sem segredo. Testes tambem cobrem configuracoes invalidas, opcoes TLS/certificado, um destinatario e integridade dos links em HTML/texto. Tipos, ESLint e build aprovados. pnpm audit --prod retornou zero vulnerabilidades conhecidas no momento da consulta. API reiniciada e health/ready HTTP 200; MongoDB institucional nao recebeu dados sinteticos desses testes. Mailpit conferido no navegador, com print 50 em outputs/prints fora do repositorio.

Limites: sem entrega externa, autenticacao de provedor real ou teste de handshake TLS remoto. Fila persistente/outbox, retentativas, monitoramento de entrega e endurecimento contra enumeracao em indisponibilidade SMTP continuam pendentes antes de producao. As telas /verificar-email e /redefinir-senha e a ligacao da interface com a API nao foram implementadas nesta etapa. O fluxo clicavel do usuario ainda depende dessa integracao; a conferencia atual e backend -> SMTP -> captura -> POST de confirmacao/reset. Frontend preservado, sem repetir sua suite por nao haver alteracoes nele. Detalhes em docs/EMAIL_BACKEND.md.

## Expiracao de verificacao e recuperacao: limite exato

REQ-01/12/13, CASE-001/004. Relogio injetavel no servico permite testar a validade sem esperar uma hora e sem depender da limpeza TTL. Integracao real em MongoDB efemero confirma validade de 3.599.999 ms, recusa em 3.600.000 e 3.600.001 ms, preservacao de conta/senha/sessao em expiracao, uso unico e duas redefinicoes simultaneas (somente uma aceita). Suite de integracao: 25 aprovados, zero falhas/pulos. Nenhum banco institucional ou endereco externo recebeu fixtures. Entrega ao Gmail depende de remetente SMTP autenticado; a caixa local continua limitada a @profly.test.

## Elegibilidade, score, publicacao, historico e ausencias persistidos

REQ-06/07/08/09/10/11/14, CASE-020..048/056. Implementados motor com estados/motivos e versoes, score configuravel proposto, deduplicacao conservadora, reservas globais de rascunho/publicacao, revisoes atomicas, ocorrencias e confirmacao por curso, historico proprio por cursor, ausencia e analise por curso, anexos de imagem privados e preferencias/avisos no servidor. Detalhes e decisoes propostas em ../PLANEJAMENTO_API.md. Nenhuma politica ilustrativa foi apresentada como homologada. PDF nao aceito; imagens sao decodificadas e o original preservado em colecao privada.

Verificacao: 17 testes unitarios/base/SMTP e 29 de integracao MongoDB efemero aprovados, zero falhas/pulos. Cobertos disputa real entre coordenacoes por professor, carga sem sobreposicao, dois professores pela mesma turma, versao antiga, escala publicada estavel durante edicao e rollback ao perder elegibilidade. Historico com 16 datas empatadas pagina 10+6 sem duplicar; aula passada permanece a confirmar ate decisao autentica. Atestado alheio recusado, arquivo falso/oversize recusado, bytes originais preservados e score inalterado por ausencia. Unidade cobre fixtures Ana=80/Bruno=85, fator ausente versus zero, todos os encontros, adjacencia, fronteira de carga, fuso e historico completo de 20 aulas com equivalencia explicita. Tipos, lint e build executados; conexoes somente de teste isolado. Interface conectada ainda em implementacao nesta etapa.

## Cadastro e conta persistidos: integracao de 25/10/2026

REQ-01/02/03/04/05/12/13/14, CASE-001..016/049..055. POST /auth/enroll grava identidade PENDING_EMAIL, perfil versionado, aceites e intencoes de curso na mesma transacao. Confirmar e-mail cria solicitacoes SUBMITTED; nao concede vinculo academico. Referencias de curso/disciplina, DDD/telefone, senha, ano e versoes sao validados no servidor. Dedicacao pretendida continua opcional. A analise e restrita ao coordenador do curso; ABSENT em conhecimento representa ausencia conhecida confirmada, enquanto item REJECTED nao vira zero automaticamente.

Dados da conta possuem versao esperada. Troca de e-mail exige senha atual e confirmacao do novo endereco; confirmar revoga sessoes e tokens. Troca de senha exige senha atual. Foto privada e validada por decodificacao real, limite de 2 MB/16 MP e normalizacao JPEG 256; nao recebe URL externa arbitraria.

Revisao do planejamento: classificacao de candidatos num unico snapshot transacional, empate estavel, ramo sim/nao/desconhecido na arvore e pontuacao limitada a 100. Publicacao incrementa versao das alocacoes e preserva avaliacoes imutaveis. Avaliacao de nova revisao ignora encontros encerrados, sem permitir remover/alterar encontros passados. Ausencia antiga nao bloqueia futuro. Reposicao precisa de encontro publicado posterior da mesma turma, professor, disciplina e curso; tentativa com outra turma e recusada e preserva o registro original.

Verificacoes do backend: 19 testes unitarios/base/SMTP e 32 testes de integracao aprovados, sem falhas/pulos. Comandos: node --import tsx --test test/unit.test.ts test/mail.test.ts test/scheduling.test.ts; PROFLY_RUN_INTEGRATION=1 node --import tsx --test --test-concurrency=1 test/integration.test.ts. Tipos com tsconfig.check.json, ESLint src/test/scripts, build e exportacao OpenAPI sem conexao aprovados. Os testes usaram somente MongoDB efemero _test e destinatarios sinteticos, sem carregar .env nem popular o banco institucional.

## Interface completa conectada e conferencia visual

A entrada padrao agora usa a API, mantendo a demonstracao antiga somente com VITE_DEMO_MODE=true. Nenhum dado local antigo foi apagado/importado. Login preserva foto e composicao aprovadas. Cadastro, verificacao/reset/convite, aprovacao por curso, catalogo/criterios, administracao, disponibilidade, conta/foto, arvore/comparacao, alocacoes/publicacao, agenda, historico/reposicao, ausencias e notificacoes usam contratos persistidos. Campos e versoes permanecem visiveis em erros, sem fallback para sucesso ficticio.

Suite geral executada nesta etapa: 214 testes em 35 arquivos aprovados com node node_modules/vitest/vitest.mjs run --maxWorkers=2. Suite conectada final: 7 testes aprovados com node scripts/test-api.mjs, zero falhas/pulos. Usa componentes/rotas reais em StrictMode, cliente real, Fastify e MongoDB efemero, com ponte de transporte/cookies; nao e teste de navegador externo. Cobertura: cadastro completo, aceite/confirmacao, solicitacao pendente e aprovacao somente do curso responsavel; comparacao/elegibilidade, rascunho/publicacao e calendario do professor; reposicao persistida; preferencia e ausencia sem alterar perfil; conflito de versao sem perder formulario; reset por link com revogacao; edicao de turma/oferta; abertura de rota protegida sem sessao.

A conferencia visual encontrou carregamento indefinido na rota protegida quando o evento de expiracao invalidava a consulta inicial. Corrigido encerrando o estado de carregamento na invalidacao; teste dedicado reproduz sem sessao e em StrictMode. Corrigida tambem corrida da consulta inicial com o login. Testes novos aguardam a resposta especifica da avaliacao, sem confundir badges de candidatos ja visiveis com conclusao da requisicao seguinte. Timeout de espera da conclusao de scrypt no teste de reset foi ajustado para 10 s sob concorrencia de CPU; validade de seguranca continua exatamente uma hora.

Tipos de frontend/backend, ESLint completo do frontend e backend sem erros/avisos, build e check documental passaram. Frontend integrado gera bundle separado e nao carrega o demo por padrao. OpenAPI foi regenerado sem abrir banco. Conferencia de rede/navegador: login, elegibilidade, salvar/publicar e pin visivel em API 3334 com MongoDB efemero, usando somente identidades @profly.test. Temas claro/escuro e viewport 390 x 844 conferidos; largura do documento igual a area disponivel, grade com rolagem propria. Tamanho temporario restaurado e tema escuro inicial restaurado. Prints 51 a 55 em outputs/prints fora do repositorio. Nao houve teste em aparelho fisico nem repeticao manual de arraste nativo; teste puro cobre desmembramento de uma ocorrencia e preservacao das demais.

### Dependencias externas ainda bloqueadas

Ao reiniciar a API principal com o codigo final, a reconexao ao MongoDB externo falhou: MongoServerSelectionError, MongoNetworkError, causa ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR nos tres nos. O processo encerrou corretamente sem simular persistencia; health3333 indisponivel e proxy5174 retornando502. Consulta isolada de ping com timeout de10s reproduziu o erro, sem imprimir URI/senha. A interface do Atlas ja aberta foi inspecionada; sua sessao estava expirada e redirecionou ao login ao atualizar. Nao foi possivel confirmar a causa na lista de acesso. Nenhuma permissao foi alterada ou TLS desabilitado. Conferir cluster/lista de acesso da rede atual no Atlas apos login, conforme a [documentacao oficial](https://www.mongodb.com/docs/atlas/troubleshoot-connection/), e reiniciar a API. A previa separada3334/5175 permanece operacional; isso nao comprova disponibilidade do banco externo.

O pedido autorizado de recuperacao para Gmail retornou202 generico antes do reinicio, mas nao houve entrega externa confirmada. Captura Mailpit segue limitada a @profly.test e sem relay; remetente SMTP autenticado ainda necessario. Primeiro administrador institucional tambem depende de nome/email/credencial definidos explicitamente pelo responsavel. Nao foram inventados usuarios institucionais nem inseridas fixtures no banco configurado em.env. Politicas/criterios propostos e limites de escala/privacidade/producao estao em INTERFACE_API.md e SEGURANCA.md; nao declarar ambiente homologado ou matriz inteira encerrada por essas suites.

Complemento do editor de foto conectado: 8 testes direcionados de cliente/API, movimentacao de ocorrencia e editor aprovados em dois arquivos. Novo cenario recusa fonte externa sem fetch e trata403 da rota privada mantendo erro claro, sem abrir caminho para imagem arbitraria. A suite geral de214 antecede esse cenario adicional; nao foi renomeada como uma nova execucao completa.

## Logo do login sem fundo branco

Pedido do checklist: removidos background branco, padding e cantos do bloco aplicado a logo no tema escuro. A imagem institucional transparente, centralizacao e composicao do login foram preservadas. Build aprovado; navegador em tema escuro confirmou background rgba(0,0,0,0), padding0 e exibicao sem o retangulo branco. Print57 fora do repositorio. Nao foram repetidos testes de regra de negocio, pois a alteracao e apenas CSS.

## Tema claro como padrao do checklist

Sem escolha salva, o ProFly inicia em claro, inclusive quando o dispositivo prefere escuro ou o armazenamento esta indisponivel. Escolhas explicitas de claro/escuro continuam persistidas; acompanhar o sistema exige opcao explicita na configuracao demonstrativa. Essa opcao agora grava system para distinguir escolha do usuario de ausencia de preferencia. Nao foram apagadas preferencias existentes.

Quatro testes existentes de toggle/configuracoes aprovados; tipos, ESLint dos arquivos alterados e build aprovados. Conferencia direta da resolucao cobre ausencia de escolha com OS escuro e as tres escolhas explicitas. Nao houve mudanca no backend, contas ou permissoes.

## Checklist: menu original, sino, inicio e atestados

Removida a pagina exclusiva de notificacoes: o sino abre painel na tela atual, sem borda/caixa visivel no acionador. Lista e contador usam a mesma consulta; marcar como lida atualiza a persistencia e o contador. Escape retorna foco ao sino e clique/foco fora fecha o painel. Avisos sao consultados ao abrir, ao retornar a janela e periodicamente enquanto a pagina esta visivel. Preferencia permanece versionada na API; texto explica somente os avisos internos, sem prometer entrega de e-mail. O cenario de recuperacao continua funcionando na captura sintetica com avisos internos desativados; envio externo nao foi configurado nesta etapa.

Menu reutiliza os seis icones originais em mascara, preservando o azul institucional. Ajustes saiu do menu e a rota antiga redireciona para Conta; trocar senha fica na propria Conta. Privacidade/termos ficam contextualizados em Conta e no acesso publico, sem link solto no rodape de todas as paginas. /notificacoes redireciona ao inicio para compatibilidade. Sabado e domingo permanecem no calendario.

Atestados agora possui envio explicito com arquivo, datas e cursos no mesmo formulario. O cliente valida formato/tamanho antes de criar a comunicacao; JPG/PNG/WebP ate5MB, mantendo o limite de16MP no servidor. PDF continua nao suportado. Se o envio do arquivo falhar depois de salvar as datas, o formulario conserva o arquivo, bloqueia alteracao do periodo ja persistido e reenvia para o mesmo registro. Comunicacao sem documento segue disponivel como opcao separada. Permissoes, armazenamento privado, analise por curso e preservacao do original nao foram alterados.

Inicio da coordenacao mostra agenda publicada, solicitacoes a analisar, rascunhos, aulas passadas a confirmar e acesso aos atestados. Inicio do professor mostra proximas aulas, horas programadas/confirmadas da semana, meta opcional, atalhos e historico. Dados desconhecidos ou carregando nao viram zero; ausencia de aulas gera orientacao sem inventar eventos. A visao de coordenacao usa a lista existente limitada a500 ocorrencias; ampliacao/paginacao institucional permanece necessaria para volumes maiores, conforme INTERFACE_API.md.

Verificacao final: 215 testes de regressao em35 arquivos e9 testes de interface/API/MongoDB efemero aprovados, sem falhas/pulos. Os novos cenarios verificam leitura/contador, foco/fechamento, ausencia de pagina exclusiva, toggle persistido visualmente, atestado multipart real com503 inicial e retomada sem duplicacao, agenda publicada no inicio dos dois perfis e compatibilidade das rotas. Ponte de teste agora respeita sinal de cancelamento tambem apos a resposta; o cenario de reset foi colocado ao final para nao deixar credenciais alteradas nos demais cenarios compartilhados. Espera de login leva em conta scrypt real, sem alterar limites de seguranca da API. Nenhum teste enviou e-mail externo, leu.env ou inseriu dados no banco institucional.

Tipos, ESLint dos componentes/cliente/testes e build aprovados. Conferencia visual com conta sintetica: icones antigos, sino sem borda, painel ancorado sem navegacao, texto do toggle e inicio da coordenacao. Em390x844, documento e area disponivel com375px e sem extravasamento horizontal; painel legivel e tamanho temporario restaurado. Prints58..61 fora do repositorio;59 mostra a versao final do sino sem caixa. Sem nova execucao da suite propria do backend, cujo codigo permaneceu intacto.

## CORS explícito e cookies para HTTPS local

REQ-01/12/13, CASE-006/049/051/053. Corrigido o preflight para PUT/PATCH/DELETE, que dependia dos métodos padrão do plugin. Lista explícita de métodos e headers, origens exatas sem wildcard e verificação de origem antes do handler OPTIONS. Origem hostil/null/lookalike retorna403 sem ACAO; preflight permitido retorna204, malformado400. Helmet precede o guard; HSTS fica exclusivo de produção sem preload/includeSubDomains. COOKIE_SECURE=true permite desenvolvimento HTTPS; produção não aceita desligar Secure. Prévia HTTPS usa3335, origens5176 e outro banco efêmero, preservando a prévia HTTP3334 existente.

Verificação final: 20 testes unitários/base/SMTP e32 de integração aprovados, zero falhas/pulos. Comandos: node --import tsx --test test/unit.test.ts test/mail.test.ts test/scheduling.test.ts; PROFLY_RUN_INTEGRATION=1 node --import tsx --test --test-concurrency=1 test/integration.test.ts. Tipos, ESLint src/test/scripts, build e exportação OpenAPI aprovados. Primeira tentativa no sandbox bloqueou conexão do SMTP e abertura do MongoDB de teste; repetição autorizada com acesso local passou. Nenhum teste carregou.env, populou banco institucional ou entregou e-mail externo. Gates específicos passaram; isso não encerra auditoria institucional nem libera produção.

## Horários pretendidos compactos e transporte HTTPS opcional

Pedido visual: reduzir campos excessivamente grandes e organizar horários pretendidos. Portal usa42px no desktop/44px no móvel, com fonte16px no móvel; login preservado. Linhas recolhíveis mostram dia, faixa e vigência; editor agrupa os cinco campos sem repetir grandes blocos. Disponibilidade e dedicação têm largura limitada. Dedicação segue opcional, separada da carga institucional. Identificadores, demais janelas e meta permanecem preservados ao salvar.

Verificação: 215 testes em35 arquivos com node node_modules/vitest/vitest.mjs run --maxWorkers=2 e10 cenários conectados com node scripts/test-api.mjs aprovados, sem falhas/pulos. Novo cenário abre linha existente, altera o fim, salva pela API real e confere incremento de versão e preservação dos outros dados no MongoDB efêmero. Tipos, ESLint completo do frontend, build e check documental aprovados. Mudança final de largura do seletor foi conferida no navegador; não alterou o contrato. O calendário continua somente consultivo para o professor, com aulas próprias publicadas pela coordenação. Atestado/ausência permanece coberto pela integração, incluindo upload privado e retomada após falha sem duplicar registro.

Conferência visual com conta sintética e sem salvar alterações no perfil do checklist: resumo/editável no desktop e empilhamento390x844. Documento375px/área útil375px, sem extravasamento horizontal; menu mantém sua rolagem própria. Controle externo44px e texto16px no móvel; viewport restaurado. Prints62/63 em outputs/prints fora do repositório. Não houve teste em aparelho físico.

HTTPS opcional via npm run dev:https, PFX e senha server-only em arquivo privado ignorado. Comando sem configuração é recusado. Prévia final5176 testada por rede com TLS1.3, verificação do certificado público e hostname, cookie Secure/HttpOnly/SameSite=Strict, login/perfil real no banco efêmero, escrita sem CSRF403, preferência autenticada restaurada, preflight permitido204 e origem hostil403. Arquivos.env, backend/.env e PFX via rota estática403; nome externo no certificado recusado. API HTTPS-preview3335 e frontend5176 foram reiniciados para testar o código final. APIHTTP3334 do checklist foi preservada, sem reiniciar/perder o banco efêmero em uso; carregará os novos controles de backend quando seu operador concluir o checklist e reiniciá-la.

Instalação de confiança no Windows disparou aviso durante a preparação e houve confirmação acidental do usuário. Foi desfeita com remoção exata de CurrentUser/Root, confirmada pelo usuário no aviso de remoção. Verificação posterior: entrada ausente de CurrentUser/Root, CurrentUser/CA e LocalMachine/Root. Nenhum outro certificado foi alterado. Não foi feita nova instalação nem navegação ignorando aviso; HTTPS tem prova técnica com certificado explícito, não confiança de navegador homologada. Configuração privada e certificado não foram commitados. Detalhes operacionais em HTTPS_LOCAL.md. HTTP5175 e API3334/health/ready retornaram200 ao final.

Limitações externas anteriores permanecem: falha de conexão TLS com Atlas sem causa confirmada; SMTP real não configurado, Gmail sem entrega confirmada; domínio institucional, certificado público, hospedagem, retenção/outbox e homologação não fazem parte da prova local.

## LGPD: controles de backend e configuração conservadora

REQ-15, CASE-057..062. Implementados configuração pública mínima do tratamento e gate de produção, bloqueio padrão de novos atestados, habilitação exclusiva sintética em testes, protocolos autenticados/paginados por titular, resposta administrativa versionada com eventos/auditoria e exportação própria com senha/CSRF/sessão revalidada em transação. Projeções de inclusão excluem credenciais, tokens, sessões, terceiros e binários; limite de5000 itens por categoria/10MB retorna413 sem truncar ou auditar falso sucesso. Exportação histórica conserva versão de aceite anterior. Responder protocolo não executa exclusão, anonimização ou portabilidade. Versão do cadastro2026-10-25.1; recibos antigos não alterados.

Confirmação do usuário: controlador/canal ainda não definidos. Nenhum contato ou base jurídica foi inventado/configurado; produção recusa política ausente. Documentação de inventário, bases/prazos pendentes, atendimento e incidentes em LGPD.md. O parâmetro de homologação não comprova conformidade jurídica e não habilita consentimento específico de saúde automaticamente. Rotina de expurgo institucional não foi implementada sem política de retenção.

Verificação: 20 testes unitários/base/SMTP aprovados;32 cenários anteriores de integração aprovaram nesta etapa;7 testes LGPD finais aprovados, sem falhas/pulos. Comandos: node --import tsx --test test/unit.test.ts test/mail.test.ts test/scheduling.test.ts; PROFLY_RUN_INTEGRATION=1 node --import tsx --test --test-concurrency=1 test/integration.test.ts test/privacy.test.ts; repetição final direcionada node --import tsx --test test/privacy.test.ts. A primeira execução conjunta teve37/38: o novo teste pressupunha aceite em uma fixture que usa cadastro mínimo. Corrigida preparação sintética explícita de recibo histórico; teste comprova preservação, sem alterar registros reais ou reduzir exigência. Acrescentado cenário de exportação excessiva e conferida revalidação de sessão após lock.

Tipos, ESLint do backend, build, exportação OpenAPI e check documental aprovados. Todos os bancos efêmeros _test; sem leitura.env, alterações do banco institucional ou envio externo. Prévia adicional3336/5177 preserva as prévias anteriores; seleção por PROFLY_PREVIEW_PORT=3336 e URL de e-mail fictício correspondente localhost5177. Nenhum certificado foi instalado ou confiança do Windows modificada nesta etapa. Não equivale a homologação, teste de penetração ou conformidade institucional completa.

## Interface LGPD e aviso versionado

Implementadas central pessoal, exportação após confirmação de senha, abertura/consulta de protocolos e atendimento administrativo com versão/eventos. Aviso público e cadastro apresentam configuração institucional pendente; ciência do aviso não cria consentimento amplo. Termos/aviso2026-10-25.1 preservam recibos anteriores. Atestados mostram bloqueio ou uso somente sintético conforme resposta real do backend. Contexto de curso não aparece nas novas áreas pessoais/institucionais de privacidade. Não foram apagados dados, removidos documentos ou enviados pedidos reais em nome de terceiros.

Verificação: 215 testes em35 arquivos com vitest run --maxWorkers=2;12 testes conectados React/API/MongoDB efêmero com node scripts/test-api.mjs, sem falhas/pulos. Novos cenários conferem protocolo próprio, contato pendente e resposta administrativa persistida/versionada. Na primeira passagem, os dois cenários liam o banco ao encontrar texto ainda no textarea antes de a requisição terminar; espera corrigida para a mensagem de sucesso emitida após commit. Os demais dez cenários continuaram aprovados. Tipos, ESLint completo, build e check documental aprovados. Último ajuste visual limitou largura do formulário; conferido em navegador e novo build.

Conferência real de rede/navegador emlocalhost5177 com conta sintética: Conta -> central, registro de pedido de acesso com prazo geral e protocolo visível, modal de senha e preparação de download JSON pela API. Sem afirmação de salvamento físico do arquivo pelo navegador. Em390x844, documento/área útil375px, textarea~302px/fonte16px, sem extravasamento; viewport restaurado. Prints64/65 fora do repositório. A administração foi validada na suíte conectada; sem simular análise institucional real. Prévia antiga3334/5175 foi preservada, sem perder seu banco efêmero; novos controles exigem API atualizada, disponível na prévia adicional3336/5177. Nada foi alterado no repositório de confiança do Windows. Domínio institucional, Atlas externo, SMTP real, operação de expurgo e políticas institucionais permanecem pendentes.

## Saída concentrada no perfil e atualização sem perder o checklist

Pedido adicional do usuário: remover o botão repetido de saída. Removido do layout das páginas e incluído no painel do perfil, com avatar/foto, Conta e Privacidade. Um único menu funciona para professor, coordenação e administração; fecha por Escape/foco/clique fora e retorna foco ao acionador no Escape. Não altera as permissões ou a API de logout.

Verificação: suíte conectada completa13/13 aprovada, sem falhas/pulos; inclui as duas saídas já utilizadas pelos fluxos e cenário dedicado de menu em duas rotas, foco/Escape/clique fora e logout. A asserção foi fortalecida para reutilizar explicitamente o cookie antigo após sair; repetição direcionada aprovou esse cenário (1 aprovado,12 fora do filtro, sem contabilizar como nova suíte completa). Cookie antigo retorna401. Tipos, ESLint dos arquivos alterados e build aprovados. Não repetida a suíte geral215 após essa mudança restrita ao layout conectado; sua execução LGPD anterior está registrada acima.

Navegador: menu claro e escuro,390x844 com documento/área útil375px e painel x16..301/285px sem extravasamento; tema claro e viewport restaurados. Prints66..68. O rodapé deixou de ter o botão; ação de logout aparece somente ao abrir o perfil. Print69 mostra o endereço original5175 com coordenação ainda autenticada depois da atualização.

Atualização operacional: localizado o MongoDB efêmero já pertencente ao processo da prévia3334; criado adaptador atual3337 sobre esse mesmo banco. Não leu.env nem acessou Atlas ou gerou novos usuários. Contagens antes/depois idênticas nas coleções users/profiles/applications/legalAcceptances/absences/occurrences; nenhuma semeadura, descarte ou troca de banco. A primeira tentativa de reiniciar somente o frontend foi impedida por falha de revisão automática por limite de uso, sem determinação de insegurança. Após o pedido de continuação, a nova revisão aprovou a mesma ação e o frontend5175 foi reiniciado com proxy3337. Sessão de coordenação preservada no navegador, vínculo/professor anterior visível; catálogo público de privacidade e health/ready200. Uma aba IAB sem formulário ficou vazia após reconexão Vite; reload carregou o portal sem novo login. Usuário pode atualizar a página após o reinício de desenvolvimento. Proprietário antigo do MongoDB permanece vivo para preservar o banco efêmero. Certificados/Windows, banco institucional e SMTP externo não foram alterados. Não há bloqueio de aprovação restante nesta atualização.
