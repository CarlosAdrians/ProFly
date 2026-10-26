# Aceitacao do backend local — 26/10/2026

Escopo: implementacao REST Node.js/MongoDB para demonstracao academica com dados sinteticos. Rastreabilidade da [matriz planejada](../specs/backend-cases.json) para testes realmente executados; a matriz continua PLANNED por contrato, e nao substitui esta evidencia. Um teste pode cobrir varios cenarios, e um cenario pode ter regressao adicional em outra suite. PASS limita-se as entradas e invariantes exercitadas, sem promessa de ausencia de bugs.

## Reproducao e gates

No diretorio backend, com dependencias instaladas pelo lockfile:

```powershell
node scripts/verify.mjs
```

O comando valida tipos, lint de src/test/scripts, build, todos os arquivos test/*.test.ts com SMTP local e MongoDB efemero, e documentos. Nao le .env, nao cria usuarios institucionais, nao envia e-mail externo e nao inicia o servidor de producao. Para integracao, define explicitamente NODE_ENV=test e PROFLY_RUN_INTEGRATION=1. Interrompe em falha; testes pulados/todo, resumo ausente ou alteracao de codigo durante a execucao impedem PASS.

Evidencia automatica em backend/.data/validation/last-run.json (ignorada pelo Git), com estado, datas, resumo dos testes, gates e digest SHA-256 de src/test/scripts/package.json/lockfile. Logs e bytes privados nao entram no artefato. Este arquivo de rastreabilidade registra a revisao humana; apenas executar check-docs nao executa o backend.

## Resultado consolidado

- Comando de aceitacao: PASS em tipos, lint completo, build, runtime e documentos.
- Backend: **74 testes aprovados, zero falhas, zero pulos, zero todo** na execucao final consolidada.
- Codigo permaneceu inalterado durante a verificacao; digest SHA-256: 91c6429a09fbda68df54f594e17ffc6ba56043755017592ee5fbfc55e4f72824.
- Interface conectada: 18 testes aprovados; suite geral frontend: 220 testes/36 arquivos aprovados; tipos, lint direcionado e build aprovados.
- API da previa atualizada na porta 3337, frontend 5175; cinco aulas da semana preservadas e cinco registros historicos ficticios acrescentados por rotina explicita/idempotente, sem leitura de .env. Professor consulta agenda/documentos, administrador sem coordenacao recebe 403 na analise, coordenador responsavel consulta solicitacoes. Tres sessoes temporarias encerradas; sessao do navegador preservada.
- Checagem documental posterior ao relatorio: 22 documentos e 162 links locais; 15 requisitos/68 cenarios. O artefato de execucao e local e ignorado pelo Git.

## Cenarios e testes

| Cenario | Requisitos | Teste executado (titulo) | Resultado local |
| --- | --- | --- | --- |
| CASE-001 | REQ-01 | [CASE-001/003: autenticacao e campos protegidos passam pelo HTTP real](../../backend/test/integration.test.ts) | PASS |
| CASE-002 | REQ-01, REQ-02 | [CASE-002: revogar vinculo e desativar conta invalidam operacoes seguintes](../../backend/test/integration.test.ts) | PASS |
| CASE-003 | REQ-01, REQ-12 | [CASE-001/003: autenticacao e campos protegidos passam pelo HTTP real](../../backend/test/integration.test.ts) | PASS |
| CASE-004 | REQ-01, REQ-13 | [CASE-004/001: validade exata de uma hora e consumo concorrente](../../backend/test/integration.test.ts) | PASS |
| CASE-005 | REQ-02 | [CASE-005/006/008: coordenador acessa apenas o curso atribuido e nao cria administracao](../../backend/test/integration.test.ts) | PASS |
| CASE-006 | REQ-02, REQ-12 | [CASE-004/005/006: convite docente e analise respeitam escopo e nao aprovam automaticamente](../../backend/test/integration.test.ts) | PASS |
| CASE-007 | REQ-02, REQ-11 | [CASE-007/045/046: historico reune cursos, ultimas dez e cursores empatados sem aceitar outro titular](../../backend/test/pagination.test.ts) | PASS |
| CASE-008 | REQ-02 | [CASE-005/006/008: coordenador acessa apenas o curso atribuido e nao cria administracao](../../backend/test/integration.test.ts) | PASS |
| CASE-009 | REQ-03 | [CASE-009: verificar e-mail nao aprova automaticamente acesso a curso](../../backend/test/integration.test.ts) | PASS |
| CASE-010 | REQ-03, REQ-13 | [CASE-009/010/011: aprovacao por curso exige analise, autoria real e nao cria aula](../../backend/test/integration.test.ts) | PASS |
| CASE-011 | REQ-03, REQ-14 | [CASE-011/016: edicao de perfil torna analise antiga obsoleta e exige nova submissao](../../backend/test/integration.test.ts) | PASS |
| CASE-012 | REQ-04 | [CASE-012/013/014/016: rascunho, submissao incompleta e edicoes concorrentes preservam versao](../../backend/test/integration.test.ts) | PASS |
| CASE-013 | REQ-04, REQ-12 | [CASE-012/013/014/016: rascunho, submissao incompleta e edicoes concorrentes preservam versao](../../backend/test/integration.test.ts) | PASS |
| CASE-014 | REQ-04, REQ-12 | [CASE-014/050: tipo trocado e operador injetado sao rejeitados, nunca removidos silenciosamente](../../backend/test/unit.test.ts) | PASS |
| CASE-015 | REQ-04, REQ-08 | [CASE-015/033/035: sobreposicao exige consolidacao; ausencia nao altera fatores](../../backend/test/scheduling.test.ts) | PASS |
| CASE-016 | REQ-04, REQ-14 | [CASE-012/013/014/016: rascunho, submissao incompleta e edicoes concorrentes preservam versao](../../backend/test/integration.test.ts) | PASS |
| CASE-017 | REQ-05, REQ-13 | [CASE-017/019: codigo unico, versao e historico academico persistem sob concorrencia](../../backend/test/integration.test.ts) | PASS |
| CASE-018 | REQ-05, REQ-02 | [CASE-018/019/020: ofertas exigem curso, periodo e blocos compativeis e preservam dependencias](../../backend/test/integration.test.ts) | PASS |
| CASE-019 | REQ-05, REQ-14 | [CASE-019/039/040/047: republicacao preserva passado e reavalia somente encontros ainda vigentes](../../backend/test/integration.test.ts) | PASS |
| CASE-020 | REQ-06 | [CASE-020/021/022/024: fronteiras, todos os encontros, fuso e carga semanal](../../backend/test/scheduling.test.ts) | PASS |
| CASE-021 | REQ-06 | [CASE-020/021/022/024: fronteiras, todos os encontros, fuso e carga semanal](../../backend/test/scheduling.test.ts) | PASS |
| CASE-022 | REQ-06, REQ-07 | [CASE-020/021/022/024: fronteiras, todos os encontros, fuso e carga semanal](../../backend/test/scheduling.test.ts) | PASS |
| CASE-023 | REQ-06 | [CASE-023/026/027/029: todos os conhecimentos obrigatorios e grade ausente geram caminhos explicitos](../../backend/test/scheduling.test.ts) | PASS |
| CASE-024 | REQ-06 | [CASE-020/021/022/024: fronteiras, todos os encontros, fuso e carga semanal](../../backend/test/scheduling.test.ts) | PASS |
| CASE-025 | REQ-06, REQ-09 | [CASE-025/036: periodos com IDs diferentes e datas sobrepostas preservam reserva global](../../backend/test/integration.test.ts) | PASS |
| CASE-026 | REQ-07 | [CASE-023/026/027/029: todos os conhecimentos obrigatorios e grade ausente geram caminhos explicitos](../../backend/test/scheduling.test.ts) | PASS |
| CASE-027 | REQ-07 | [CASE-023/026/027/029: todos os conhecimentos obrigatorios e grade ausente geram caminhos explicitos](../../backend/test/scheduling.test.ts) | PASS |
| CASE-028 | REQ-07, REQ-08 | [CASE-026/027/028/029: ausencia e falha conhecidas prevalecem; score incompleto nao vira zero](../../backend/test/scheduling.test.ts) | PASS |
| CASE-029 | REQ-07, REQ-12 | [CASE-023/026/027/029: todos os conhecimentos obrigatorios e grade ausente geram caminhos explicitos](../../backend/test/scheduling.test.ts) | PASS |
| CASE-030 | REQ-08 | [CASE-030/031/032/034: proposta Ana 80 e Bruno 85, fatores, teto e determinismo](../../backend/test/scheduling.test.ts) | PASS |
| CASE-031 | REQ-08, REQ-12 | [CASE-031/034/056: scores calculados permanecem finitos, explicaveis e deterministicos nas fronteiras](../../backend/test/scheduling.test.ts) | PASS |
| CASE-032 | REQ-08 | [CASE-030/031/032/034: proposta Ana 80 e Bruno 85, fatores, teto e determinismo](../../backend/test/scheduling.test.ts) | PASS |
| CASE-033 | REQ-08 | [CASE-015/033/035: sobreposicao exige consolidacao; ausencia nao altera fatores](../../backend/test/scheduling.test.ts) | PASS |
| CASE-034 | REQ-08 | [CASE-038/005: dois professores disputam a turma e candidato de outro curso fica oculto](../../backend/test/integration.test.ts) | PASS |
| CASE-035 | REQ-08, REQ-10 | [CASE-035/041..048: ausencia privada, arquivo validado, notificacoes e historico proprio](../../backend/test/integration.test.ts) | PASS |
| CASE-036 | REQ-09, REQ-13 | [CASE-025/036: periodos com IDs diferentes e datas sobrepostas preservam reserva global](../../backend/test/integration.test.ts) | PASS |
| CASE-037 | REQ-09, REQ-06 | [CASE-037/038: disputa de carga sem sobreposicao e disputa de turma sao serializadas](../../backend/test/integration.test.ts) | PASS |
| CASE-038 | REQ-09 | [CASE-038/005: dois professores disputam a turma e candidato de outro curso fica oculto](../../backend/test/integration.test.ts) | PASS |
| CASE-039 | REQ-09, REQ-14 | [CASE-020..040/056: elegibilidade, reservas globais concorrentes, versoes e publicacao estavel](../../backend/test/integration.test.ts) | PASS |
| CASE-040 | REQ-09, REQ-13 | [CASE-020..040/056: elegibilidade, reservas globais concorrentes, versoes e publicacao estavel](../../backend/test/integration.test.ts) | PASS |
| CASE-041 | REQ-10, REQ-02 | [CASE-035/041..048: ausencia privada, arquivo validado, notificacoes e historico proprio](../../backend/test/integration.test.ts) | PASS |
| CASE-042 | REQ-10, REQ-12 | [CASE-035/041..048: ausencia privada, arquivo validado, notificacoes e historico proprio](../../backend/test/integration.test.ts) | PASS |
| CASE-043 | REQ-10, REQ-09 | [CASE-035/041..048: ausencia privada, arquivo validado, notificacoes e historico proprio](../../backend/test/integration.test.ts) | PASS |
| CASE-044 | REQ-10, REQ-12 | [CASE-035/041..048: ausencia privada, arquivo validado, notificacoes e historico proprio](../../backend/test/integration.test.ts) | PASS |
| CASE-045 | REQ-11 | [CASE-007/045/046: historico reune cursos, ultimas dez e cursores empatados sem aceitar outro titular](../../backend/test/pagination.test.ts) | PASS |
| CASE-046 | REQ-11 | [CASE-007/045/046: historico reune cursos, ultimas dez e cursores empatados sem aceitar outro titular](../../backend/test/pagination.test.ts) | PASS |
| CASE-047 | REQ-11, REQ-08 | [CASE-019/039/040/047: republicacao preserva passado e reavalia somente encontros ainda vigentes](../../backend/test/integration.test.ts) | PASS |
| CASE-048 | REQ-11, REQ-08 | [CASE-047/048: historico completo, equivalencia explicita e deduplicacao de declaracoes](../../backend/test/scheduling.test.ts) | PASS |
| CASE-049 | REQ-12 | [CASE-049: JSON malformado e payload excessivo sao recusados](../../backend/test/integration.test.ts) | PASS |
| CASE-050 | REQ-12, REQ-13 | [CASE-014/050: tipo trocado e operador injetado sao rejeitados, nunca removidos silenciosamente](../../backend/test/unit.test.ts) | PASS |
| CASE-051 | REQ-12 | [CASE-051/052: erros estruturados nao expoem segredos nem anunciam sucesso](../../backend/test/unit.test.ts) | PASS |
| CASE-052 | REQ-12, REQ-14 | [CASE-051/052: erros estruturados nao expoem segredos nem anunciam sucesso](../../backend/test/unit.test.ts) | PASS |
| CASE-053 | REQ-13 | [CASE-053: readiness depende do MongoDB real, sem fallback em memoria](../../backend/test/integration.test.ts) | PASS |
| CASE-054 | REQ-13 | [CASE-054/055: identidade e auditoria persistem ao recriar a aplicacao](../../backend/test/integration.test.ts) | PASS |
| CASE-055 | REQ-14 | [CASE-063: analise exige coordenador ativo do curso mesmo com papel de administrador](../../backend/test/integration.test.ts) | PASS |
| CASE-056 | REQ-07, REQ-08, REQ-14 | [CASE-020..040/056: elegibilidade, reservas globais concorrentes, versoes e publicacao estavel](../../backend/test/integration.test.ts) | PASS |
| CASE-057 | REQ-15, REQ-12, REQ-14 | [CASE-057: configuracao conservadora bloqueia saude e producao sem politica](../../backend/test/privacy.test.ts) | PASS |
| CASE-058 | REQ-15, REQ-12, REQ-14 | [CASE-058: protocolo autentica, valida CSRF e impede falsificar titular](../../backend/test/privacy.test.ts) | PASS |
| CASE-059 | REQ-15, REQ-12, REQ-14 | [CASE-059: resposta exige administrador, versao e preserva historico sob concorrencia](../../backend/test/privacy.test.ts) | PASS |
| CASE-060 | REQ-15, REQ-12, REQ-14 | [CASE-060: exportacao exige senha e nao contem credenciais nem dados de outro titular](../../backend/test/privacy.test.ts) | PASS |
| CASE-061 | REQ-15, REQ-12, REQ-14 | [CASE-061: paginacao mantem empate de datas e escopo e recusa cursor invalido](../../backend/test/privacy.test.ts) | PASS |
| CASE-062 | REQ-15, REQ-12, REQ-14 | [CASE-062: bloqueio de dados de saude ocorre no servidor antes de armazenar arquivo](../../backend/test/privacy.test.ts) | PASS |
| CASE-063 | REQ-02, REQ-03, REQ-14 | [CASE-063: analise exige coordenador ativo do curso mesmo com papel de administrador](../../backend/test/integration.test.ts) | PASS |
| CASE-064 | REQ-10, REQ-12, REQ-15 | [CASE-064: PDF passivo preservado; scripts, anexos, formularios, excesso e MIME falso recusados](../../backend/test/documents.test.ts) | PASS |
| CASE-065 | REQ-04, REQ-12, REQ-14, REQ-15 | [CASE-065: comprovantes vinculados ao perfil, privados, imutaveis e retirados com versao](../../backend/test/documents.test.ts) | PASS |
| CASE-066 | REQ-02, REQ-05, REQ-09, REQ-11, REQ-12 | [CASE-066: planejamento grande recusa truncamento e oferece periodo e listagens paginadas](../../backend/test/pagination.test.ts) | PASS |
| CASE-067 | REQ-12, REQ-14 | [CASE-067: manutencao recusa operacoes antes dos handlers, preserva dados e recupera sem revogar sessao](../../backend/test/maintenance.test.ts) | PASS |
| CASE-068 | REQ-11, REQ-12, REQ-14 | [CASE-068: historico sintetico restrito, transacional e idempotente preserva perfil, criterios e aulas existentes](../../backend/test/preview-history.test.ts) | PASS |

## Limites da entrega e integracao institucional

- Conexao configurada no .env: NOT_READY na verificacao somente de leitura desta etapa, MongoServerSelectionError relacionado a TLS. Nenhum segredo foi impresso; certificado/validacao TLS nao foram desativados. Os testes PASS usam replicas MongoDB reais e descartaveis, sem depender do Atlas. A causa externa exata ainda nao esta diagnosticada.
- SMTP de captura e recuperacao de senha: PASS local, inclusive expiracao exata de uma hora e consumo unico. Entrega real ao Gmail/remetente institucional: NOT_TESTED, depende de credenciais e remetente autorizados.
- Controlador, canal, bases e retencao: pendentes de definicao institucional. Atestados reais bloqueados por padrao; SYNTHETIC_ONLY na previa. Criterios, pesos e grade continuam propostas configuraveis, sem homologacao academica automatica.
- Certificados/diplomas: API privada entregue; falta conectar os novos controles de comprovantes no frontend. Administracao de usuarios tem consulta paginada e alteracao de estado na API, enquanto a tela geral de gestao permanece etapa de frontend.
- PDF: politica conservadora documentada no [README do backend](../../backend/README.md); nao certifica autenticidade, assinatura ou ausencia de malware. Arquivos originais permanecem privados. Retirada da analise nao significa exclusao fisica ou atendimento automatico de eliminacao.
- Paginacao por offset usa ordem com desempate, sem snapshot entre requisicoes: atualizacoes concorrentes exigem recarregar a lista. Historico e documentos mantem cursores proprios. Clientes devem seguir nextOffset/nextCursor; a interface atual ainda tem telas com leitura de uma pagina. Comparacao de candidatos recusa mais de 200 em uma chamada; nao retorna ranking parcial como completo.
- Publicacao e reservas estao validadas sob concorrencia em replica local. Teste de carga institucional, backup/restore, dominio HTTPS e operacao de producao: NOT_TESTED. Nao instalar certificado raiz local no Windows para demonstrar.

O estado aceito aqui e implementacao integrada e validada localmente. A operacao institucional e a conclusao integrada ao banco/remetente definitivos continuam pendentes das dependencias acima.
