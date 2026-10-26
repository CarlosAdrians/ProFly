# Proposta de compatibilidade docente para discussão com a coordenação

Versão de trabalho: 24/10/2026. Este documento reúne o funcionamento definido na conversa e propõe critérios para o cadastro e a indicação de professores. Pesos, limites de pontuação e exemplos são propostas para revisão, sem validação institucional e sem implementação nesta etapa. Todos os nomes e resultados do exemplo são fictícios.

## 1. Objetivo

Ao escolher disciplina, turma e horários, o coordenador recebe uma lista de professores aptos, acompanhada dos motivos de indicação. O sistema considera o perfil aprovado para o curso, os requisitos da disciplina, a disponibilidade e os compromissos existentes. A escolha final permanece com a coordenação.

O resultado pertence à combinação professor + oferta de disciplina + horários + período letivo. Uma pessoa pode ter resultados diferentes para duas matérias. O nome do curso define o contexto; a compatibilidade é calculada a partir dos requisitos e conhecimentos relacionados.

## 2. Direção definida na conversa

- Administrador cadastra cursos e coordenadores e atribui responsabilidades.
- Coordenador gerencia professores, disciplinas e alocações dos cursos sob sua responsabilidade.
- Professor preenche seus dados e solicita participação no curso e nas disciplinas selecionadas. A coordenação responsável analisa e aprova, pede ajustes ou recusa; preencher o formulário não concede acesso acadêmico automaticamente.
- Professor acompanha a própria solicitação e, após aprovação, consulta sua escala e mantém os campos permitidos do perfil.
- Aprovação é vinculada ao contexto autorizado. Se houver solicitações para cursos diferentes, cada coordenação analisa o vínculo correspondente.
- A dashboard do professor deve facilitar a consulta da escala, o preenchimento do perfil, a disponibilidade e a comunicação de ausência com atestado.
- Incluir na dashboard as últimas 10 aulas do próprio professor, reunindo seus cursos, com acesso ao histórico completo. O detalhamento dos estados das aulas está proposto na seção de histórico.
- A árvore deve utilizar os dados estruturados do perfil em múltiplas verificações de elegibilidade; os três grupos de score são apenas um resumo da classificação. A complexidade interna deve corresponder a regras úteis e explicáveis.
- Atestado não reduz o score acadêmico nem remove conhecimentos do perfil. O período de afastamento deve ser tratado na disponibilidade, conforme o fluxo de registro/análise definido.
- Preservar a identidade visual atual e reaproveitar seus componentes e modais.

Solicitação de entrada, aptidão declarada e alocação oficial são conceitos distintos. Aprovar a entrada no curso não atribui automaticamente uma turma ou um horário. O detalhamento da confirmação de cada competência continua proposto abaixo.

## 3. Dados do professor e sua finalidade

| Grupo | Dados propostos | Como entram na indicação |
| --- | --- | --- |
| Identificação | Nome, e-mail e contato. | Identificação e comunicação; não pontuam. |
| Solicitação e vínculo | Curso, disciplinas solicitadas e situação da análise da coordenação. | Autorização para participar do contexto. Não geram pontos por quantidade de cursos. |
| Formação | Curso de formação, área, titulação pertinente e instituição; conclusão quando relevante. | Conferir qualificação obrigatória quando a coordenação a definir para a disciplina. Titulação não dá bônus genérico. |
| Competências | Conhecimentos de um catálogo, nível declarado e descrição/evidência pertinente quando necessária. | Comparar os conhecimentos confirmados aos requisitos e aos conhecimentos desejáveis da disciplina. |
| Experiência docente | Disciplinas já ministradas, contexto, períodos e relação com a matéria pretendida. | Pontuar experiência pertinente, com limite para evitar crescimento ilimitado. |
| Experiência profissional | Área de atuação, atividades relacionadas e intervalos de experiência. | Pontuar prática relacionada quando fizer sentido para a disciplina. |
| Disponibilidade | Dias, faixas de início/fim, validade e exceções. | Conferir todos os encontros pretendidos. |
| Preferências | Disciplinas e horários preferidos, distintos dos horários possíveis. | Informação para decisão humana na primeira proposta; sem peso no score inicial. |
| Carga | Limite institucional validado, dedicação pretendida e aulas já alocadas. | Conferir limite; o sistema calcula a carga alocada, sem exigir redigitação pelo professor. |
| Histórico no ProFly | Aulas efetivamente ministradas, período e confirmação do registro. | Reaproveitar experiência pertinente, sem somar novamente um registro importado equivalente. |

