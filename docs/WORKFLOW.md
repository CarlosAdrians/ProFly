# Fluxo de desenvolvimento e validacao

Definido em 24/10/2026 para organizar o desenvolvimento do ProFly com commits por area.

## Spec e loop de validacao

Usar os dois em conjunto. A spec define o comportamento esperado e os limites do sistema. O loop e o ciclo de implementar, executar testes, analisar falhas e corrigir, ate atingir os criterios da etapa ou identificar uma dependencia externa concreta.

O ciclo nao e uma automacao infinita nem uma promessa de que todo defeito sera encontrado. A cobertura sera ampliada a partir dos requisitos, das fronteiras de entrada e das falhas encontradas, mantendo rastreabilidade.

## Ordem de trabalho

| Etapa | Entrega | Validacao principal |
| --- | --- | --- |
| 0 | Visao completa do projeto, spec, matriz e convencoes de commits. | Coerencia documental e links locais; nenhum teste de back-end pressuposto. |
| 1 | Estrutura Node.js, configuracao, validacao de contratos e tratamento de erros. | Tipos, lint, build e contratos de entrada/saida. |
| 2 | Identidade, sessoes, administrador, coordenadores e autorizacao por curso. | Autenticacao, revogacao, acesso horizontal/vertical e fluxos negativos. |
| 3 | Perfil detalhado, solicitacao por curso e analise da coordenacao. | Rascunho, submissao, aprovacao independente, dados confirmados e rejeicao de campos protegidos. |
| 4 | Cursos, disciplinas, competencias, periodos, turmas e ofertas. | Referencias, unicidade, vigencia e requisitos por disciplina. |
| 5 | Disponibilidade, carga e motor de elegibilidade. | Limites temporais, dados pendentes, conflitos entre cursos e rastreabilidade dos nos. |
| 6 | Score configuravel e explicavel. | Formula deterministica, fatores, limites, empates, ausencia de dados e versao das regras. |
| 7 | Alocacoes, revisoes e publicacao. | Integridade no MongoDB e tentativas simultaneas de reservar professor/turma/carga. |
| 8 | Ausencias, atestados e acesso a anexos privados. | Acesso ao proprio caso, escopo da coordenacao, arquivo invalido e preservacao do score academico. |
| 9 | Ocorrencias de aula, ultimas 10 e historico completo. | Situacoes, ordenacao, paginacao, confirmacao e deduplicacao de experiencia. |
| 10 | Integracao das telas por perfil, mantendo a estetica atual. | Navegador -> API -> MongoDB -> resposta; erros em modais e movimentacao de aulas. |

Integracao com MongoDB e testada assim que houver repositorios persistentes, inclusive nas etapas anteriores a 7. Nao adiar toda verificacao de banco para o fim. O responsavel pelo banco configura o ambiente; os contratos, indices e requisitos de transacao precisam ser combinados desde o inicio.

## Ciclo de cada entrega

1. Selecionar requisitos e cenarios da [spec](specs/BACKEND_V1.md) e da [matriz](specs/backend-cases.json).
2. Definir entradas, saidas, estados, campos protegidos e invariantes.
3. Implementar uma parte coerente, preservando o comportamento existente.
4. Executar os testes aplicaveis: unitarios, contratos, autorizacao, integracao, concorrencia e adversariais, conforme o alcance da alteracao.
5. Investigar cada falha, guardar o cenario que a reproduz e corrigir sua causa.
6. Repetir os checks afetados e a regressao necessaria. Uma falha nova justifica ampliar a verificacao; repetir suites verdes sem mudancas ou nova suspeita nao substitui progresso.
7. Registrar evidencia e limites, revisar o diff e fazer o commit da area.

Se faltar infraestrutura, registrar NOT_RUN com a dependencia especifica. Isso permite salvar progresso validado localmente, mas nao torna a funcionalidade integrada nem a etapa de aceitacao concluida.

## Mensagens e separacao de commits

```text
feat(frontend): adiciona formulario de disponibilidade
fix(frontend): preserva dados do modal ao receber erro
feat(backend): valida solicitacao de participacao por curso
test(backend): cobre reserva simultanea do professor
docs(backend): detalha contrato de elegibilidade
docs(project): apresenta o projeto institucional completo
chore(workflow): registra regras de commits e validacao
```

Mudancas de areas distintas recebem commits distintos. Os testes e a documentacao de uma funcionalidade podem acompanhar o commit dela. Uma correcao apos falha tambem precisa ficar salva em commit quando a verificacao pertinente estiver concluida.

## Estados de evidencia

| Estado | Significado |
| --- | --- |
| PASS | A verificacao foi realmente executada e passou. |
| FAIL | A verificacao foi executada e encontrou falha. |
| NOT_RUN | Ainda nao executada ou impedida por dependencia identificada. |
| NOT_IMPLEMENTED | A funcionalidade ou o teste ainda nao existe. |

O arquivo [STATUS.md](validation/STATUS.md) registra a etapa atual. Cenarios existentes apenas na matriz estao planejados, sem evidencia de runtime. Um teste simulado nao prova persistencia, autorizacao HTTP ou concorrencia real no MongoDB.

## Comandos disponiveis agora

```bash
node scripts/check-docs.mjs
git diff --check
git status --short --branch
```

O primeiro comando verifica documentos locais, blocos de codigo e a integridade estrutural da matriz. Nao consulta URLs externas, nao testa a aplicacao, nao avalia semanticamente os requisitos e nao valida o conteudo do banco.

Os comandos das suites de back-end serao adicionados com sua implementacao, sem substituir os scripts atuais do front-end. Nenhuma rotina de integracao pode apontar por padrao para um banco de producao.
