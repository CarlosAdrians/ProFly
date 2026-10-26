# Planejamento persistido e recomendacao

Implementacao de REQ-06 a REQ-11 e REQ-14. A politica tecnica desta versao reserva os encontros de rascunhos salvos e da ultima publicacao. A escala publicada permanece estavel ate nova publicacao atomica. Cancelar/editar rascunho nao altera a escala visivel ao professor. Reservas do mesmo intervalo sao deduplicadas na carga; ao mover um rascunho, a carga considera tambem os intervalos publicados retidos. A reserva conservadora pode exigir liberar/publicar uma revisao antes de ocupar outro horario. Esta escolha e proposta de operacao, sujeita a revisao institucional.

MongoDB serializa comandos pela guarda academica, junto das guardas de usuario/curso. E uma escolha conservadora de integridade; escalabilidade e granularidade de bloqueios precisam de medicao antes de uso institucional. Versoes esperadas impedem perda de edicao; publicacao reavalia os dados atuais e grava revisao imutavel, ultima escala e ocorrencias na mesma transacao. Nao existe limite de carga inferido da dedicacao pretendida: administrador informa minutos semanais, fuso e vigencia. Falta de limite/grade/ficha revisada impede elegibilidade completa.

## Arvore e score

POST /api/v1/courses/:courseId/eligibility recebe professor, oferta, encontros e allocationId opcional. Servidor verifica vinculo ativo do professor no curso, perfil/revisao vigentes, formacao, cada conhecimento, experiencia minima, todos os encontros, compromissos globais, ausencia e limite semanal. Resposta inclui estados, motivos, perfil/regras, fatores e identificacao PROPOSAL_CONFIGURABLE. Dados desconhecidos mantem pontuacao null; ausencia declarada e confirmada pode valer zero. Falha conhecida prevalece sobre pendencia. Ficha DRAFT nao e criterio homologado.

Pesos e niveis alvo sao configuraveis por disciplina. Nivel desejavel historicamente omitido usa 3 como proposta explicita do contrato. Historico confirmado considera todos os registros pertinentes, deduplica ocorrencias e exclui intervalos cobertos por experiencias declaradas. Sem equivalencia explicita confirmedMinutesPerTeachingSemester, experiencia historica adicional mantem score pendente. Declaracoes pertinentes sobrepostas exigem consolidacao, sem soma duplicada. Afastamentos nunca reduzem fatores academicos. O resultado nao reserva horario; salvar/publicar reavalia.

## Historico, ausencias e documentos

Somente publicacao cria ocorrencias. Professor consulta agenda publicada e historico proprio por cursor estavel (inicio e ID). Passagem do tempo mostra a confirmar; nao vira realizada. Coordenacao do curso confirma realizacao depois do fim, cancela ou vincula reposicao publicada posterior. Autoria e versoes ficam registradas. A dashboard pode solicitar as ultimas 10; a API permite filtros e paginacao.

Ausencia registra datas e cursos autorizados escolhidos pelo professor. Cada coordenacao decide somente seu curso; pendencia bloqueia nova alocacao como PENDING, aceite em qualquer curso sinaliza indisponibilidade global temporaria e recusas nao penalizam score. Nenhuma exclusao/redistribuicao automatica. Documento opcional privado em colecao MongoDB separada, sem URL publica. JPG/PNG/WebP ate o limite configurado (padrao 5 MB) e 16 megapixels; formato declarado deve corresponder ao conteudo decodificado por sharp. PDF ainda nao e aceito neste fluxo. Original e preservado byte a byte e recebe hash SHA-256; nomes de arquivos nao sao armazenados. Documento so pode ser anexado uma vez antes de analise; correcoes exigem nova comunicacao. Downloads autorizados sao auditados e enviados como attachment/no-store. A politica institucional de retencao, consentimento e operacao deve ser homologada antes de documentos reais.

## Notificacoes

Preferencia no servidor para avisos dentro do sistema. Decisoes de solicitacao, publicacoes e analises de ausencia geram avisos na mesma transacao se a preferencia estiver ligada. Desligar nao apaga avisos anteriores nem desliga verificacao de identidade/recuperacao de senha. Sem permissao de push do navegador e sem envio automatico de avisos academicos por e-mail nesta versao.

## Evidencia

Ver docs/validation/STATUS.md. Suites com MongoDB efemero e SMTP local; nenhum dado sintetico no banco institucional. Contratos e rotas reais aparecem em /openapi.json. A integracao das telas e registrada em etapa propria; existencia dos endpoints nao prova fluxo completo de navegador.

## Revisao de integracao em 25/10/2026

A resposta inclui a arvore com ramos sim/nao/desconhecido por verificacao. Conhecimento REJECTED permanece desconhecido para pontuacao; ABSENT e uma ausencia conhecida explicitamente confirmada pela coordenacao e pode valer zero. Formacao confirmada abaixo do minimo e falha; formacao ainda sem analise fica pendente.

POST `/api/v1/courses/:courseId/recommendations` avalia os candidatos aprovados em uma unica transacao/snapshot. Empates recebem a mesma posicao; somente elegiveis com score calculado entram na classificacao. Mais de 200 candidatos exige refinar o fluxo, com erro explicito, sem truncar classificacao silenciosamente.

Publicar incrementa tambem a versao da alocacao. Revisoes imutaveis preservam avaliacoes e referencias historicas. A reavaliacao considera somente encontros ainda vigentes, identificando evaluatedSlotCount/excludedPastCount: afastamento passado nao bloqueia encontros futuros. Edicoes nao podem remover/alterar encontros ja passados nem introduzir encontro retroativo; aulas anteriores continuam no historico. Reservas de outra semana nao contaminam a carga da semana avaliada. A reposicao exige encontro publicado posterior, do mesmo professor, disciplina, turma e curso.
