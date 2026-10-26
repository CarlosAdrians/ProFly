# Spec do back-end institucional do ProFly

Versao: 0.1, 24/10/2026. Estado: contrato de trabalho para implementacao incremental. A base do servidor e os primeiros testes foram implementados; o andamento de cada area esta em [STATUS.md](../validation/STATUS.md). Regras academicas, pesos e politicas ainda pendentes estao identificados; a spec nao os apresenta como aprovados pela faculdade.

## 1. Escopo e fontes

O produto atende administrador, coordenadores por curso e professores. Centraliza cadastro detalhado, solicitacao e aprovacao de entrada, disciplinas, competencias, disponibilidade, alocacoes, calendario, recomendacoes, historico e comunicacao de ausencia com atestado.

Fontes de contexto: [visao do produto](../../README.md), [definicao do back-end](../BACKEND.md), [compatibilidade docente](../PROPOSTA_COMPATIBILIDADE.md) e [expansao institucional](../EXPANSAO_INSTITUCIONAL.md). O [fluxo de trabalho](../WORKFLOW.md) define a ordem de implementacao e os commits.

Tecnologias definidas: Node.js e MongoDB. A configuracao do banco cabe a outro integrante do grupo; a aplicacao entrega e valida os contratos de persistencia. TypeScript e API REST sao a proposta tecnica atual. Framework HTTP, driver e bibliotecas serao registrados na etapa de estrutura, sem alterar as regras deste documento.

## 2. Requisitos rastreaveis

Os identificadores abaixo ligam a spec aos cenarios da [matriz JSON](backend-cases.json). Cada cenario precisa de teste e evidencia antes de ser declarado atendido.

| ID | Requisito |
| --- | --- |
| REQ-01 | Autenticar identidades, encerrar/revogar sessoes e impedir privilegios autodeclarados. |
| REQ-02 | Autorizar cada operacao pelo recurso e curso, preservando escopo do administrador, coordenador e professor. |
| REQ-03 | Receber solicitacao de participacao e exigir analise independente por curso. |
| REQ-04 | Manter perfil docente detalhado com rascunho, dados declarados/confirmados e validacao por campo. |
| REQ-05 | Manter cursos, competencias, disciplinas, turmas, periodos e ofertas com referencias e unicidade consistentes. |
| REQ-06 | Validar disponibilidade, vigencia, intervalos e carga institucional em todos os cursos afetados. |
| REQ-07 | Executar arvore de elegibilidade por disciplina/oferta com motivos, pendencias e versao das regras. |
| REQ-08 | Calcular score deterministico, limitado e explicavel, sem inventar dados ausentes. |
| REQ-09 | Criar/alterar alocacoes e publicar revisoes de escala com revalidacao e consistencia sob concorrencia. |
| REQ-10 | Registrar ausencia e proteger atestados, preservando o score academico. |
| REQ-11 | Exibir ultimas 10 aulas e historico completo proprio, sem tratar aula planejada como realizada. |
| REQ-12 | Validar entrada e saida, tratar falhas e rejeitar resultados contraditorios, incompletos ou excessivamente permissivos. |
| REQ-13 | Persistir dados e invariantes no MongoDB e validar falhas de dependencia sem sucesso ficticio. |
| REQ-14 | Manter autoria, historico e versoes e permitir integracao dos modais sem perder dados preenchidos. |
| REQ-15 | Proteger dados pessoais, registrar ciencia versionada e atender protocolos/consultas do titular sem acesso a terceiros ou exclusao automatica de registros obrigatorios. |

## 3. Identidade e fronteira de confianca

O servidor determina identidade, papel e escopo a partir de uma sessao autenticada e dos vinculos vigentes. Campos como role, approved, courseMemberships, reviewerId, score e teacherId de outra pessoa nao podem ser aceitos como alteracoes livres de um formulario de professor.

Administrador cadastra cursos e coordenadores. Professor faz o proprio cadastro, solicita entrada para curso/disciplinas, completa os proprios dados e acompanha a analise. Coordenador gerencia disciplinas e pode iniciar um convite, sem dispensar a analise. Somente coordenador com vinculo ativo no curso consulta e analisa solicitacoes academicas; papel de administrador nao oferece bypass nessa operacao, inclusive para pessoas com papeis simultaneos. O vinculo e conferido novamente dentro da transacao, com serializacao contra revogacao. A conta para acompanhar uma solicitacao pendente nao concede acesso academico. Cenario de regressao: CASE-063, relacionado a REQ-02/03/14.

