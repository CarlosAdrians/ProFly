# Privacidade e LGPD no ProFly

Estado: controles técnicos implementados para homologação, sem certificação de conformidade. Em 25/10/2026 o usuário confirmou que controlador e canal de privacidade ainda não foram definidos. Não presumir autorização da faculdade pelo uso da marca. Ambiente de apresentação: somente dados fictícios.

## O que está implementado

- Aviso e termos versionados2026-10-25.1, ciência separada de consentimento. Novos cadastros exigem a versão atual; registros antigos não são reescritos e não se presume um novo aceite para contas existentes.
- Conta -> Meus dados e privacidade: cópia estruturada com senha atual, CSRF e sessão ativa; protocolos gratuitos para direitos com histórico de resposta e consulta somente do titular.
- Administração -> Atendimento de privacidade: consulta restrita a administradores, resposta versionada, eventos preservados e auditoria. Coordenador não ganha acesso aos protocolos dos professores pelo fato de coordenar um curso.
- Novos documentos de saúde bloqueados por padrão. Prévia efêmera permite exclusivamente arquivos fictícios, identificados como teste. Downloads existentes continuam protegidos pelas autorizações de autor/curso.
- Cookie essencial, ausência de publicidade/LLM neste fluxo, validações, CSRF, autorização por recurso e trilhas sem copiar o conteúdo clínico em logs de operação.

Exportação usa snapshot e projeções de inclusão: conta, perfil/versões, vínculos, solicitações/análises, aceites, carga, ocorrências, publicações próprias, ausências, preferências, avisos e protocolos. Não inclui hashes de senha, sessões, tokens, dados de outros titulares ou binários médicos. Arquivos próprios são baixados separadamente sob autenticação. Há limite de5000 registros por categoria e10MB; excesso retorna413 orientando pedido completo, sem truncar silenciosamente. Essa cópia não é declaração completa de origem/critérios/finalidade nem prova de portabilidade regulamentada. Auditoria ou registros técnicos adicionais pertinentes são atendidos na análise individual, resguardando direitos de terceiros.

## Inventário do tratamento

As finalidades abaixo descrevem a implementação. Bases e prazos são decisões institucionais pendentes; não habilitar uso real com uma fundamentação genérica inventada.

| Categoria | Finalidade do sistema | Acesso | Base/prazo a definir |
| --- | --- | --- | --- |
| Nome, e-mail, telefone, credencial | Identidade e comunicação operacional | Titular; administração conforme operação | Base por finalidade, retenção de conta/inatividade |
| Foto opcional | Identificação visual, sem reconhecimento biométrico | Titular e exibição autorizada | Necessidade/base específica e descarte; remoção já disponível |
| Formação, conhecimentos, experiência | Análise acadêmica e explicação da recomendação | Titular e coordenação responsável | Necessidade, verificação, revisão e prazo dos snapshots |
| Disponibilidade e dedicação opcional | Planejar compromissos e meta pessoal | Titular e cursos autorizados | Base, atualização e expiração de vigência |
| Vínculos, escalas, ocorrências | Gestão acadêmica e histórico | Titular e gestão por curso | Obrigações aplicáveis e guarda documental |
| Atestados/dados de saúde | Comprovação privada de afastamento | Autor e coordenações selecionadas | Base específica para dados sensíveis, minimização e retenção próprias |
| Sessões e tokens | Autenticação e recuperação | Servidor | Expiração técnica já definida; TTL não substitui política geral |
| Protocolos, aceites e auditoria | Atendimento, prestação de contas e segurança | Titular no seu protocolo; administração autorizada | Prazos e justificativas de conservação; controle de acesso do suporte |
| Tema e cache de feriados | Preferência e calendário público | Navegador utilizado | Tema até remoção; cache público24h; BrasilAPI recebe conexão técnica |

Não usar documento clínico como fator de score. Recomendação apoia decisão da coordenação; critérios/pesos continuam propostas. Antes do uso institucional, revisar necessidade, vieses, qualidade, transparência e riscos do perfilamento, documentando relatório de impacto quando aplicável/solicitado. Não introduzir raça, religião, diagnóstico ou outros atributos sensíveis para ranquear docentes.

## Configuração antes de produção

No backend/.env privado, parâmetros server-only:

