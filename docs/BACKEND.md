# Definição do back-end do ProFly

Atualização: 24/10/2026. Este documento consolida decisões da conversa e propõe o funcionamento do back-end. Não representa uma implementação pronta. Regras propostas e pendências devem permanecer identificadas até serem resolvidas.

A [spec de implementação](specs/BACKEND_V1.md) organiza os requisitos rastreáveis e os contratos de validação. O [fluxo de trabalho](WORKFLOW.md) define a sequência e os commits por área; a [matriz de cenários](specs/backend-cases.json) registra os casos ainda planejados.

## 1. Decisões confirmadas

| Tema | Decisão |
| --- | --- |
| Plataforma | Uma aplicação para os cursos da faculdade. |
| Tecnologia | Node.js e MongoDB. |
| Banco | A configuração ficará com outro integrante do grupo; a aplicação deverá ter um contrato de conexão e modelos combinados com ele. |
| Administrador | Cadastra cursos e coordenadores e define os vínculos de responsabilidade. |
| Coordenador | Cadastra professores e disciplinas, organiza o contexto acadêmico dos cursos pelos quais é responsável e decide alocações. |
| Professor | Completa seu próprio cadastro com informações de atuação, conhecimentos e disponibilidade e consulta seus próprios horários, reunindo os cursos em que atua. |
| Entrada do professor | Solicitação por curso e disciplinas, analisada pela coordenação responsável. Preencher cadastro não concede acesso acadêmico automaticamente. |
| Dashboard do professor | Escala, solicitação de entrada, perfil progressivo, disponibilidade e comunicação de ausência com atestado. |
| Histórico da dashboard | Últimas 10 aulas do próprio professor, reunindo seus cursos, e acesso ao histórico completo. |
| Ausência e atestado | Documento em fluxo reservado; afastamento afeta disponibilidade no período aplicável e preserva competências e score acadêmico. |
| Recomendação | Verificações de elegibilidade com decisões binárias, seguidas de score de compatibilidade por disciplina e horário. |
| Interface | Preservar a estética atual; aproveitar modais nos cadastros; prever alocações e calendário com cartões movimentáveis. |
| Prioridade | Concluir as regras do back-end e estruturar os fluxos do front-end antes da implementação completa. |

O cadastro único de professor deve permitir atuação em vários cursos. Uma indisponibilidade causada por aula em outro curso deve ser considerada ao recomendar ou alocar.

A divisão de cadastro foi refinada durante a conversa: o coordenador mantém o cadastro inicial de professores e disciplinas; o professor fornece as informações complementares usadas na recomendação. A decisão anterior de concentrar todos os cadastros no administrador foi substituída por essa divisão.

## 2. Organização técnica proposta

Usar uma API REST em Node.js com TypeScript, organizada por módulos dentro de uma aplicação. TypeScript e REST são propostas técnicas; framework HTTP, driver e bibliotecas serão fixados na implementação conforme o contrato aprovado.

Fluxo de uma operação: requisição -> autenticação -> autorização por recurso/curso -> validação -> regra de negócio -> repositório MongoDB -> resposta.

Módulos previstos:

- Acesso: usuários, sessão, convites, ativação e recuperação de senha.
- Administração: cursos, coordenadores, professores e vínculos.
- Organização acadêmica: períodos letivos, turmas, disciplinas e ofertas.
- Competências e disponibilidade: informações utilizadas na elegibilidade e na classificação.
- Solicitações de participação: análise da coordenação por curso, com aprovação, ajuste ou recusa registrada.
- Ausências: comunicação de afastamento, período afetado, documento privado e acompanhamento pela coordenação autorizada.
- Planejamento: alocações, validação de conflitos, calendário e publicação.
- Histórico: autoria e alterações relevantes dos cadastros e da escala.

As regras de alocação e recomendação ficam no servidor. Os formulários e o arraste de cartões usam os mesmos contratos de API.