Aprovacao para um curso nao aprova outro. A alteracao do identificador de recurso na URL, corpo ou filtro nao pode escapar desse limite. A desativacao de conta ou revogacao do vinculo tem efeito nas proximas operacoes protegidas, sem depender apenas de permissoes antigas no navegador.

Convite e recuperacao de senha exigem validade, uso unico e consumo consistente. Ativacao da identidade e aprovacao academica sao estados independentes. Nao devolver senha, hash, token privado ou dados de outros professores em respostas de consulta.

E-mail (decisao de 24/10/2026): iniciar com SMTP e captura local ficticia Mailpit, mantendo o frontend para etapa posterior. Remetente institucional depende da faculdade; nao usar conta pessoal nesta fase. EMAIL_TRANSPORT e desativado por padrao; SMTP externo exige TLS com certificado valido. Origem dos links e remetente pertencem a configuracao do servidor. Links de verificacao/reset reservam fragmento com token para futuras telas, sem token na query da requisicao HTTP. Implementacao, limites e evidencia: [E-mail no backend](../EMAIL_BACKEND.md), REQ-01/03/12/13 e CASE-004/009/051/053.

## 4. Cadastro e qualidade dos dados

Seccionar o perfil em identificacao, formacao, conhecimentos, experiencia docente/profissional e disponibilidade. Dados de experiencia e competencia devem ter origem, situacao de analise e versao. Regras ilustrativas do documento de compatibilidade so serao tratadas como configuracao real depois de revisao institucional.

Permitir salvar campos validos em rascunho. Informar explicitamente o que falta para submissao, analise ou recomendacao. Diferenciar ausencia declarada de experiencia, campo desconhecido e experiencia ainda nao analisada. Submeter um formulario com campos obrigatorios incompletos deve retornar erros por campo, sem sucesso parcial silencioso.

Validar tipos, tamanho, formato, referencia e limites no servidor. Strings vazias, espacos, null, objetos no lugar de texto, numeros nao finitos e arrays excessivos devem receber erro coerente com o campo. A normalizacao de nome/e-mail deve ser documentada e aplicada de modo consistente, incluindo os indices do banco.

Rejeitar campos protegidos e propriedades inesperadas em comandos de alteracao. Filtros devem seguir uma lista permitida; objetos recebidos do cliente nao podem ser repassados diretamente como seletores ou comandos do MongoDB. Proteger consultas e atualizacoes de chaves de operador injetadas.

Dados retornados seguem contrato com tipos e estados completos. Um erro de persistencia ou de servico nunca pode produzir uma mensagem de salvamento bem-sucedido.

## 5. Academico, horarios e carga

Disciplina pertence ao contexto de curso definido; oferta liga disciplina a turma e periodo. Confirmar todas as referencias no servidor. Inativacao preserva historico e deve tratar operacoes futuras afetadas, sem apagar escalas publicadas.

Horario deve ter dia, inicio/fim e vigencia em fuso institucional configurado. Validar inicio anterior ao fim e a grade aplicavel. A primeira versao nao presume aulas atravessando a meia-noite: esse caso exige suporte explicito antes de ser aceito. Os dias e turnos nao sao fixados pelo exemplo de Sistemas de Informacao.

Interseccao de intervalos: inicioA < fimB e inicioB < fimA, com datas e dias de vigencia compativeis. Horarios adjacentes nao conflitam apenas por compartilhar a fronteira. Identificadores diferentes de bloco nao dispensam comparar horarios reais.

Conferir todos os encontros da oferta, compromissos em outros cursos, indisponibilidades aplicaveis e carga nas semanas afetadas. O limite institucional/contratual vem de fonte autorizada; nao e substituido pela dedicacao pretendida declarada pelo professor. Grade, intervalo e conversao entre minutos/hora-aula precisam de configuracao institucional.

Decisao confirmada em 24/10/2026: a dedicacao semanal pretendida e opcional, inclusive na submissao do perfil (REQ-04, CASE-013/014). Ausencia da meta nao e zero e nao impede solicitar entrada em um curso. O acompanhamento de horas realizadas depende de ocorrencias confirmadas no historico (REQ-11); datas passadas ou horarios pretendidos nao contam como aulas realizadas. A criacao da conta nao aprova vinculo: somente a coordenacao responsavel pelo curso pode decidir a solicitacao, sem aprovar automaticamente outros cursos (REQ-02/03).

## 6. Contrato da arvore e do score

A avaliacao recebe um contexto valido de oferta e professor e monta no servidor os dados necessarios de perfil, vinculos, requisitos e compromissos. Nos binarios verificam aplicabilidade, presenca de informacao confirmada, requisitos minimos e condicoes temporais. A quantidade de nos acompanha os requisitos de cada disciplina.

