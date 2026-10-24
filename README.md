# ProFly

**Plataforma de gestão e alocação docente para os cursos da UNIFACISA.**

O ProFly organiza informações de professores, disciplinas, competências e disponibilidade para apoiar a montagem das escalas acadêmicas. Cada coordenador trabalha nos cursos pelos quais é responsável; o professor acompanha suas aulas em uma visão reunida; o administrador mantém a estrutura institucional e as responsabilidades de acesso.

O projeto nasceu no curso de Direito e está sendo ampliado para atender aos demais cursos da faculdade. Este README apresenta a visão do produto completo. A implementação disponível e o trabalho ainda pendente estão identificados na seção [Estado de desenvolvimento](#estado-de-desenvolvimento).

## O problema que queremos resolver

Distribuir aulas exige combinar o conteúdo de cada disciplina com os conhecimentos do professor, seus horários e sua carga de trabalho. A mesma pessoa pode atuar em vários cursos, o que torna necessário conferir compromissos de forma compartilhada, respeitando os limites de acesso de cada coordenação.

O ProFly busca centralizar essas informações, explicar as possibilidades de alocação e reduzir conferências manuais. O sistema recomenda candidatos e aponta restrições; a decisão final da atribuição permanece com a coordenação.

## Quem utiliza

| Perfil | Responsabilidades |
| --- | --- |
| Administrador | Cadastrar cursos e coordenadores e atribuir as responsabilidades de cada coordenação. |
| Coordenador | Gerenciar professores e disciplinas no contexto de seus cursos, analisar solicitações de entrada, consultar compatibilidade e organizar alocações e horários. |
| Professor | Preencher seu perfil, solicitar participação, informar disponibilidade, consultar a própria escala e o histórico de aulas e comunicar ausências com atestado. |

Uma pessoa pode atuar em mais de um curso sem precisar de perfis docentes duplicados. A aprovação em um curso não concede acesso automático a outro. A autorização deve ser conferida também no servidor em cada operação.

## Fluxo principal

1. O administrador organiza os cursos e seus coordenadores.
2. O professor preenche seus dados e solicita participação nos cursos e disciplinas selecionados. A coordenação também pode iniciar seu cadastro por convite, respeitando o mesmo controle de acesso.
3. O coordenador responsável analisa a solicitação, aprova, pede ajustes ou recusa. Enquanto aguarda, o professor acompanha os próprios dados e solicitações.
4. Ao organizar uma oferta de disciplina para uma turma e um período, a coordenação consulta os professores elegíveis e os motivos da recomendação.
5. A coordenação monta e publica a escala conforme o fluxo definido; o professor consulta seus horários e mantém as informações permitidas do perfil.

Solicitação de participação, aprovação de aptidões e atribuição de aulas são etapas distintas. A aprovação de entrada não cria uma alocação automaticamente.

## Funcionalidades do produto

### Perfil docente detalhado

Cadastro progressivo de identificação, formação, áreas de atuação, conhecimentos específicos, experiência docente, experiência profissional e disponibilidade. O professor pode completar as seções por etapas, com orientação sobre o que falta informar ou analisar.

Os dados necessários à recomendação têm origem e situação explícitas: declarados, pendentes de análise ou confirmados. O cadastro distingue falta de informação de ausência conhecida de experiência. O limite institucional de carga é separado da dedicação pretendida pelo professor.

### Organização acadêmica

Cursos, competências, disciplinas, períodos letivos, turmas e ofertas. Cada disciplina possui uma ficha de conhecimentos obrigatórios, conhecimentos desejáveis e critérios de experiência. Uma oferta representa aquela disciplina para uma turma em determinado período.

### Elegibilidade e compatibilidade

A indicação combina uma árvore de decisões binárias com uma pontuação explicável:

- **Elegibilidade:** confere vínculo aprovado, formação exigida quando aplicável, cada conhecimento obrigatório, disponibilidade, conflitos e carga horária. A quantidade de verificações acompanha os requisitos da disciplina.
- **Classificação:** compara os candidatos elegíveis pelos conhecimentos desejáveis e experiências pertinentes, mostrando como cada fator contribuiu para o resultado.

O resultado é específico para professor, disciplina/oferta, horários e período. Dados obrigatórios desconhecidos deixam a avaliação pendente. Um professor pode atender aos requisitos obrigatórios e ainda ter score pendente por informações de classificação incompletas.

A configuração inicial de 60 pontos para conhecimentos, 25 para experiência docente e 15 para experiência profissional é uma **proposta para revisão com a coordenação**. Pesos, requisitos reais e limites acadêmicos ainda precisam dessa revisão. O score não representa uma probabilidade de sucesso e não atribui aulas automaticamente.

Detalhes, nós de decisão, fórmula e exemplos fictícios estão na [proposta de compatibilidade](docs/PROPOSTA_COMPATIBILIDADE.md).

### Alocações e calendário

Planejamento por curso, turma e período, com seleção de dia e turno. Os cartões de aula representam disciplina, turma e professor e podem ser incluídos, editados e movimentados por arraste, com alternativa por formulário.

Toda alteração precisa conferir novamente os horários reais, os compromissos do professor em outros cursos e sua carga. Disputas simultâneas entre coordenações devem preservar a integridade da escala. A proposta de trabalho inclui rascunho e versão publicada estável; a política de reservas e republicação ainda será detalhada.

### Dashboard e histórico do professor

Uma entrada simples reúne a situação das solicitações, aulas de hoje/semana, perfil acadêmico, disponibilidade e comunicação de ausência.

O histórico recente mostra as **últimas 10 aulas**, reunindo os cursos do professor, com disciplina, turma, data, horário e situação. Há acesso ao histórico completo com filtros e paginação. Uma aula apenas agendada ou com data passada não é considerada realizada automaticamente.

O histórico pertinente confirmado pode compor a experiência usada na recomendação, com deduplicação e critérios próprios. A janela de 10 itens é somente um recorte de navegação.

### Ausências e atestados

O professor informa o período de ausência, pode anexar o atestado em fluxo reservado e acompanha o retorno da coordenação responsável. As aulas afetadas são sinalizadas para tratamento.

O afastamento afeta a disponibilidade nas datas aplicáveis e preserva o score acadêmico e os conhecimentos do professor. O documento não aparece na recomendação. Seu envio não apaga, redistribui ou republica aulas automaticamente.

## Direção visual

Preservar a estética do front-end existente, reaproveitando componentes, modais, campos, botões e tokens de estilo. Os novos fluxos devem ampliar essa base de forma consistente, com uso por teclado e em telas menores.

As referências incluem os [protótipos originais](docs/prototipos/README.md), a [referência do Figma](docs/prototipos/FIGMA.md) e os recursos institucionais já presentes no repositório. Materiais adicionais podem partir das referências oficiais da UNIFACISA registradas na documentação.

## Tecnologias e arquitetura

| Camada | Tecnologia / direção |
| --- | --- |
| Front-end existente | React, TypeScript, Vite, React Router, CSS Modules e variáveis CSS. |
| Back-end implementado | Node.js, TypeScript, Fastify, validação Zod e API REST. |
| Banco definido | MongoDB, com configuração coordenada por outro integrante do grupo. |
| Qualidade do front-end | Vitest, Testing Library, ESLint e Prettier já configurados. |
| Qualidade do back-end | Spec, matriz, checagem de tipos/lint/build e primeiros testes unitários e de integração implementados; cobertura dos módulos ainda em andamento. |

Arquitetura pretendida:

```text
Interface por perfil
        |
        v
API Node.js: identidade, autorização, validação e regras de negócio
        |
        v
MongoDB: cadastros, vínculos, planejamento, histórico e versões

Anexos de atestado: armazenamento privado com acesso autorizado pela API
```

A aplicação deve rejeitar dados incoerentes e operações fora do escopo, manter estados explícitos e retornar erros úteis aos formulários. Validação no navegador complementa as verificações do servidor.

## Documentação do projeto

| Documento | Conteúdo |
| --- | --- |
| [Spec do back-end](docs/specs/BACKEND_V1.md) | Requisitos rastreáveis, contratos, invariantes, limites e critérios de aceitação. |
| [Matriz de cenários](docs/specs/backend-cases.json) | 56 cenários planejados para testes de domínio, contratos, autorização, integração, concorrência e entradas adversariais. |
| [Fluxo de trabalho](docs/WORKFLOW.md) | Ordem de implementação, ciclo de validação e commits por área. |
| [Estado das validações](docs/validation/STATUS.md) | O que foi verificado e o que ainda está pendente ou não implementado. |
| [Definição do back-end](docs/BACKEND.md) | Modelo conceitual, responsabilidades, dados e contratos com o responsável pelo banco. |
| [Compatibilidade docente](docs/PROPOSTA_COMPATIBILIDADE.md) | Cadastro, árvore detalhada, score, dashboard, histórico e exemplos. |
| [Expansão institucional](docs/EXPANSAO_INSTITUCIONAL.md) | Contexto, decisões tomadas e etapas da ampliação. |
| [Front-end demonstrativo](docs/FRONTEND_ATUAL.md) | Funcionamento, rotas e limitações da implementação existente. |
| [Orientações de trabalho](AGENTS.md) | Regras do repositório para preservar a base, validar e salvar entregas em commits. |

## Desenvolvimento por etapas

Usar **spec e ciclo de validação em conjunto**: definir o comportamento, implementar uma parte coerente, testar casos válidos e inválidos, corrigir falhas, conferir regressões pertinentes e salvar a entrega em commit.

A sequência começa pela estrutura do back-end, identidade e permissões, cadastro/aprovação, organização acadêmica, elegibilidade/score, alocações/publicação, ausências/histórico e integração das telas. A ordem detalhada está no [fluxo de trabalho](docs/WORKFLOW.md).

Cada entrega recebe commit com área identificada, por exemplo:

```text
feat(frontend): adiciona formulario de disponibilidade
feat(backend): valida solicitacao por curso
test(backend): cobre reserva simultanea do professor
docs(project): apresenta o projeto institucional completo
```

Alterações de front-end e back-end ficam em commits separados. Testes e documentação relacionados podem acompanhar sua funcionalidade. Um teste planejado, pulado ou indisponível não conta como aprovado.

## Estado de desenvolvimento

Atualizado em **24/10/2026**. Repositório: [CarlosAdrians/ProFly](https://github.com/CarlosAdrians/ProFly). Branch local desta etapa: `feat/backend-institucional`.

| Parte | Estado atual |
| --- | --- |
| Visão institucional, requisitos e matriz | Documentados para orientar a implementação. |
| Front-end de coordenador | Demonstração com login, conta editável e foto, análise por curso, disciplinas, calendário mensal/semanal/diário, bloqueio de datas passadas, alocações locais e Configurações. |
| Administrador e acesso por curso | API de cursos, convites de coordenadores, sessões e revogação implementada; telas administrativas pendentes. |
| Perfil docente e aprovação de entrada | API de rascunho, versões, solicitação e análise independente por curso implementada; cadastro detalhado e análise disponíveis em demonstração local, ainda sem integração com a API. |
| Dashboard de professor | Início com resumo do perfil, solicitações por curso, calendário e edição de disponibilidade. Aulas publicadas e histórico ainda pendentes. |
| Servidor Node.js e MongoDB | Base HTTP, identidade e cadastro/aprovação implementados. Adaptador de e-mail e demais módulos pendentes. Veja [backend/README.md](backend/README.md). |
| Catálogo acadêmico | API de competências, disciplinas, períodos, turmas e ofertas, com referências, versões e grade configurável. Revisão de planejamento publicado ainda pendente. |
| Motor de elegibilidade e score | Especificado; implementação e validação institucional pendentes. |
| Calendário, alocações e publicação | Calendário e rascunhos no navegador, com conflitos e edição; publicação e persistência pela API pendentes. Feriados por BrasilAPI e referência estadual da Paraíba. |
| Histórico de aulas e atestados | Planejados; ainda não implementados. |
| Testes de execução do back-end | Primeiros testes unitários e de integração MongoDB implementados; cobertura completa da matriz ainda pendente. |

A base de implementação foi localizada em `claude/pensive-dirac-5rithn`, no commit `6e78ca6`. Na leitura inicial, a `main` continha apenas referências e protótipos. Esses dados registram a origem da etapa, sem presumir publicação desta branch no remoto.

## Executar a demonstração disponível

Na raiz deste checkout, com Node.js e npm disponíveis, use Node.js 24 como referência de ambiente:

```bash
npm ci
npm run dev
```

Abra o endereço informado pelo Vite. O acesso demonstrativo é `felipe.araujo@profly.test`, senha `profly123`. São credenciais fictícias presentes no código, sem autenticação segura de produção.

A demonstração guarda cadastros, fotos e rascunhos no `localStorage`, com sessão no `sessionStorage`. No login, **Cadastrar** abre o cadastro do próprio professor; não utiliza WhatsApp. As solicitações são analisadas por curso. A interface ainda usa o adaptador demonstrativo: conectar o servidor ao MongoDB não migra os dados do navegador. Termos e aviso de privacidade são minutas para revisão institucional. Detalhes e limitações em [FRONTEND_ATUAL.md](docs/FRONTEND_ATUAL.md).

Comandos existentes do front-end:

```bash
npm run build
npm run lint
npm run typecheck
npm run format:check
npm test
```

Verificação documental disponível, sem instalar dependências adicionais:

```bash
node scripts/check-docs.mjs
```

Esse comando confere estrutura dos documentos, links locais e referências da matriz. Ele não executa o back-end nem valida os comportamentos descritos. A configuração e os comandos do servidor estão em [backend/README.md](backend/README.md).

## Organização do repositório

```text
src/                   Front-end existente: aplicação, componentes e funcionalidades
public/images/         Imagens e recursos visuais
docs/specs/            Spec e matriz de cenários do back-end
docs/validation/       Registro das verificações e limitações
docs/prototipos/       Protótipos e referências originais
docs/                  Contexto, propostas e fluxo de desenvolvimento
scripts/               Verificador documental
AGENTS.md              Regras de trabalho e commits
```

A estrutura do servidor está em [backend](backend/README.md). Modelos, índices, ambiente de desenvolvimento e requisitos de transação devem ser combinados com o integrante responsável pelo MongoDB. Os testes de integração usam um MongoDB temporário real e isolado; a conclusão integrada exige validar todos os fluxos previstos.
