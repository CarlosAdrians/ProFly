# Expansão institucional do ProFly

Documento de trabalho iniciado em 23/10/2026 e atualizado em 24/10/2026. As decisões confirmadas estão identificadas; as demais seções apresentam propostas para discussão. A implementação continua sendo a demonstração descrita no [front-end atual](FRONTEND_ATUAL.md).

Para executar a próxima etapa, seguir a [spec do back-end](specs/BACKEND_V1.md) e a [ordem de trabalho atualizada](WORKFLOW.md), que priorizam o back-end e a validação antes da integração das novas telas. As etapas abaixo preservam o contexto da discussão inicial.

## Decisões confirmadas em 24/10/2026

- Back-end em Node.js e banco MongoDB; outro integrante do grupo cuidará da configuração do banco.
- Administrador responsável pelos cadastros de cursos e coordenadores e pelos vínculos de responsabilidade. A divisão foi refinada na conversa: o coordenador cadastra professores e disciplinas em seus cursos; o professor complementa o próprio cadastro.
- Coordenador responsável somente pelos cursos que lhe forem atribuídos.
- Professor com acesso à própria escala, considerando sua atuação em mais de um curso.
- Professor informa conhecimentos, atuação e disponibilidade no próprio cadastro. A validação das aptidões declaradas e a política de alterações posteriores permanecem pendentes.
- Entrada do professor com solicitação por curso/disciplinas e análise pela coordenação responsável. O preenchimento do cadastro não libera acesso acadêmico automaticamente; antes da aprovação, consulta e edição ficam limitadas à própria solicitação.
- Dashboard do professor simples, com escala, preenchimento do perfil, disponibilidade e comunicação de ausência com atestado. Atestados preservam o score acadêmico; a indisponibilidade temporária é tratada nas datas pertinentes.
- Histórico das últimas 10 aulas do próprio professor, reunindo todos os seus cursos e permitindo consultar o histórico completo.
- A recomendação deve usar múltiplas decisões binárias ligadas aos dados do perfil e aos requisitos de cada disciplina. Os três grupos de score são um resumo de apresentação; os nós e os fatores internos estão detalhados na proposta.
- Recomendação baseada em verificações binárias de elegibilidade e score de compatibilidade; decisão final com a coordenação. Critérios e pesos ainda pendentes.
- Telas de alocações e calendário; calendário por dia e turno, com cartões de aula e movimentação por arraste, além de inclusão e edição por clique.
- Preservar a estética atual e usar modais para os cadastros.
- Intervalo de aproximadamente 15 minutos sugerido; a grade exata de horários continua pendente e precisa ser configurável.
- Prioridade atual: concluir o desenho do back-end e estruturar o front-end. Ver [definição do back-end](BACKEND.md).

Foi preparada uma [proposta de compatibilidade docente](PROPOSTA_COMPATIBILIDADE.md) para revisão com o coordenador: dados de formação, conhecimentos e experiência; requisitos obrigatórios e desejáveis por disciplina; verificações binárias; fórmula inicial com pesos e exemplo fictício. Essa fórmula é proposta, sem aprovação institucional ou implementação.

## 1. Direção informada

O ProFly foi concebido para apoiar uma coordenação do curso de Direito. A nova direção é atender à faculdade toda e revisar o front-end para esse contexto.

O objetivo é apoiar a alocação docente nos diversos cursos da faculdade, com acesso para administrador, coordenadores e professores. Acesso para alunos não foi incluído no escopo definido nesta conversa.

## 2. Proposta inicial para discussão

> O ProFly centraliza informações de professores, competências, disciplinas e disponibilidade para apoiar a distribuição de atividades docentes entre os cursos da UNIFACISA, com visão por coordenação e acompanhamento institucional.

A proposta preserva a decisão final de alocação com a coordenação, conforme o levantamento original. Uma eventual mudança nessa responsabilidade precisa ser explicitada.