## 3. Responsabilidades e permissões

Proposta de detalhamento a partir dos perfis confirmados:

| Operação | Administrador | Coordenador | Professor |
| --- | --- | --- | --- |
| Criar cursos e contas de coordenador | Sim | Não | Não |
| Cadastrar professor | Suporte administrativo a definir | Sim, no contexto de seus cursos | Complementa o próprio cadastro |
| Alterar dados globais do professor | Tratamento administrativo a definir | Política de alteração a definir | Próprios campos permitidos |
| Definir vínculos de coordenação | Sim | Não | Não |
| Definir vínculos de atuação docente | Política a definir | Proposta: vincular ao próprio curso | Interesse declarado sujeito ao vínculo autorizado |
| Gerenciar disciplinas, turmas e ofertas | Suporte administrativo, a definir | Somente cursos atribuídos | Não |
| Consultar docentes disponíveis para alocação | Visão administrativa | Docentes autorizados para seu curso | Não |
| Criar e alterar alocações | Responsabilidade acadêmica com a coordenação | Somente cursos atribuídos | Não |
| Consultar escala | Visão administrativa a definir | Contexto de seus cursos | Próprios horários |
| Informar disponibilidade | Não é tarefa de rotina | Consulta para organizar as aulas | Sim, no próprio cadastro |
| Analisar solicitação de entrada | Suporte a definir | Somente cursos atribuídos | Acompanha a própria solicitação |
| Comunicar ausência e enviar atestado | Não é tarefa de rotina | Recebe os casos de seu escopo | Envia e acompanha o próprio caso |
| Publicar escala | A definir | Proposta: próprio curso/período | Não |

O servidor obtém permissões da identidade autenticada e dos vínculos ativos. Um `courseId` recebido na URL ou no corpo não concede acesso. Conferir também os vínculos de turma, oferta, professor e alocação; trocar um identificador não pode permitir acesso a outro curso.

Proposta para conflitos entre cursos: informar que o professor está ocupado no intervalo necessário. A exibição de nome de disciplina, turma e demais informações de outro curso exige decisão explícita de visibilidade.

## 4. Modelo conceitual proposto

Os itens abaixo descrevem entidades; a divisão final em coleções e documentos incorporados depende dos padrões de consulta e atualização.

| Entidade | Informações e relações principais |
| --- | --- |
| Usuário | Identidade de acesso, e-mail normalizado, estado da conta e credencial protegida. |
| Vínculo de acesso | Usuário, papel e escopo; coordenação vinculada ao curso, professor associado ao seu perfil docente. Permitir combinar papéis se necessário. |
| Curso | Nome, código e estado. |
| Professor | Cadastro único, usuário associado quando ativado, contato, competências e limite de carga horária institucional. |
| Vínculo docente | Professor e curso, com estado e período de validade quando necessário. |
| Competência | Conhecimento cadastrado de forma estruturada; nível e evidência, se esses critérios forem adotados. |
| Solicitação de participação | Professor/identidade solicitante, curso, disciplinas, situação e análise com ator, data e motivo. Aprovação por curso, sem concessão automática de papéis administrativos. |
| Formação e experiência | Formação pertinente, competências declaradas/confirmadas e histórico docente/profissional com origem e períodos; experiência concluída distinta de planejamento futuro. |
| Disciplina | Curso, nome, código e requisitos de competência. Proposta inicial: identidade por curso, preservando códigos antigos. |
| Ficha de compatibilidade | Requisitos obrigatórios, conhecimentos desejáveis, critérios de experiência, pesos, limites e versão da regra por disciplina. |
| Ocorrência de aula | Encontro com data, horário, disciplina/oferta, turma, professor e situação; confirmação de realização e vínculo de remarcação quando aplicável. |
| Período letivo | Identificação e datas de início/fim. Datas precisam ser consideradas para detectar períodos sobrepostos. |
| Turma | Curso, período letivo, identificação e turno. |
| Oferta de disciplina | Disciplina para uma turma em determinado período, com demanda de aulas/carga horária. |
| Grade de horários | Dias, turnos, blocos com início/fim e intervalos, aplicáveis ao contexto acadêmico definido. |
| Disponibilidade | Professor, vigência, dia, início/fim e exceções; informada pelo professor. Confirmação e alterações que afetem a escala ainda pendentes. |
| Alocação | Oferta, professor, encontros semanais, vigência, versão e situação no planejamento. |
| Publicação da escala | Versão publicada para curso/período e seus encontros; deve permitir consulta estável pelo professor. |
| Convite e recuperação | Finalidade, usuário, token protegido, validade e consumo único. |
| Sessão e histórico | Sessão revogável e registro das alterações relevantes com ator e data. |
| Ausência e anexo | Professor, início/fim, situação de análise, aulas afetadas e referência a documento privado. A recomendação consulta apenas a indisponibilidade aplicável. |