```dotenv
PRIVACY_APPROVED=false
PRIVACY_HEALTH_UPLOADS_ENABLED=false
```

PRIVACY_APPROVED=true requer PRIVACY_CONTROLLER, PRIVACY_CONTACT_EMAIL, PRIVACY_PROCESSING_BASIS e PRIVACY_RETENTION_NOTICE preenchidos com informações reais revisadas. NODE_ENV=production recusa política pendente/incompleta. A aplicação não verifica juridicamente a qualidade desses textos nem a autoridade de quem os configura. Não publicar segredos nos campos do aviso, pois estes parâmetros são públicos por natureza.

PRIVACY_HEALTH_UPLOADS_ENABLED=true, fora de NODE_ENV=test, também requer homologação e PRIVACY_HEALTH_BASIS específica. Uma frase de configuração não substitui requisitos legais, autorização institucional ou consentimento específico quando essa for a hipótese escolhida. Não existe coleta automática de consentimento para saúde nesta etapa; não habilitar com essa base sem implementar o fluxo específico e sua revogação. Não condicionar serviço a consentimento amplo. Foto e dedicação continuam opcionais.

Definir ainda controlador/operadores, encarregado ou canal conforme regime aplicável, destinatários, localização e transferências internacionais, bases por finalidade e categoria, retenção/descarte, backups, restore, contratos com provedores, operação de incidentes e comunicação das mudanças. Política atual se mantém minuta até revisão/publicação institucional. Campos configurados não devem contrariar o aviso; alterações substanciais exigem nova revisão/versionamento.

## Atendimento de direitos

1. Confirmar titularidade pela sessão; o usuário não escolhe userId. Não pedir CPF/documento médico como rotina de verificação. Para representação ou perda de acesso, usar o futuro canal institucional com verificação proporcional.
2. Receber protocolo e classificar a providência. Acesso/confirmacão completos têm referência geral de15 dias; os outros direitos não recebem automaticamente esse prazo. Monitorar prazos e particularidades do regime aplicável.
3. Administrador registra análise e resposta clara, providências e motivo de eventual limitação. Não inserir informações de terceiros ou dados clínicos na resposta. O histórico de eventos é preservado; versão desatualizada retorna409.
4. Respondido significa resposta registrada, sem alegar execução automática da providência. Eliminação, bloqueio, anonimização e portabilidade exigem avaliação e execução controlada pelo responsável, com verificação e registro do resultado. Não apagar escalas/obrigações indiscriminadamente nem chamar pseudonimização de anonimização.
5. Quando cabível, comunicar correção/descarte a destinatários, verificar cópias e backups segundo política aprovada e registrar justificativa de conservação. Não encerrar como eliminado sem evidência. O software não automatiza expurgo institucional nem certifica atendimento do prazo.

A conta já permite corrigir dados, trocar e-mail mediante confirmação e remover foto. Pedidos de revisão de recomendação não alteram pontuação automaticamente. Revogação se aplica ao tratamento fundado em consentimento; ciência do aviso não é esse consentimento.

## Segurança e incidentes

Controles e limites de HTTPS/CORS em [SEGURANCA.md](SEGURANCA.md). O certificado local de desenvolvimento não constitui certificado institucional; não reinstalar confiança do Windows automaticamente. Dados reais de saúde permanecem bloqueados até homologação. MongoDB externo e SMTP real ainda dependem da infraestrutura informada em [STATUS.md](validation/STATUS.md).

Em incidente: conter acesso indevido, preservar evidência técnica mínima com acesso restrito, identificar escopo/titulares/dados atingidos e registrar ciência e decisões. O controlador deve avaliar risco/dano relevante e realizar as comunicações legalmente exigíveis à ANPD e aos titulares; o regulamento geral prevê3 dias úteis, ressalvadas hipóteses específicas. Não enviar notificações externas automaticamente por este protótipo nem publicar documentos pessoais na investigação. Preparar responsáveis, calendário, conteúdo e contato antes do uso real.

## Referências e evidências

- [LGPD — texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm): princípios, hipóteses de tratamento, dados sensíveis, direitos e segurança.
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).
- [ANPD — comunicação de incidentes](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis).
- [Spec](specs/BACKEND_V1.md), REQ-15/CASE-057..062, e [validação](validation/STATUS.md).