O levantamento acadêmico disponível teve um único respondente do curso de Direito. Suas regras são um ponto de partida; a ampliação exige ouvir outras coordenações e professores, especialmente sobre carga horária, disciplinas compartilhadas e horários.

## 3. Perfis definidos e responsabilidades

| Perfil | Responsabilidade definida | Situação atual no código |
| --- | --- | --- |
| Administrador | Cadastrar cursos e coordenadores e definir os vínculos de responsabilidade. | Não existe no código. |
| Coordenação de curso | Cadastrar professores e disciplinas, gerenciar o contexto de seus cursos e decidir alocações. | Existe um coordenador demonstrativo, sem vínculo com cursos. |
| Professor | Solicitar entrada para análise, completar seu perfil, informar disponibilidade, consultar a própria escala e comunicar ausência com atestado. | Existe o tipo `teacher` e o fluxo parcial de convite; aprovação, dashboard e ausência ainda indisponíveis. |

Uma pessoa pode precisar de mais de um papel ou de acesso a mais de um curso. O desenho de permissões deve contemplar essa possibilidade se ela for confirmada.

## 4. Impactos na base atual

| Ponto | Evidência no código | Impacto da expansão |
| --- | --- | --- |
| Contexto acadêmico | `Teacher` e `Subject` não possuem vínculo com curso. | Definir cursos, vínculos e o contexto de consulta e edição. |
| Permissões | A sessão tem `coordinator` e `teacher`; as rotas internas aceitam apenas `coordinator`. | Definir responsabilidades e autorização por curso no servidor e na interface. |
| Professores compartilhados | Uma coleção local de professores, sem vínculos institucionais. | Evitar cadastros duplicados e considerar a mesma pessoa em vários cursos. |
| Disciplinas | Prefixo fixo `DIR` e verificação de nomes duplicados sobre a coleção inteira. | Definir identidade e unicidade das disciplinas; preservar códigos e registros existentes. |
| Carga horária | Campo `weeklyHours`, sem cálculo de alocações; validação de 1 a 168 horas. | Definir carga contratada, disponível e alocada, unidade de medida e limites institucionais. |
| Disponibilidade | Não há cadastro nem modelo implementado. | Relacionar dias e turnos do levantamento a horários concretos e períodos letivos. |
| Cadastro e convite | Contato fixo de WhatsApp e convites no navegador. | Definir quem cadastra, quem aprova e como encaminhar solicitações ao curso responsável. |
| Persistência | Serviços locais e `localStorage`. | Criar uma fonte compartilhada com integridade, controle de acesso e tratamento de concorrência. |
| Identidade visual | Marca de Direito no menu e referências específicas do curso. | Definir identidade institucional e como o curso ativo será apresentado. |
| Recomendações | Previstas no resumo, sem implementação. | Definir critérios verificáveis e explicar por que cada professor pode ou não ser alocado. |

Arquivos de referência: `src/features/teachers/types.ts`, `src/features/subjects/types.ts`, `src/features/subjects/codeGenerator.ts`, `src/features/subjects/validation.ts`, `src/features/teachers/validation.ts`, `src/features/auth/session/types.ts`, `src/features/auth/components/RequireAuth.tsx`, `src/features/auth/registrationRequest.ts`, `src/services/localCollection.ts` e `src/components/navigation/Sidebar/Sidebar.tsx`.

## 5. Decisões ainda pendentes

As perguntas sobre público, tecnologia, responsáveis pelo cadastro, aprovação de entrada e autoria inicial da disponibilidade foram respondidas. As pendências atuais estão detalhadas na [definição do back-end](BACKEND.md) e na [proposta de compatibilidade](PROPOSTA_COMPATIBILIDADE.md): requisitos reais das disciplinas, validação e pesos dos critérios propostos, alterações posteriores da disponibilidade, carga horária, publicação e reservas de horários, visibilidade entre cursos, grade de horários e tratamento de ausência ainda em análise.

## Referências institucionais consultadas

