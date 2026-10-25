# Interface conectada à API

Estado de desenvolvimento em 25/10/2026. O modo padrão usa `src/institutional`; não consulta o adaptador de contas, aprovações ou alocações do navegador. A base visual, fotografia do campus, componentes de formulário/modal/foto e tokens foram reaproveitados. `VITE_DEMO_MODE=true` carrega explicitamente a demonstração anterior sem apagar seus dados.

## Execução

1. Configure e inicie o [backend](../backend/README.md) em 127.0.0.1:3333 com MongoDB transacional. Nenhum `.env` do servidor é disponibilizado à interface.
2. Inicie `npm run dev` na raiz; o Vite atende em 127.0.0.1:5174 e encaminha `/api`. `PROFLY_API_TARGET` é uma opção do processo Vite para outro destino local, sem prefixo VITE.
3. Crie o administrador inicial explicitamente no servidor; não há senha padrão. O administrador cadastra cursos, competências, períodos e coordenadores. Professor usa o cadastro público e confirma seu e-mail.
4. Configure o remetente SMTP para envio real. A captura Mailpit preparada nesta máquina aceita somente endereços fictícios `@profly.test` e não entrega a caixas externas.

A hospedagem futura precisa servir a SPA, encaminhar `/api`, aplicar HTTPS e os cabeçalhos apropriados. O proxy de desenvolvimento não configura uma implantação. O acesso público continua bloqueado até homologação; serviços locais não foram expostos na rede.

## Fluxos disponíveis

| Rota | Fluxo pela API |
| --- | --- |
| `/login`, `/esqueceu-senha` | Sessão real por cookie HttpOnly, erros estruturados e pedido genérico de recuperação. |
| `/cadastro` | Quatro etapas, perfil detalhado, dedicação semanal opcional, cursos/disciplinas e aceites desmarcados/versionados. |
| `/verificar-email`, `/redefinir-senha`, `/ativar-acesso` | Fragmento em memória, removido da barra; confirmação por POST explícito, expiração/uso único no servidor. |
| `/inicio` | Professor: próximas aulas publicadas, trabalho semanal/meta opcional, histórico e atalhos. Coordenador: próximas aulas, solicitações pendentes, rascunhos e aulas a confirmar do curso. |
| `/conta`, `/horarios` | Dados próprios, perfil com versão esperada, foto pelo avatar/editor e horários pretendidos. Troca de e-mail exige senha e confirmação. |
| `/professores` | Solicitações e vínculos do curso; análise por item e decisão fundamentada. Coordenador não cria professores já aprovados. |
| `/disciplinas` | Cadastro/edição e critérios completos, com requisitos e pesos identificados como proposta configurável. |
| `/alocacoes` | Turmas/ofertas, criar/editar rascunhos, comparar candidatos no mesmo snapshot, árvore/score, versão esperada e publicação confirmada. |
| `/calendario` | Mês/semana/dia, turnos, feriados públicos, pins por encontro, formulário e arraste que preserva os outros encontros da recorrência. Professor vê somente a escala publicada. |
| `/historico` | Professor: consulta própria por cursor/curso. Coordenador: confirmar aula encerrada, cancelar ou vincular reposição publicada da mesma turma/disciplina/professor. |
| `/ausencias` | Atestados e comunicações: arquivo, datas e cursos no mesmo formulário; retomada do upload sem duplicar o registro. Análise e download continuam autorizados por curso. |
| `/configuracoes` | Compatibilidade: redireciona para Conta. Senha fica em Conta; tema permanece no menu e preferência de avisos no painel do sino. |
| `/administracao` | Cursos/coordenadores, convites/revogação, competências, períodos/grade e carga máxima institucional. |

O sino abre um painel na tela atual, com lista e contador compartilhados, leitura persistida, fechamento por Escape/clique externo e preferência versionada de avisos internos. `/notificacoes` redireciona para o início; não existe tela separada de notificações. O menu usa os ícones originais para os itens existentes e não exibe Ajustes. Documentos legais ficam em Conta e no acesso público, sem link solto no rodapé global.

Papéis simultâneos permitem alternar visão docente/gestão. O seletor de gestão mostra somente cursos autorizados; cada comando continua sendo autorizado pelo servidor. Reprovação, pendência e versão desatualizada mantêm os campos preenchidos para correção. Falha de rede não cria sucesso nem troca para dados fictícios.

## Dados e segurança

Sessão e CSRF permanecem em memória/cookie; o token da sessão não é guardado no localStorage. `fetch` usa credentials include; comandos autenticados recebem CSRF, e 401 de sessão expirada encerra a interface. Preferência de tema é local, mas o toggle de notificações é versionado no servidor. Ele controla avisos internos, sem bloquear recuperação/verificação da conta.

