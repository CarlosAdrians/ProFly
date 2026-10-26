# Revisão dos perfis do ProFly

Revisão de25/10/2026, na branch feat/backend-institucional. Este checklist compara o código e as verificações disponíveis com os pedidos do projeto. Implementado não significa homologado pela faculdade. A matriz de cenários permanece planejamento; resultados executados constam em [STATUS.md](validation/STATUS.md).

## Professor

| Área | Situação observada | Próximo trabalho |
| --- | --- | --- |
| Conta e acesso | Cadastro, confirmação, perfil detalhado, edição, foto opcional, senha e recuperação conectados | Envio real de e-mail ainda depende de SMTP institucional; captura local não entrega ao Gmail |
| Entrada nos cursos | Solicitação e análise por curso; criar identidade não atribui aulas | Manter clara a separação entre confirmação de conta, aprovação acadêmica e publicação |
| Disponibilidade | Janelas com vigência e dedicação opcional, preservadas ao salvar | Homologar horários/blocos reais e regras institucionais; cinco novas janelas apenas no cenário sintético |
| Agenda | Somente aulas próprias publicadas, mês/semana/dia e consulta de detalhes | Validar com a faculdade a apresentação final após visualizar agenda preenchida; não é relógio de ponto |
| Histórico e horas | Ocorrências e confirmação pela coordenação; início mostra horas programadas/confirmadas | Definir procedimento de confirmação, reposições e uso institucional; não contar ausência como penalidade de score |
| Formação/certificações | Formação e conhecimentos estruturados no perfil | Anexos próprios de certificados/diplomas e gestão documental específica ainda não implementados |
| Atestados | Imagens privadas, análise por curso e retomada de upload | PDF ainda não suportado; dados reais de saúde bloqueados até política institucional, retenção e base específica |
| Privacidade | Cópia própria, correção, novo pedido recolhido e protocolos | Governança institucional foi retirada da tela pessoal; responsável/canal/prazos seguem pendentes, disponíveis na área administrativa e aviso público |

## Coordenador

| Área | Situação observada | Próximo trabalho |
| --- | --- | --- |
| Escopo | Vínculos por curso e comandos autorizados no servidor | Ver P1 abaixo: privilégio global de administrador ainda alcança análise acadêmica |
| Cadastro/análise | Professor se cadastra; responsável analisa a solicitação | Definir rotina de conferência de documentos/declarações e revisão de perfis alterados |
| Disciplinas e critérios | Gestão conectada e critérios versionados | Requisitos, relevâncias e pesos permanecem propostas; homologar com os cursos |
| Elegibilidade e score | Verificações explicáveis, critérios versionados e dados pendentes distintos de zero | Validar critérios/relevâncias com docentes reais somente após autorização institucional |
| Alocações e publicação | Rascunhos, versões, conflitos globais e publicação testados | Homologar grade real, feriados locais próprios e regras de turmas/carga |
| Volume institucional | Listas e consultas têm limites explícitos | Expandir paginação/consulta por período antes de tratar lotes como totais de toda a faculdade |

## Administrador

| Área | Situação observada | Próximo trabalho |
| --- | --- | --- |
| Estrutura | Cursos, coordenadores/vínculos, competências, períodos/blocos e carga docente | Revisar dados reais e rotina operacional de configuração |
| Atendimento de privacidade | Protocolos administrativos e informações institucionais concentrados nesta área | Definir responsáveis; os parâmetros públicos ainda são configurados no servidor, sem formulário institucional de homologação |
| Usuários | Rotas de estado ACTIVE/DISABLED existem no backend | Tela geral de gestão de usuários/ativação/inativação ainda não está nas abas administrativas; revisar desligamento e impactos nas escalas |
| Convites | Interface permite copiar link de convite | Remessa institucional por e-mail e acompanhamento operacional ainda dependem de implementação/configuração |
| Operação | Prévia sintética está disponível | Primeiro administrador real, Atlas, SMTP, domínio HTTPS, backups/restore e retenção precisam de configuração/homologação |

## Prioridades identificadas

**P1 — aprovação acadêmica somente pelo coordenador responsável.** O pedido do projeto define esse limite. Atualmente teachers/routes.ts cria o guard de análise com coordinator e admin, e IdentityService.course permite bypass global para admin. Assim, o administrador também consegue aprovar um curso sem vínculo de coordenação. Isso é uma divergência da regra solicitada; precisa ser restringida no backend e refletida na interface, com testes de administrador sem vínculo, coordenador de outro curso e pessoa com papéis simultâneos. Esta revisão não declara a divergência resolvida. O cenário visual desta etapa usou de fato o coordenador do curso para aprovar/publicar, sem usar o bypass.

**P1 — operação real e dados de saúde.** Controlador, canal, hipóteses legais, retenção, destinatários e operadores ainda não definidos; produção exige configuração e não está homologada. SMTP real, conexão externa ao Atlas e certificado do domínio são dependências separadas do sucesso dos testes locais. Não enviar atestados reais à prévia.

**P2 — gestão de usuários e documentos.** Completar a interface de estado/desligamento, certificados/diplomas e PDF de atestado, conforme as prioridades validadas pelo grupo. Não criar descarte automático sem política de guarda.

**P2 — escala da faculdade.** Paginar as listas e verificar totais institucionais. Histórico docente já usa cursor; catálogos100, agenda da coordenação500 e comparação200 não devem ser apresentados como volume ilimitado.

## Cenário visual preparado nesta etapa

Na conta fictícia docente.ui@profly.test da prévia5175, cinco aulas futuras foram publicadas pela API na semana26/10 a01/11/2026: segunda08:00 e14:00; terça09:00; quinta14:00; sexta15:00. Cada encontro tem50 minutos. Quarta, sábado e domingo ficaram livres. Cursos/turmas/disciplinas e critérios deste cenário são fictícios e não representam currículo homologado.

Disponibilidade anterior noturna preservada; acrescentadas cinco janelas diurnas, perfil reenviado e analisado pelo coordenador do curso, ofertas/alocações criadas e escala publicada. Não foram inseridas ocorrências diretamente no banco do checklist. O script explícito seed-preview-week.mjs recusa destino externo/institucional, não lê.env e usa somente identidades @profly.test em modo SYNTHETIC_ONLY. Não é comando de dados iniciais de produção.

O calendário agora inicia em Todos para o professor, mostra curso/turma, contador do período e dias livres na visão semanal. A coordenação mantém seu filtro inicial e editor de alocações; o professor continua sem criar/arrastar aulas.
