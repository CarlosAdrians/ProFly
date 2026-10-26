# Revisão dos perfis do ProFly

Atualizado em 26/10/2026, branch feat/backend-institucional. Backend implementado e validado localmente para demonstração acadêmica; operação institucional ainda depende dos itens externos abaixo. [Aceitação e rastreabilidade dos 68 cenários](validation/BACKEND_ACCEPTANCE.md); [histórico das verificações](validation/STATUS.md).

## Professor

| Área | Backend entregue | Próxima etapa / limite |
| --- | --- | --- |
| Conta | Cadastro completo, confirmação, sessão, recuperação em uma hora, email/senha protegidos e foto própria | SMTP externo depende de remetente autenticado; captura local não entrega ao Gmail |
| Entrada | Conta criada não aprova entrada; solicitação independente por curso e versão do perfil | Análise pelo coordenador responsável; nenhuma aula criada pela aprovação |
| Perfil e disponibilidade | Formação, conhecimentos, experiências, vigência e dedicação opcional | Dados ausentes permanecem pendentes; parâmetros acadêmicos reais precisam de homologação |
| Comprovantes | API privada por versão/item, PDF/imagens, arquivo imutável, paginação, quotas e retirada da análise | Conectar novos controles no frontend; comprovante não confirma conhecimento nem aumenta score automaticamente |
| Atestados | Imagem/PDF passivo privado, análise por curso, auditoria e sinalização temporária | PDF conectado no frontend com retomada de upload; saúde real bloqueada até definição institucional |
| Agenda e histórico | Somente aulas próprias publicadas, últimas dez de vários cursos, histórico com cursor e confirmação explícita de realização | Não é relógio de ponto; fluxo real de confirmação depende da faculdade |
| Privacidade | Cópia própria com senha, metadados/links privados separados e protocolos | Retenção, descarte e responsáveis ainda dependem da instituição |

## Coordenador

| Área | Backend entregue | Próxima etapa / limite |
| --- | --- | --- |
| Análise acadêmica | Papel e vínculo ativo no curso exigidos na consulta/decisão; administrador sem vínculo recusado; revogação vale na sessão existente | P1 de aprovação administrativa irrestrita corrigido, CASE-063; autoria forjada rejeitada |
| Organização | Disciplinas, critérios, turmas, períodos/ofertas, referências e versões | Grade, pesos, pertinência e requisitos são propostas para validação acadêmica |
| Elegibilidade e score | Todos os requisitos obrigatórios avaliados, pendência separada de falha e zero, score limitado/explicável | Recomendação não atribui aula; ausência temporária não diminui score acadêmico |
| Alocação/publicação | Reservas globais de professor/turma/carga, concorrência, versões e rollback | Inclusive entre períodos distintos com datas sobrepostas; histórico passado preservado |
| Consulta | Listas com continuação explícita; planejamento por período e endpoints paginados | Visão agregada recusa corte em mais de 500 alocações/publicações ou 100 planos; comparação recusa mais de 200 candidatos por chamada |

## Administrador

| Área | Backend entregue | Próxima etapa / limite |
| --- | --- | --- |
| Estrutura | Cursos, coordenadores/vínculos, competências, períodos/blocos e carga institucional | Configurar a estrutura real e o primeiro administrador explicitamente |
| Usuários | Consulta paginada e alteração versionada de ACTIVE/DISABLED; proteção do último administrador | Tela geral de gestão ainda é etapa de frontend |
| Papéis | Cursos acessíveis ao administrador não são apresentados como vínculos fictícios de coordenação | Para analisar professor, também precisa ser coordenador ativo daquele curso |
| Privacidade | Protocolos, respostas versionadas e trilha de atendimento | Definir controlador/canal, bases e retenção; nenhuma exclusão automática |

## Fechamento local e dependências externas

O backend tem gates reproduzíveis em node scripts/verify.mjs, executado no diretório backend. A revisão final cobre contratos, falhas, fronteiras, escopo, concorrência, arquivos, histórico, persistência e segurança. Os resultados e limites estão na aceitação vinculada acima; matriz planejada não é prova de execução.

- MongoDB configurado: NOT_READY na tentativa somente de leitura desta etapa, erro de seleção de servidor relacionado a TLS. Causa externa exata ainda não diagnosticada; TLS e certificados mantidos. MongoDB real descartável dos testes: PASS.
- SMTP local de captura: PASS; entrega externa/remetente institucional: NOT_TESTED. Não houve envio real ao Gmail.
- Critérios/grade/carga, responsáveis e políticas de privacidade: pendentes de homologação; dados clínicos reais não liberados.
- Backup/restore, domínio/HTTPS e carga institucional: ainda não homologados. Não instalar certificados raiz de desenvolvimento para apresentação.
- Próximo frontend: ligar comprovantes acadêmicos, gestão geral de usuários e navegação de mais páginas. A mudança de autorização foi refletida nos controles de análise existentes, sem redesenhar as telas.

## Cenário visual preparado nesta etapa

Na conta fictícia docente.ui@profly.test da prévia5175, cinco aulas futuras foram publicadas pela API na semana26/10 a01/11/2026: segunda08:00 e14:00; terça09:00; quinta14:00; sexta15:00. Cada encontro tem50 minutos. Quarta, sábado e domingo ficaram livres. Cursos/turmas/disciplinas e critérios deste cenário são fictícios e não representam currículo homologado.

Disponibilidade anterior noturna preservada; acrescentadas cinco janelas diurnas, perfil reenviado e analisado pelo coordenador do curso, ofertas/alocações criadas e escala publicada. Não foram inseridas ocorrências diretamente no banco do checklist. O script explícito seed-preview-week.mjs recusa destino externo/institucional, não lê.env e usa somente identidades @profly.test em modo SYNTHETIC_ONLY. Não é comando de dados iniciais de produção.

O calendário agora inicia em Semana/Todos para o professor, mostra horário/disciplina/turma, contador, legenda e dias livres. Paleta de oito tons consistente pelo nome normalizado do curso/disciplina, preservada entre datas/turnos/visões; as três matérias do cenário usam cores distintas. Curso e demais dados estão no modal da aula. Controles compactos, destaque de hoje e temas claro/escuro; mês/semana/dia exibem segunda a sábado. A coordenação mantém seu filtro inicial, apresentação e editor de alocações; o professor continua sem criar/arrastar aulas.

Incremento visual de 26/10: cadernos de turnos no calendário, quadro semanal de disponibilidade, linha do tempo consultiva e atestados com PDF no formulário. Cinco registros históricos da semana 19..23/10 acrescentados apenas à conta sintética (3 realizados, 1 cancelado, 1 a confirmar), por rotina transacional restrita ao banco efêmero local; repetição não duplica. Aulas publicadas da semana 26..31 e perfil/critérios preservados. 404/carregamento/manutenção com marca institucional; pausa operacional configurável sem revogar sessões. Testes atuais: 74 de backend, 18 da interface conectada e 220 gerais do frontend, com limites externos conservados.