O professor pode informar que ainda não tem experiência. Isso é diferente de deixar um campo sem resposta. Para experiências passadas, permitir lançamento manual identificado como declarado. Uma alocação futura, cancelada ou apenas planejada não equivale a experiência docente concluída.

Proposta de validação: registrar origem, autor, data de atualização e situação de análise dos dados relevantes. A coordenação confirma a relação das competências e experiências com a disciplina. Informação ainda não confirmada aparece como pendência, sem ser apresentada como fato verificado.

Contato, foto e quantidade de campos preenchidos não aumentam compatibilidade. Documentos de saúde e histórico de afastamentos ficam fora dos fatores acadêmicos.

## 4. O que cadastrar para cada disciplina

O coordenador mantém uma ficha objetiva, reutilizável nas ofertas da disciplina:

| Campo | Finalidade |
| --- | --- |
| Nome, código e curso | Identificar a disciplina e o contexto de responsabilidade. |
| Resumo do conteúdo | Explicar o que será ensinado; apoio à escolha de competências. |
| Conhecimentos obrigatórios | Competências e nível mínimo necessários para assumir a matéria. |
| Qualificação obrigatória | Formação ou outra exigência pertinente, somente quando definida pela instituição. |
| Conhecimentos desejáveis | Competências que diferenciam candidatos aptos, com importância e nível esperado. |
| Experiência relevante | Disciplinas e atividades consideradas relacionadas; regra de equivalência registrada. |
| Configuração da pontuação | Fatores, pesos, limites e versão da regra. |

A oferta acrescenta turma, período letivo, encontros e demanda de carga. O nome da disciplina, sozinho, não determina os requisitos: conhecimentos obrigatórios e desejáveis devem estar cadastrados de forma estruturada. Texto livre pode ajudar a descrevê-los, mas não é convertido automaticamente em requisito obrigatório.

Para simplificar o modal, o coordenador seleciona itens de um catálogo de conhecimentos e marca cada um como obrigatório ou desejável. Pode partir de uma ficha já usada e revisá-la, preservando a versão aplicada a cada recomendação.

## 5. Primeira etapa: decisões binárias de elegibilidade

Proposta de ordem das verificações:

1. Conta, vínculo com o curso e situação da solicitação permitem participar?
2. A qualificação obrigatória está atendida, quando houver?
3. Todos os conhecimentos obrigatórios atingem o nível mínimo validado?
4. A disponibilidade cobre todos os encontros nas datas pretendidas?
5. Está livre de conflito de professor e turma, considerando outros cursos e afastamentos aplicáveis?
6. A carga resultante respeita o limite institucional?

Cada condição respondida segue um ramo sim/não, com motivo. Quando faltarem dados para responder, o resultado da avaliação é **pendente de informação/análise**, sem forçar uma resposta binária inventada. Reprovação de requisito conhecido resulta em **não elegível para essa oferta**. A primeira etapa não precisa de aprendizagem de máquina; pode ser uma árvore de regras explícitas.

Uma recomendação sem horários escolhidos tem caráter acadêmico preliminar e não confirma disponibilidade. Ao salvar a alocação, o servidor verifica novamente as condições atuais; a recomendação anterior não reserva o professor.

### 5.1. Árvore detalhada proposta

A árvore é de decisão baseada em regras. Cada nó tem uma pergunta com dois caminhos. Condições opcionais usam primeiro uma pergunta de aplicabilidade; informação desconhecida usa uma pergunta de presença/validação antes do teste do requisito. Assim, não é necessário transformar ausência de informação em resposta negativa sobre a competência da pessoa.