Propostas de unicidade: e-mail normalizado de acesso, código de curso, vínculo ativo equivalente, código da disciplina dentro do curso e identificação da turma dentro do curso/período. Confirmar a política de nomes de disciplinas e a existência de códigos oficiais antes de substituir as regras atuais.

Preservar a inativação e o histórico de registros referenciados por alocações. Evitar exclusão física de informações que já participaram de uma escala publicada. Inativar ou alterar o vínculo de alguém exige tratar os planejamentos afetados, sem apagar o histórico.

## 5. Autenticação e entrada dos usuários

Proposta: o primeiro administrador é provisionado por procedimento de configuração com credencial definida pelo responsável, sem senha padrão no código. O administrador cadastra coordenadores. Para professor, a direção definida inclui solicitação de participação indicando curso e disciplinas, sujeita à análise da coordenação. O coordenador também pode iniciar um cadastro e convite, aproveitando o fluxo existente; a entrada por convite deve respeitar o mesmo controle de vínculo e perfil autorizado.

Autenticar a identidade para acompanhar a solicitação não equivale a aprovar o acesso acadêmico. Antes da aprovação, permitir somente os próprios dados, solicitações e pedidos de ajuste. Após aprovação, liberar apenas o escopo correspondente. Uma recusa ou pendência em outro curso não deve apagar um vínculo já aprovado. Proteger todas essas condições no servidor.

Cada pessoa recebe sua própria conta. O servidor deve validar a senha, manter apenas seu hash apropriado para senhas e criar uma sessão revogável. Para o front-end web, propõe-se cookie de sessão HttpOnly, com Secure em HTTPS, política SameSite e proteção das operações contra CSRF conforme a implantação.

Convites e recuperação precisam de tokens imprevisíveis, com prazo e uso único. Proteger os tokens armazenados e não retorná-los em listagens. Ativação, consumo do convite e associação do perfil devem concluir de forma consistente. Definir também invalidação de sessões após bloqueio de conta e alterações relevantes de acesso.

O contrato de ativação existente no front-end deve ser adaptado: o servidor resolve professor, e-mail e perfil a partir do convite e dos cadastros; não confia nesses dados enviados pelo navegador. A entrega de e-mail e o mecanismo inicial de envio manual dos convites ainda precisam ser combinados.

### Cadastro completo do professor

Direção confirmada: o professor informa os próprios dados necessários à recomendação no cadastro. O coordenador mantém sua rotina de cadastrar professores e disciplinas, sem precisar redigitar toda a disponibilidade e os conhecimentos de cada docente.

Fluxo proposto:

1. O professor informa seus dados e solicita participação no curso e nas disciplinas escolhidas. O coordenador pode iniciar um cadastro e convite no próprio contexto. O servidor evita duplicar uma pessoa que já possua conta.
2. O professor completa o perfil progressivamente, podendo salvar rascunho. Sua identidade, a conclusão do perfil e a aprovação do vínculo são estados distintos.
3. A solicitação chega ao coordenador responsável pelo curso. Ele consulta os dados e aprova, pede ajustes ou recusa, com histórico da decisão. A política de confirmação de cada aptidão é proposta para revisão.
4. Antes da aprovação, a pessoa acompanha apenas seus próprios dados e solicitações. Para cursos diferentes, a análise de cada vínculo é independente. A aprovação não atribui uma aula automaticamente.
5. O coordenador utiliza os dados preenchidos na alocação, sem nova digitação. Perfil com informações obrigatórias pendentes não aparece como plenamente elegível. A seleção final continua sujeita às verificações no servidor.

| Seção proposta | Campos úteis | Uso no sistema |
| --- | --- | --- |
| Identificação e contato | Nome completo, e-mail de acesso conferido pelo convite e telefone. | Identificar a pessoa e manter contato; campos editáveis e troca de e-mail devem ter regras próprias. |
| Atuação e conhecimentos | Áreas, competências selecionadas de um catálogo e disciplinas em que declara aptidão; formação e experiência quando forem critérios definidos. | Comparar o perfil aos requisitos das disciplinas. |
| Disponibilidade | Dias da semana, um ou mais intervalos de início/fim e período de validade. | Conferir todos os encontros da aula pretendida. |
| Dedicação pretendida | Quantidade de horas que deseja/pode disponibilizar, se esse dado for adotado. | Ajudar o planejamento, separado do limite institucional validado. |

As disciplinas indicadas pelo professor representam aptidão ou interesse, conforme a regra escolhida; a alocação oficial continua sendo decisão do coordenador. Competência é diferente de disciplina e deve ser modelada para permitir comparar conhecimentos entre matérias relacionadas.

O limite institucional/contratual de carga não deve ser alterado por autodeclaração do professor. Definir quem o valida. Selecionar um curso como interesse também não concede automaticamente vínculo nem acesso ao curso.

Cada professor edita o perfil associado à sua conta; o cadastro não deve permitir escolher outra pessoa para editar. Usar dados estruturados de competências e horários, aproveitando texto livre apenas como complemento. A origem autodeclarada e eventual confirmação precisam ser identificáveis para o score.

Os horários exatos prevalecem sobre o nome do turno. O exemplo citado de 08h às 12h é apenas ilustrativo; a classificação em manhã/tarde/noite depende da grade configurada. Validar início anterior ao fim, sobreposições, vigência e intervalos. Alterações posteriores que afetem aulas existentes exigem a política ainda pendente, preservando a versão publicada até sua revisão.

Para a interface, propõe-se um cadastro por etapas dentro do padrão de modal atual: dados pessoais -> formação/conhecimentos -> experiência -> disponibilidade -> revisão. A dashboard orienta a completar seções específicas, com rascunho e retomada. A direção é preservar a aparência da entrada atual; o ponto de acesso à solicitação será incorporado ao fluxo existente. A composição visual final ainda será desenhada.

O detalhamento de campos, histórico, dashboard e uso dos dados está na [proposta de compatibilidade docente](PROPOSTA_COMPATIBILIDADE.md). O indicador de conclusão do perfil não aumenta o score.

## 6. Elegibilidade e score

Uma recomendação recebe oferta, contexto letivo e todos os blocos de horário pretendidos. Se ainda não houver horário, pode mostrar afinidade acadêmica preliminar, identificando que disponibilidade e conflitos não foram avaliados por completo.

Árvore de decisão proposta, com resultado e motivo em cada verificação:

1. Professor e vínculo com o curso estão ativos e autorizados?
2. Atende aos requisitos obrigatórios definidos para a disciplina?
3. A disponibilidade confirmada cobre todos os encontros?
4. Está livre nos intervalos e datas relevantes, considerando os demais cursos?
5. A alocação cabe no limite de carga horária aplicável?