Estados de elegibilidade:

- ELIGIBLE: todos os requisitos obrigatorios conhecidos e atendidos.
- PENDING: faltam informacoes ou analise de condicao obrigatoria, sem falha obrigatoria conhecida.
- INELIGIBLE: existe requisito obrigatorio nao atendido ou conflito conhecido.
- CONFIGURATION_PENDING: oferta ou criterios insuficientes para executar a avaliacao completa.

Estados de pontuacao: CALCULATED, PENDING ou NOT_APPLICABLE. Um professor pode ser ELIGIBLE e ter score PENDING por dados da classificacao ainda ausentes. Uma falha obrigatoria conhecida prevalece sobre outras pendencias na elegibilidade; todas as razoes disponiveis podem ser explicadas. Erro estrutural de entrada retorna erro de validacao, sem rotular o professor como incapaz.

Uma resposta de avaliacao deve conter identificadores do contexto, evaluatedAt, versoes de perfil/regras, estado de elegibilidade, testes/motivos, pendencias, estado da pontuacao e fatores. value deve ser null se a pontuacao nao estiver calculada. Uma avaliacao sem horarios completos nao pode afirmar disponibilidade completa.

Score CALCULATED exige numero finito entre 0 e 100 e fatores que expliquem o total dentro da tolerancia de arredondamento. Nao apresentar esse indice como probabilidade de sucesso. Pesos sao comuns aos candidatos da mesma configuracao e versionados; dados ausentes nao autorizam redistribuir pesos individualmente.

A formula inicial 60/25/15, os limites de experiencia e a rubrica do [documento de compatibilidade](../PROPOSTA_COMPATIBILIDADE.md) sao propostas de partida. Podem ser usados como fixtures sinteticas de teste; sua execucao nesses testes nao os valida como politica da faculdade. Uma configuracao academica sem revisao deve permanecer identificada como tal.

O motor nao reserva o professor. Salvar ou mover uma alocacao exige nova verificacao dos dados atuais. Atestados, diagnosticos, dados pessoais de contato e percentual de preenchimento nao integram os fatores academicos. Curso solicitado nao concede pontos nem permissao automaticamente.

## 7. Alocacoes, publicacao e concorrencia

O mesmo contrato de alteracao atende formulario e arraste de cartao. Em erro, preservar o estado persistido anterior e retornar informacao suficiente para o front-end restaurar a posicao e manter os campos preenchidos.

Usar versao esperada para impedir sobrescrita silenciosa. Duas requisicoes simultaneas nao podem produzir sobreposicao invalida de professor/turma nem ultrapassar carga. A estrategia de persistencia deve coordenar alteracoes dos recursos compartilhados, revalidar e gravar de forma consistente. Testes simultaneos precisam executar em MongoDB de teste real, usando transacoes/controle de versao conforme a implementacao escolhida.

Publicacao e republicacao devem ser consistentes, sem metade da revisao aplicada. A proposta atual e manter versao publicada estavel e rascunho editavel. Proposta tecnica implementada: rascunhos salvos e ultima publicacao reservam horarios/carga; publicar revalida e troca a revisao atomicamente, com avisos internos opcionais. Encontros passados sao preservados e a reavaliacao usa somente o futuro. Esta politica permanece sujeita a homologacao institucional, sem alterar o status proposto dos pesos e requisitos.

## 8. Ausencias, anexos e historico

Ausencia tem autor, periodo, situacao e referencia a anexo privado, quando houver. Acesso ao documento exige autorizacao a cada consulta/download; uma URL ou identificador conhecido nao basta. Validar formato, tamanho e conteudo do arquivo segundo limites configurados. Armazenamento privado, limites e tratamento de afastamento ainda em analise precisam ser fixados na implementacao.

O calendario e a elegibilidade usam somente a indisponibilidade aplicavel. O documento e os metadados clinicos nao aparecem em respostas de recomendacao. A ausencia preserva competencias e score academico. Seu envio nao apaga, redistribui ou republica aulas automaticamente.

Historico proprio inclui curso, disciplina, turma, data, horario e situacao. A dashboard mostra as ultimas 10 ocorrencias passadas, em ordem decrescente de inicio, com desempate estavel, e oferece consulta paginada do restante. Aplicar autorizacao antes de filtros, ordenacao e paginacao.