| Bloco | Nós e perguntas propostas | Dados utilizados |
| --- | --- | --- |
| Contexto da oferta | Curso e oferta estão ativos? Turma e disciplina pertencem ao contexto solicitado? O período e os horários são válidos? A ficha de critérios está configurada? | Curso, disciplina, turma, período, encontros e versão das regras. |
| Acesso do professor | A conta está ativa? O vínculo com o curso foi aprovado? O vínculo é válido para o período pretendido? | Conta, solicitação aprovada e vigência do vínculo. |
| Formação | A disciplina exige qualificação específica? Se exige, a informação foi confirmada? A formação atende à exigência registrada? | Requisito institucional aplicável e formação analisada. |
| Conhecimentos obrigatórios | Para cada competência exigida: o dado foi informado? Foi confirmado? O nível atinge o mínimo? | Catálogo, competências do perfil, análise e nível exigido por disciplina. |
| Experiência obrigatória, se houver | Existe exigência institucional explícita? Se existe, há experiência pertinente confirmada e suficiente? | Requisito cadastrado e histórico validado. Sem exigência, esse bloco não exclui iniciantes. |
| Disponibilidade | Há disponibilidade vigente? Todos os dias e intervalos da oferta estão cobertos durante sua vigência? Exceções registradas permitem esses encontros? | Disponibilidade do perfil e encontros reais da oferta. |
| Compromissos do professor | Está livre nesse intervalo em todos os cursos? As datas e os períodos dos compromissos se sobrepõem? Existe indisponibilidade temporária aplicável? | Alocações, publicações, reservas conforme política e períodos de ausência. Não consulta conteúdo do atestado. |
| Situação da turma | Os encontros estão livres de sobreposição para a turma? | Agenda da turma e oferta pretendida. |
| Carga | Há limite institucional validado? A carga atual mais os encontros pretendidos cabe nesse limite nas semanas afetadas? | Limite confiável, encontros dos cursos e duração efetiva. Dedicação pretendida permanece informação distinta. |
| Dados para o score | Os fatores aplicáveis estão configurados? As informações necessárias à pontuação foram informadas e analisadas? | Ficha de critérios e dados acadêmicos confirmados. A falta de fator opcional não transforma alguém apto em inapto. |

O número de nós varia conforme a ficha: uma disciplina com seis conhecimentos obrigatórios tem verificações para cada um deles; outra pode não exigir qualificação ou experiência específica. Os requisitos reais serão definidos pela instituição. A estrutura não autoriza acrescentar exigências sem finalidade para a disciplina.

Exemplo de um ramo de conhecimentos:

```text
Há conhecimento obrigatório a verificar?
  não -> seguir para disponibilidade
  sim -> existe informação confirmada para este conhecimento?
           não -> registrar pendência de análise/informação
           sim -> nível confirmado atende ao mínimo da disciplina?
                    não -> registrar requisito não atendido
                    sim -> verificar o próximo conhecimento obrigatório
```

Para o resultado completo, avaliar também condições independentes quando possível e reunir os motivos. Uma falha obrigatória conhecida torna o candidato inelegível para aquela oferta, mesmo que exista outra pendência. Se não houver falha conhecida, mas faltar condição obrigatória, o resultado fica pendente. Informação contextual inválida é erro/configuração da oferta, sem atribuir uma falha ao professor.

Elegibilidade e cálculo do score terão estados separados:

- **Elegível, score calculado:** pode aparecer na classificação, com justificativa e condições atuais.
- **Elegível, score pendente:** requisitos obrigatórios atendidos; faltam dados da classificação. Mostrar fora do ranking numérico até completar a avaliação.
- **Elegibilidade pendente:** falta dado obrigatório ou confirmação necessária para decidir.
- **Não elegível para esta oferta:** existe requisito obrigatório não atendido ou conflito conhecido, com motivos.
- **Oferta pendente de configuração:** contexto ou regra ainda insuficiente para executar a avaliação.