Depois das condições obrigatórias, calcular a pontuação de compatibilidade. Conhecimentos relacionados e experiência podem compor fatores, conforme os dados escolhidos e os pesos definidos. Disponibilidade para um turno é uma condição para assumir aquele horário; ter disponibilidade em outros turnos não aumenta automaticamente a afinidade com a disciplina.

A resposta deve trazer elegibilidade, motivos, fatores avaliados e versão das regras. Apresentar score de 0 a 100 apenas quando houver fórmula definida e dados suficientes; o número representa uma pontuação, sem interpretação como probabilidade de sucesso. Registrar critérios de desempate. Informação ausente precisa de estado próprio e não pode ser tratada silenciosamente como requisito atendido.

A recomendação não reserva o professor. Ao salvar, repetir as verificações com os dados atuais. O coordenador escolhe entre candidatos elegíveis; qualquer possibilidade de exceção depende de regra explícita, motivo e histórico.

Foi elaborada uma [proposta inicial de cálculo](PROPOSTA_COMPATIBILIDADE.md), para revisão: até 60 pontos em conhecimentos desejáveis relacionados, 25 em experiência docente pertinente e 15 em experiência profissional pertinente, com limites e justificativas por fator. Pesos, rubrica e limites estão propostos e não foram validados pela instituição. Ausência temporária não reduz esse score; é considerada na disponibilidade para as datas aplicáveis.

Esses três fatores resumem a classificação. A [árvore detalhada](PROPOSTA_COMPATIBILIDADE.md) contém múltiplos nós por contexto, acesso, formação, conhecimento obrigatório, experiência exigida quando aplicável, disponibilidade, compromissos, turma, carga e dados de classificação. A quantidade de nós acompanha os requisitos da disciplina. O servidor reúne os dados do perfil e das entidades relacionadas e registra cada teste e sua justificativa.

Separar o estado de elegibilidade do estado do score: um professor pode cumprir todos os requisitos obrigatórios e ainda ter pontuação pendente por falta de informação da classificação. Pendência não equivale a nível zero de competência. Contexto de oferta inválido é falha de configuração. A implementação do motor e dos contratos continua pendente nesta etapa documental.

## 7. Horários, intervalos e conflitos

Dias e turnos devem ser configuráveis; o exemplo noturno de Sistemas de Informação não define a grade de todos os cursos. Um encontro pode ocupar vários blocos consecutivos. Separar aulas de intervalos ao calcular carga.

O intervalo sugerido foi de aproximadamente 15 minutos. Não fechar automaticamente três blocos de 50 minutos entre 18h30 e 21h10: a soma com o intervalo excede essa janela. Também não registrar como confirmado o exemplo anterior de intervalo de 10 minutos.

Representar horários com início/fim e vigência, sob um fuso institucional configurado. Considerar sobreposição quando `inicioA < fimB` e `inicioB < fimA`, nos mesmos dias e em datas de vigência sobrepostas; encontros adjacentes podem compartilhar a fronteira sem conflito. Exceções de calendário e deslocamento entre locais dependem de escopo posterior.

Verificar conflitos do professor e da turma, inclusive entre grades que tenham blocos com identificadores diferentes. Calcular carga a partir da duração efetiva dos encontros; definir com a instituição a conversão entre minutos, hora-aula e hora-relógio e os limites semanais.

## 8. Rascunho, publicação e concorrência

Proposta: manter uma versão publicada estável e um rascunho editável por curso/período. O professor vê a escala publicada. Alterações de uma escala publicada geram nova revisão; o professor continua vendo a versão anterior até a republicação consistente.

É necessário decidir se rascunhos reservam professores ou somente avisam sobre disputas. Publicação deve conferir os compromissos existentes, a disponibilidade e os limites, com regras definidas para a substituição da própria versão anterior.