O usuário autorizou buscar elementos da instituição na internet, preservando a estética atual. Foram consultados em 24/10/2026 o [site oficial da UNIFACISA](https://unifacisa.edu.br/) e a [página oficial de cursos](https://unifacisa.edu.br/cursos/). Servem como referências institucionais e de nomenclatura; a consulta não equivale a um manual de identidade visual nem define automaticamente os cursos participantes da primeira versão.

Prioridade visual: reaproveitar logos e imagens presentes no repositório, os tokens de `src/styles/tokens.css` e os componentes atuais. Elementos adicionais devem ser escolhidos conforme a necessidade das telas. Nesta atualização não houve download de imagens nem mudança de layout.

## 6. Etapas propostas

### Etapa 1: fechar proposta e perfis

- Definir o público da primeira entrega institucional.
- Escrever uma matriz simples de quem pode consultar, cadastrar, editar e alocar em cada curso.
- Registrar exemplos de coordenador com um curso, coordenador com vários cursos e professor compartilhado, quando aplicáveis.

**Resultado esperado:** descrição curta do produto, perfis e limites da primeira versão definidos.

### Etapa 2: definir contexto e navegação

- Definir como o usuário identifica e troca o curso e o período de trabalho, se aplicável.
- Mapear entrada, menu e tarefas principais por perfil.
- Definir comportamento quando o usuário não tem vínculo com nenhum curso ou não possui permissão.
- Escolher a direção visual institucional preservando os materiais originais como referência.

**Resultado esperado:** mapa de telas e fluxos que permita revisar o front-end com contexto claro.

### Etapa 3: evoluir o front-end

- Reaproveitar componentes, formulários e regras ainda válidas.
- Ajustar marca, navegação e informação de contexto.
- Adaptar professores e disciplinas aos vínculos definidos.
- Exibir estados de carregamento, vazio, erro e falta de permissão, com uso por teclado e em telas menores.
- Manter explícito o que continuar demonstrativo até a integração real.

**Resultado esperado:** fluxos dos perfis definidos demonstráveis, com contexto de curso visível e sem perda dos cadastros atuais.

### Etapa 4: integrar identidade e dados compartilhados

- Definir contratos de API, autenticação e autorização por contexto.
- Implementar cursos, vínculos e persistência compartilhada.
- Concluir ativação por convite e recuperação de senha no servidor.
- Definir migração dos cadastros existentes e tratamento de atualizações simultâneas.

**Resultado esperado:** usuários em navegadores diferentes consultam os mesmos dados e só executam ações permitidas, com conferência também no servidor.

### Etapa 5: disponibilidade, recomendações e alocações

- Modelar competências e necessidades das disciplinas.
- Registrar disponibilidade em horários e períodos definidos.
- Conferir conflitos de horário e carga horária entre cursos.
- Apresentar candidatos e restrições de forma compreensível.
- Registrar a decisão de alocação e seu histórico.
- Criar dashboard e calendário a partir dos dados e tarefas definidos.

**Resultado esperado:** demonstrar uma alocação válida e a rejeição de uma alocação conflitante entre dois cursos, mantendo a decisão com o responsável definido.

## 7. Como acompanhar a evolução

| Marco | Estado |
| --- | --- |
| Baixar o repositório e identificar a branch com implementação | Concluído nesta leitura. |
| Ler rotas, serviços, modelos, validações e referências do projeto | Concluído para o diagnóstico inicial. |
| Organizar README e documentação de expansão | Concluído nesta entrega. |
| Definir proposta, perfis e contexto institucional | Perfis e responsabilidade por curso definidos; regras operacionais pendentes. |
| Definir tecnologia do back-end e banco | Node.js e MongoDB confirmados. |
| Redesenhar e implementar o front-end | Pendente. |
| Integrar back-end e validar fluxos completos | Pendente. |
| Implementar disponibilidade e alocação institucional | Pendente. |

A leitura inicial foi estática, com extração do conteúdo dos PDFs e inspeção visual de referências. Não houve execução do aplicativo, build ou testes automatizados. Os protótipos e o código funcional foram preservados; as alterações desta etapa são de documentação.