### 5.2. Ligação entre cadastro e motor de regras

O servidor deverá montar um conjunto de dados a partir do perfil do professor, vínculos aprovados, ficha da disciplina, oferta, disponibilidade e compromissos. Esses valores alimentam cada nó da árvore; o navegador não envia um campo confiável dizendo que a pessoa é elegível.

Cada avaliação deve produzir professor, oferta, versão do perfil, versão das regras, data de avaliação, testes realizados e motivos. Os valores do score ficam associados aos critérios que os originaram. Não armazenar apenas um booleano final, pois a coordenação precisa saber por que alguém foi indicado, bloqueado ou deixado pendente.

Mudar um dado relevante exige nova avaliação para as ofertas afetadas. A análise não modifica automaticamente uma publicação. Uma recomendação ainda precisa ser revalidada no momento da alocação para tratar mudanças e concorrência.

## 6. Segunda etapa: proposta inicial de score

Entre os candidatos elegíveis e com informações suficientes para o cálculo, propõe-se:

| Fator | Peso inicial proposto |
| --- | --- |
| Conhecimentos desejáveis pertinentes | 60 pontos |
| Experiência docente pertinente | 25 pontos |
| Experiência profissional pertinente | 15 pontos |
| Total | 100 pontos |

Esses pesos priorizam aderência ao conteúdo e oferecem uma configuração concreta para avaliação do coordenador. Não são regras recebidas da faculdade nem resultados de um estudo de validação.

Os três nomes são grupos de exibição. Dentro de conhecimentos, são comparados os itens e níveis da ficha. Dentro de docência, são conferidos relação com a disciplina, situação da experiência, períodos e duplicidades. Dentro de prática profissional, são conferidos atividades relacionadas, validação, duração e sobreposição de intervalos. Esses subcritérios alimentam a fórmula; não geram pontos extras duplicados fora dela.

### Conhecimentos: até 60 pontos

Para cada conhecimento desejável, definir importância positiva `w` e nível esperado `t`. Para o professor, usar nível confirmado `n`. O atendimento do item é `min(n / t, 1)`. A média ponderada desses atendimentos produz `C`, entre 0 e 1.

```text
C = soma(w * min(n / t, 1)) / soma(w)
```

Níveis precisam de uma rubrica comum. Proposta para revisão: 1 = explica fundamentos; 2 = aplica em situações usuais; 3 = resolve situações avançadas e justifica escolhas. O professor declara e a análise registra o que foi confirmado. Ausência confirmada de conhecimento corresponde a 0; informação ainda não fornecida ou analisada permanece desconhecida.

Conhecimentos fora da ficha da disciplina não acrescentam pontos. Um mesmo conhecimento não pode ser duplicado com nomes diferentes para inflar o resultado. O teto por item evita pontuação ilimitada por autodeclaração de nível.

### Experiência docente: até 25 pontos

Proposta de partida: pontuação máxima com quatro períodos semestrais de experiência pertinente confirmada. Usar `D = min(semestres pertinentes / 4, 1)`. A definição de equivalência para ofertas curtas deve ser registrada antes do cálculo.

Não somar duas vezes o mesmo período por aparecer no currículo e no histórico do ProFly. Para esta proposta, lecionar a mesma matéria para várias turmas no mesmo semestre não multiplica a quantidade de semestres de experiência.

### Experiência profissional: até 15 pontos

Proposta de partida: pontuação máxima com 24 meses de prática pertinente confirmada. Usar `P = min(meses pertinentes / 24, 1)`. Unir intervalos profissionais sobrepostos ao contar tempo, para não contar o mesmo mês várias vezes.

### Resultado

```text
score = 60 * C + 25 * D + 15 * P
```

Exibir uma casa decimal e manter a precisão interna para ordenação. O score é um índice de indicação para aquela disciplina; 85 pontos não significam 85% de probabilidade de sucesso.

Se um fator não fizer sentido para a disciplina, o coordenador define uma configuração alternativa comum a todos os candidatos, com pesos totalizando 100 e nova versão da regra. Não redistribuir pesos individualmente por professor para esconder dados ausentes. Uma disciplina sem ficha de critérios configurada deve aparecer como pendente de configuração.