Foto de perfil: JPG/PNG/WebP até 2 MB, decodificada no servidor, normalizada e privada. Atestado: original preservado na coleção privada, até 5 MB/16 MP, JPG/PNG/WebP; PDF ainda não suportado. Documento clínico não participa dos fatores do score. Retenção, revisão jurídica e operação com documentos reais dependem da instituição.

A API usa limites explícitos. Catálogos nesta primeira interface carregam lotes de até 100 itens; docentes e notificações também têm limites. Histórico do professor tem paginação por cursor; a consulta da coordenação é limitada a 500 ocorrências. A comparação suporta até 200 candidatos e recusa excesso explicitamente. Paginação ampliada das telas de gestão e medição de carga para a faculdade inteira ainda precisam ser feitas antes de uso em grande escala.

## Verificação

`npm run test:api` habilita a suíte conectada: componentes e rotas React usam o cliente real, contratos Fastify e MongoDB efêmero. A ponte de teste simula transporte HTTP/cookies, sem simular repositórios ou regras de negócio. São endereços fictícios, sem carregar `.env` ou acessar o banco institucional. Isso complementa a conferência de rede/navegador na prévia isolada, sem alegar teste em aparelho físico.

Para conferência visual, `backend/scripts/dev-isolated.ts` inicia outro banco efêmero com opt-in, API 3334 e frontend 5175. Contas fictícias: `admin.ui@profly.test`, `coordenacao.ui@profly.test` e `docente.ui@profly.test`; senha somente de teste `ProFlyTest2026`. Esses acessos não existem automaticamente no banco configurado em `.env` nem no modo demonstrativo legado.

Evidências, comandos e limitações atualizadas em [STATUS.md](validation/STATUS.md). Os pesos, a grade, limites e procedimentos operacionais continuam propostas configuráveis pendentes de validação institucional. Entrega externa de e-mail, outbox/retentativas, monitoramento, HTTPS e homologação de segurança não foram concluídos por esta integração.

## Situacao local ao encerrar a verificacao

A previa isolada3334/5175 respondeu e exibiu escala publicada. A API principal3333 falhou ao reconectar ao Atlas com erro TLS de selecao de servidor, reproduzido por ping direto. O painel exige novo login; a lista de acesso de IPs nao pode ser confirmada nessa sessao. O frontend5174 responde, mas depende de resolver essa conexao. Nao houve reducao de TLS, alteracao da lista de acesso nem troca automatica do banco externo por um banco ficticio. Evidencias sanitizadas em STATUS.md.

## Limites da visão inicial

O início da coordenação usa a lista autorizada de até 500 ocorrências já disponível na API. Cursos que ultrapassem esse volume precisam da paginação/filtro de período no servidor antes de interpretar a visão como total institucional. A agenda mostra somente ocorrências previstas ativas; canceladas/remarcadas não entram nas próximas aulas. Nenhum evento ou número foi inventado para preencher a apresentação.

## Disponibilidade compacta e HTTPS local

Os horários pretendidos mostram dia, faixa e vigência em linhas recolhíveis. Só o horário em edição expõe seus cinco campos; novas linhas já abrem para preenchimento. O editor mantém identificadores, validações, demais janelas e dedicação opcional ao salvar na API. Campos do portal usam altura42px no desktop e44px no móvel, com texto16px no móvel; login preserva seu dimensionamento próprio. Disponibilidade e dedicação têm largura limitada.

O calendário docente continua consultando somente aulas próprias publicadas pela coordenação. Informar disponibilidade não cria aula. Atestado/comunicação continua com armazenamento privado e sem participar do score.

O comando opcional `npm run dev:https` e a prévia sintética separada estão em [HTTPS_LOCAL.md](HTTPS_LOCAL.md). HTTPS foi testado com certificado explícito, sem instalar confiança permanente no navegador. A interface HTTP existente permanece disponível para o checklist.

## Central de privacidade

Conta -> Gerenciar meus dados abre /conta/privacidade para a própria pessoa. A administração atende /administracao/privacidade; coordenadores não recebem permissão para protocolos de professores. Aviso público e modal do cadastro mostram configuração real do servidor, sem inventar responsável/canal. Foto e dedicação opcionais não viram consentimento de tratamento. Novos atestados obedecem ao gate do servidor; a prévia permite apenas arquivos sintéticos.

A prévia LGPD separada usa API3336 e frontendlocalhost5177, preservando o checklist3334/5175. No backend: PROFLY_RUN_INTEGRATION=1, PROFLY_PREVIEW_PORT=3336 e PROFLY_PREVIEW_HTTPS=0, depois node --import tsx scripts/dev-isolated.ts. Na raiz: PROFLY_API_TARGET=http://127.0.0.1:3336 e Vite --host127.0.0.1 --port5177 --strictPort. Os mesmos acessos sintéticos já documentados são recriados em banco efêmero independente. Nenhuma conta real/institucional é criada. Bases, prazos e procedimentos em [LGPD.md](LGPD.md).
