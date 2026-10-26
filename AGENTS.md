# Regras de trabalho do ProFly

Estas regras foram solicitadas pelo usuario para o trabalho neste repositorio. Instrucoes posteriores do usuario prevalecem sobre este arquivo.

## Escopo e preservacao

- Ler o README, a spec da etapa e os arquivos diretamente afetados antes de editar.
- Preservar o front-end existente, a identidade visual e os prototipos originais. Alteracoes de interface devem reaproveitar os componentes e tokens atuais.
- Manter Node.js e MongoDB como tecnologias definidas para o back-end. A configuracao do banco e coordenada com outro integrante do grupo.
- Separar decisoes confirmadas, propostas configuraveis e funcionalidades implementadas. Nao tratar pesos do score ou requisitos academicos ilustrativos como regras institucionais aprovadas.
- A spec de implementacao em docs/specs/BACKEND_V1.md organiza o contrato; documentos de discussao fornecem contexto. Resolver divergencias com a instrucao mais recente do usuario e registrar a mudanca.

## Branch e commits

- Trabalhar na branch da etapa; a etapa institucional foi iniciada em feat/backend-institucional. Nao mudar para main nem criar outra branch por rotina.
- Toda entrega coerente deve ser commitada depois das verificacoes aplicaveis. Nao encerrar uma etapa dizendo que esta salva se houver alteracoes da etapa ainda sem commit.
- Separar mudancas de front-end e back-end em commits distintos. Documentacao e testes diretamente relacionados podem acompanhar a mudanca da sua area.
- Usar mensagens no formato tipo(escopo): descricao. Exemplos: feat(frontend): ..., fix(backend): ..., test(backend): ..., docs(backend): ..., docs(project): ... e chore(workflow): ....
- Evitar commits para cada tecla; um commit deve representar uma alteracao revisavel, com proposito claro.
- Inspecionar os arquivos staged e executar git diff --cached --check antes de cada commit. Adicionar caminhos explicitos; evitar git add . sem revisao.
- Nao incluir credenciais, arquivos .env, anexos pessoais, node_modules, builds, caches, logs ou relatorios temporarios de teste.
- Nao apagar trabalho preexistente, reescrever commits nem usar force-push sem instrucao explicita.
- Commit local nao implica push. Publicar no remoto somente quando solicitado pelo usuario.

## Spec e ciclo de validacao

- Seguir docs/WORKFLOW.md: requisito -> cenario -> implementacao -> verificacao -> correcao -> regressao pertinente -> evidencia -> commit.
- Toda regra relevante do back-end deve apontar para um requisito e seus cenarios na matriz docs/specs/backend-cases.json.
- Validar entradas, saidas, autorizacao por recurso e regras de negocio no servidor. O navegador nao e fonte de confianca para papel, curso autorizado, aprovacao, carga, elegibilidade ou score.
- Diferenciar dado ausente, dado declarado, dado confirmado, requisito nao atendido e score pendente. Nao preencher lacunas com sucesso ficticio nem retornar zero como se fosse uma avaliacao completa.
- Usar dados sinteticos nos testes. Testes unitarios nao devem chamar provedores reais nem banco de producao. Integracao exige banco de teste isolado e configuracao explicita.
- Cobrir acesso entre cursos, dados incompletos/malformados, concorrencia, consistencia do score, historico e anexos privados conforme a matriz.
- Corrigir a causa de uma falha e repetir as verificacoes afetadas. Nao enfraquecer requisitos ou testes apenas para obter resultado verde.
- Um commit incremental pode ter testes de integracao pendentes por dependencia externa, desde que isso esteja registrado. A entrega do back-end so esta concluida quando todos os gates obrigatorios passarem; testes pulados ou indisponiveis nao contam como aprovados.
- Nao prometer ausencia total de bugs. Informar exatamente o que passou, falhou, nao foi executado ou depende de infraestrutura.

## Encerramento de etapa

- Conferir branch, HEAD, arquivos staged/unstaged e estado do trabalho depois do commit.
- Registrar comandos, resultados e limitacoes em docs/validation/STATUS.md, sem segredos e sem copiar dados pessoais.
- Para documentacao, executar node scripts/check-docs.mjs e git diff --check.
- Para codigo, executar os checks apropriados a alteracao. A matriz define os gates de aceitacao do back-end; a existencia de uma spec nao equivale a testes de runtime aprovados.
- Nao iniciar novas etapas nao pedidas apenas para ampliar o escopo.