Proposta de desempate: manter candidatos empatados na mesma posição e explicar o empate. A coordenação escolhe, considerando as justificativas e o planejamento. A ordem visual secundária pode ser alfabética, sem alterar o score.

## 7. Exemplo fictício para apresentar ao coordenador

Oferta: Banco de Dados I, turma de Sistemas de Informação. Todos os candidatos classificados precisam passar pelas verificações de vínculo, requisitos, horários e carga.

Para demonstrar o fator de conhecimentos desejáveis, considere três itens hipotéticos: modelagem com importância 50%, SQL aplicado com 25% e transações com 25%, todos com nível esperado 2. Ana tem níveis confirmados 2/2/2, resultando em `C = 1`. Bruno tem 2/1/1, resultando em `C = 0,75`. Essa ficha é ilustrativa, não uma exigência oficial do curso.

| Candidato fictício | Conhecimentos | Docência pertinente | Prática pertinente | Resultado |
| --- | --- | --- | --- | --- |
| Ana | `C = 1`: 60 pontos | 2 semestres: 12,5 pontos | 12 meses: 7,5 pontos | **80,0 pontos**, elegível. |
| Bruno | `C = 0,75`: 45 pontos | 4 semestres: 25 pontos | 24 meses: 15 pontos | **85,0 pontos**, elegível. |
| Carla | Não calculado para classificação | Não calculado | Não calculado | Indisponível: conflito com outra aula. |
| Daniel | Informação ainda não analisada | A conferir | A conferir | Pendente: conhecimento obrigatório sem confirmação. |

Retorno esperado para a coordenação: "Bruno: 85,0 pontos; requisitos obrigatórios atendidos; disponível nos encontros; carga dentro do limite; 45 pontos em conhecimentos desejáveis, 25 em docência e 15 em prática pertinente".

O coordenador pode escolher Ana, também elegível, registrando a escolha. O score ajuda a comparar e não atribui a aula automaticamente.

## 8. Dashboard do professor e cadastro progressivo

Proposta de tela inicial, preservando o estilo atual:

- **Minha solicitação:** situação da análise por curso e pedidos de ajuste. Antes da aprovação, o acesso é limitado aos próprios dados e solicitações.
- **Minha escala:** aulas publicadas de hoje/semana, reunindo os cursos autorizados.
- **Últimas 10 aulas:** ocorrências anteriores do próprio professor, de todos os seus cursos, com disciplina, turma, curso, data, horário e situação; ação "Ver histórico completo".
- **Meu perfil:** resumo de formação, conhecimentos e experiência, com ações para editar cada seção.
- **Minha disponibilidade:** horários vigentes e data de última conferência.
- **Informar ausência:** datas, observação opcional, envio privado de atestado e acompanhamento do retorno.

O preenchimento pode ocorrer por etapas em modais. Mostrar orientações específicas, como "Informe seus horários" ou "Confirme sua experiência", e permitir salvar rascunho. O indicador de conclusão do cadastro não é um fator do score. Informações opcionais só se tornam necessárias se fizerem parte de um critério aplicável.

O professor não precisa editar a escala para manter seus dados atualizados. Alterações relevantes disparam nova avaliação e sinalizam ofertas afetadas; não reescrevem automaticamente uma escala publicada.

## 9. Histórico e ausência temporária

Manter o histórico útil ao planejamento: disciplinas efetivamente ministradas, períodos, alterações das alocações e versão das regras usada em cada indicação. Um registro de recomendação deve preservar os fatores utilizados, a data e os motivos, sem copiar documentos de saúde.

### Histórico exibido na dashboard

Proposta: mostrar as 10 ocorrências mais recentes com data passada, ordenadas por início em ordem decrescente, reunindo todos os cursos do professor autenticado. Cada linha mostra disciplina, curso, turma, data, intervalo e situação. Permitir filtros por curso, disciplina e período e acesso paginado ao histórico completo. A escala atual/futura continua em uma área própria.