Uma ocorrencia prevista com data passada nao vira realizada automaticamente. A confirmacao deve ter autoria/procedimento definido. Canceladas, remarcadas e pendentes nao geram experiencia concluida por simples passagem do tempo. O calculo usa todo o historico pertinente confirmado, sem limitar-se aos 10 itens da dashboard e sem duplicar dados declarados/importados.

## 9. Convencao inicial de respostas HTTP

| Situacao | Resposta proposta |
| --- | --- |
| JSON malformado | 400 com erro estruturado. |
| Campo invalido, tipo incorreto ou comando semanticamente invalido | 422 com code, message e fieldErrors quando aplicavel. |
| Sessao ausente/invalida | 401. |
| Operacao proibida para o papel | 403. |
| Recurso inexistente ou fora do escopo consultavel | 404, conforme politica consistente de ocultacao do recurso. |
| Duplicidade, versao desatualizada ou disputa de alocacao | 409 com codigo especifico. |
| Arquivo acima do limite / formato recusado | 413 / 415. |
| Dependencia essencial indisponivel | 503; sem sucesso ficticio. |
| Avaliacao valida com dados academicos pendentes | 200 com estado PENDING/CONFIGURATION_PENDING e motivos, sem score inventado. |

O OpenAPI detalhara rotas, schemas e exemplos na implementacao. Erros nao devem expor stack, credenciais, seletores de banco ou documentos privados. Correlacao de erros pode usar identificador tecnico, sem colocar informacoes clinicas no log.

## 10. Estrategia de validacao e criterio de conclusao

Suites obrigatorias antes da conclusao do back-end: tipos/lint/build, unitarios de dominio, contratos de entrada/saida, autenticacao/autorizacao, integracao real com MongoDB de teste, concorrencia e cenarios adversariais. Depois, validar os fluxos completos nas telas. Testes de integracao ficam isolados de producao e nao sao confundidos com repositorios simulados.

A [matriz](backend-cases.json) enumera cenarios planejados. A cobertura real e incremental e esta registrada em [STATUS.md](../validation/STATUS.md). O rastreio de evidencias deve associar ID do cenario, teste real, comando, resultado e limitacao. Nenhum cenario pode ser declarado PASS apenas por existir neste arquivo.

Cada defeito encontrado deve gerar um cenario reproduzivel e a correcao correspondente. Exercitar valores de fronteira, dados ausentes, tipos trocados, sequencias de estados invalidas e operacoes simultaneas. Conferir invariantes de saida, nao apenas o codigo HTTP.

Para concluir: todos os requisitos com testes e evidencia, nenhum teste obrigatorio pulado, contratos consistentes, integracao e concorrencia aprovadas, documentacao de configuracao entregue e riscos remanescentes explicitados. Uma dependencia externa pendente impede a declaracao de conclusao integrada, mesmo quando commits incrementais ja foram feitos.

## 11. Pendencias institucionais que nao podem ser inventadas

- Requisitos reais de cada disciplina e quem confirma formacao/competencias/experiencia.
- Revisao dos pesos, limites, rubrica e equivalencia de experiencia parcial.
- Grade oficial, intervalos, carga maxima e unidade de hora-aula.
- Confirmacao de aulas realizadas, reservas de rascunho e publicacao/republicacao.
- Tratamento de ausencia ainda em analise, substituicao/reposicao e visibilidade entre cursos.

Essas pendencias podem ser representadas por configuracao e estados explicitos durante o desenvolvimento. Fixtures sinteticas permitem testar o mecanismo; nao substituem a definicao institucional.

## Privacidade e LGPD: incremento de 25/10/2026

REQ-15, CASE-057..062. A politica operacional e a matriz de dados estao em [LGPD.md](../LGPD.md). Protocolo autenticado para direitos, consulta propria paginada, resposta administrativa versionada com eventos preservados e auditoria. Respondido nao significa exclusao/anonimizacao executada. Acesso/confirmacao completos possuem referencia de15 dias; demais direitos dependem da analise e das regras aplicaveis, sem aplicar15 dias indiscriminadamente.

Exportacao propria exige senha atual, CSRF, sessao ativa, projecoes de inclusao e snapshot transacional. Sem hashes de senha, tokens, sessoes ou arquivos de terceiros; binarios privados baixados separadamente sob autorizacao existente. Limites de5000 itens por categoria/10MB, sem truncar silenciosamente; excedente orienta protocolo completo. Novos atestados bloqueados por padrao, com permissao sintetica em testes e habilitacao institucional explicita fora deles. Producao exige dados minimos de politica homologada; isso nao prova conformidade juridica. Nenhuma retencao ou base legal e inventada. Aceites antigos nao sao reescritos.