Duas coordenações podem tentar usar o mesmo professor ao mesmo tempo. Consultar disponibilidade e inserir em seguida, separadamente, não basta. A implementação deverá serializar as alterações dos recursos compartilhados, por exemplo mediante escrita em um documento de controle do professor dentro da transação, antes de consultar e persistir os compromissos. Tratar também turma, alterações de disponibilidade e carga, ordem de aquisição dos recursos, tentativas repetidas e falhas. Uma transação isolada que apenas lê horários e insere documentos diferentes não deve ser presumida como solução completa.

Usar versão esperada para impedir que uma edição sobrescreva silenciosamente outra. Em conflito, manter o estado anterior e devolver erro compreensível. O arraste de um cartão terá a mesma validação e confirmação do formulário; a interface precisa conseguir restaurar a posição anterior se o servidor rejeitar.

Essa estratégia é uma proposta de implementação a validar com testes simultâneos. No MongoDB, operações em um documento são atômicas; operações consistentes entre documentos podem exigir transação e implantação compatível. Os requisitos de implantação devem ser combinados com o responsável pelo banco. Fontes: [atomicidade e concorrência](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/), [condições para transações](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/) e [índices únicos](https://www.mongodb.com/docs/v8.0/core/index-unique/).

## 9. Contratos da API a detalhar

| Área | Operações esperadas |
| --- | --- |
| Acesso | Entrar, sair, consultar sessão, emitir/consultar/aceitar convite e recuperar senha. |
| Administração | Cadastrar/editar/inativar cursos e pessoas; administrar vínculos. |
| Acadêmico | Consultar/gerenciar disciplinas, competências, turmas, períodos e ofertas no escopo permitido. |
| Perfil docente e disponibilidade | Professor completa os próprios dados, salva rascunho e informa disponibilidade; consulta pela coordenação e mudanças posteriores seguem a política aprovada. |
| Solicitações | Professor solicita participação e acompanha a análise; coordenador aprova, pede ajustes ou recusa no próprio curso. |
| Ausências | Professor informa afastamento e envia anexo privado; coordenação autorizada analisa e acompanha as aulas afetadas. |
| Recomendações | Avaliar candidatos para oferta e horários; retornar motivos e fatores do score. |
| Alocações | Criar, editar, movimentar, retirar do rascunho e validar conflitos. |
| Publicação | Consultar revisões, publicar e republicar uma escala de forma consistente. |
| Calendário | Consultar encontros por curso, período, dia/semana e turno; professor consulta a própria escala. |
| Histórico próprio | Consultar as últimas 10 ocorrências na dashboard e histórico completo paginado, com situação e filtros; autorizar somente os dados do professor autenticado. |

Formalizar depois em OpenAPI: campos, parâmetros, paginação, filtros, respostas e exemplos. Retornar erros com código estável, mensagem e erros por campo, para aproveitar os modais existentes. Distinguir falta de autenticação, falta de permissão, recurso indisponível, validação e conflito de versão/horário. Definir limites de tamanho, paginação e tentativas de login.

Modais de curso, coordenador e professor devem reaproveitar `Modal`, campos, botões e tokens visuais já presentes. As responsabilidades podem mudar sem alterar a identidade visual. O erro do servidor deve aparecer dentro do formulário mantendo os dados preenchidos.

O histórico recente é uma visualização de ocorrências, incluindo sua situação. Apenas informação confirmada e pertinente participa da experiência acadêmica, com deduplicação e agregação definidas. A janela de 10 itens da dashboard não limita nem multiplica o score. Aula apenas agendada ou com horário passado não deve ser registrada automaticamente como realizada.

Atestado e metadados clínicos não entram no score nem nos detalhes da recomendação. Proteger o armazenamento e o download do documento por autorização própria; o calendário recebe somente a indisponibilidade necessária. Formato, tamanho máximo, armazenamento privado e tratamento de ausência ainda em análise serão definidos na implementação. Enviar o documento não altera ou apaga automaticamente uma escala publicada.

## 10. Contrato com o responsável pelo MongoDB

Combinar antes da integração:

- Ambiente de desenvolvimento/teste e versão suportada; acesso por variável de ambiente, como `MONGODB_URI`, sem credenciais no repositório ou no chat.
- Modelo dos documentos, identificadores, índices, validação e procedimento de evolução dos dados. Índices de unicidade precisam existir também no banco; validar somente no formulário não garante integridade.
- Quem entrega e executa os scripts de criação/evolução de índices e dados iniciais. Proposta: a aplicação entrega os scripts; o responsável pelo banco executa ou coordena sua execução.
- Suporte às transações exigidas pelos fluxos escolhidos, permissões da conta de aplicação e recuperação/backup.
- MongoDB de teste isolado para conferir autenticação, ativação e concorrência. Testes com repositório falso ajudam nas regras, mas não provam a integração real.

É possível desenvolver os módulos e os contratos enquanto o ambiente é configurado. A conclusão do back-end exige validar a persistência e os fluxos no MongoDB real de teste.

## 11. Decisões restantes para fechar o comportamento

1. **Validação do perfil e disponibilidade:** professor informa no cadastro, conforme definido. A coordenação confirma as aptidões antes de usá-las como elegibilidade? O que acontece quando uma alteração de disponibilidade afeta aula publicada?
2. **Escala:** professor consulta somente o publicado? Rascunho reserva horário? Quem publica e qual o fluxo para corrigir uma escala já publicada?
3. **Compatibilidade:** revisar com a coordenação os requisitos reais das disciplinas, a rubrica de competências e a fórmula inicial da proposta. A origem e a confirmação das informações precisam estar definidas antes de usar o resultado como validado.
4. **Carga e grade:** limite institucional, unidade de carga, blocos oficiais e intervalos por contexto. O exemplo informado ainda não fecha os horários de todos os cursos.
5. **Cadastros e visibilidade:** coordenador cadastra professores e disciplinas, conforme definido. Quais campos globais pode alterar, como confirmar vínculo de um professor já existente e quanto de um compromisso externo pode consultar? Disciplinas compartilhadas ou identidades separadas por curso?
6. **Ausências:** tratamento do período enquanto o atestado está em análise, responsáveis pelo acompanhamento e fluxo de substituição/reposição quando necessário.

As três primeiras decisões permitem fechar os principais fluxos. As demais precisam estar definidas antes de implementar e validar as regras correspondentes.

## 12. Critérios para considerar o back-end concluído

- Cada pessoa entra com conta própria; convite, recuperação e logout funcionam com persistência real.
- Professor completa seus próprios dados de atuação e disponibilidade; campos pendentes e autodeclarações têm estado explícito, e um convite para outro curso não duplica seu perfil.
- Solicitação de participação respeita análise por curso; conta pendente não acessa recursos acadêmicos e uma aprovação não libera outros cursos.
- Ausência e anexo ficam restritos aos usuários autorizados; a recomendação considera a indisponibilidade temporária e mantém o score acadêmico.
- Coordenador não acessa nem altera recursos de curso não atribuído, mesmo manipulando requisições.
- Professor consulta a própria escala e não modifica a escala de terceiros.
- Cadastros e vínculos preservam unicidade, referências, histórico e tratamento de inativação.
- Recomendações explicam elegibilidade, pendências e score de forma determinística.
- Conflitos de professor, turma e carga são impedidos conforme as regras aprovadas, incluindo requisições simultâneas de cursos distintos.
- Publicação e republicação não deixam estado parcial; rascunho e versão publicada seguem a política aprovada.
- API documentada, erros aproveitáveis nos modais e procedimentos de configuração entregues ao grupo.
- Testes de regras, autorização, integração com MongoDB e concorrência passam. A integração visual posterior também verifica formulários e movimentação dos cartões.

Nesta atualização foram alterados somente documentos. Nenhum servidor, coleção, endpoint ou nova tela foi implementado.