Situações propostas: prevista, a confirmar, realizada, cancelada ou remarcada, com vínculo entre ocorrência original e reposição quando aplicável. A passagem do horário de uma aula prevista não comprova que ela foi realizada: deve permanecer a confirmar até o procedimento definido. O responsável por essa confirmação ainda precisa ser combinado.

A visão "Últimas 10" é um recorte de navegação. O cálculo de experiência usa todo o histórico pertinente confirmado, incluindo registros anteriores analisados, com os limites e a deduplicação definidos na fórmula. Não usar somente 10 aulas, nem somar pontos indefinidamente por ocorrência. Cancelamentos e afastamentos não são utilizados como fatores de penalidade acadêmica.

### Experiência aproveitada pelo sistema

Uma ocorrência realizada pode compor o histórico de atuação na disciplina correspondente. Para chegar à experiência agregada do score, agrupar registros por contexto e período, conferir relação com a disciplina pretendida e evitar duplicação com experiência declarada. Esse processamento não converte automaticamente uma aula isolada em um semestre inteiro de experiência: períodos parciais precisam da regra de equivalência ainda pendente.

### Ausência temporária

O atestado fica em um fluxo separado, com documento privado e acesso restrito. O calendário e a recomendação precisam apenas do período de indisponibilidade aplicável. O tratamento de um afastamento ainda em análise deve ser definido: pode sinalizar necessidade de análise sem inventar aprovação ou permitir uma nova alocação silenciosa.

Afastamento não retira pontos, experiência nem competências. Ao terminar a indisponibilidade, o perfil acadêmico continua válido, sujeito às demais condições atuais. A coordenação trata substituição ou reposição; o envio do documento não apaga aulas nem altera a escala automaticamente.

## 10. Dados e contratos a preparar no back-end

Além das entidades já descritas em [BACKEND.md](BACKEND.md), prever:

- Solicitações de participação por curso, disciplinas solicitadas, situação, análise, motivo e autoria.
- Formação, competências e experiências com origem e situação de análise; perfil com versão para evitar sobrescritas simultâneas.
- Ficha de critérios por disciplina, pesos, limites e versão da regra.
- Cálculo de elegibilidade com motivos e score com fatores rastreáveis.
- Árvore parametrizada pela ficha da disciplina, com nós rastreáveis e estados independentes para elegibilidade e score pendente.
- Histórico de aulas efetivas, sem confundir alocação futura com experiência concluída.
- Ocorrências de aula com situação e histórico paginado próprio; recorte padrão de 10 para a dashboard, sem limitar a base usada no cálculo de experiência.
- Ausências com vigência e situação de análise; metadados do anexo e armazenamento privado a combinar com o grupo.
- Resumo da dashboard com pendências, solicitações, horários e aulas próprias, sem expor dados de outros professores.

O servidor determina acesso a partir da identidade e dos vínculos aprovados. Nenhum formulário pode conceder papel de administrador/coordenador ou acesso a outro curso por autoseleção.

## 11. Como revisar a proposta com a coordenação

Apresentar a ficha de uma disciplina real e testar perfis autorizados para esse exercício, conferindo conhecimentos, experiência e horários. Verificar se o ranking e os motivos fazem sentido para o coordenador. Começar com os pesos propostos e registrar as alterações e justificativas; não apresentar a fórmula como validada antes dessa revisão.

Testar também os casos de professor iniciante com bom conhecimento, professor experiente com conflito, informação pendente, empate, afastamento temporário e atuação em vários cursos. Requisitos obrigatórios continuam sendo condições explícitas e não podem ser compensados por pontuação alta em outro fator.

Permanecem para definição institucional: requisitos reais das disciplinas, rubrica e responsáveis pela confirmação de conhecimentos e aulas realizadas, equivalência de experiência em períodos parciais, limites de carga/horários, tratamento de ausência em análise e regras de publicação e atualização da escala. As demais escolhas técnicas podem ser detalhadas na implementação em Node.js e MongoDB.
