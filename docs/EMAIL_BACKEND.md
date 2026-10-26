# E-mail e recuperacao de senha no backend

Decisao de 24/10/2026: desenvolver o backend primeiro e usar uma caixa ficticia local durante os testes e a apresentacao. Nenhuma conta Gmail pessoal ou institucional foi conectada. O envio institucional depende de aprovacao e configuracao da faculdade.

## Implementado

- Adaptador SMTP com [Nodemailer](https://nodemailer.com/smtp), integrado a porta Notifications existente. A biblioteca e [open source, MIT-0](https://nodemailer.com/license).
- Mensagens de confirmacao do e-mail e recuperacao da senha em HTML e texto. Confirmar e-mail ativa somente a identidade; nao aprova entrada em cursos.
- Tokens de uso unico, guardados por hash no MongoDB, com validade de uma hora para verificacao/reset. Novo pedido invalida os anteriores; redefinir a senha revoga as sessoes.
- Remetente, destino SMTP e origem dos links definidos pelo ambiente do servidor. O corpo da requisicao nao escolhe remetente, headers ou destino de redirecionamento.
- TLS e validacao de certificado para servidores externos. Transporte sem TLS permitido apenas em loopback, fora de producao e sem credenciais, para captura local.
- Timeouts limitados, logs SMTP desativados, sem acesso a arquivos/URLs de anexos e erro generico quando o provedor rejeita o envio. Retorno SMTP aceito nao comprova entrega em caixa externa.

O modo padrao e EMAIL_TRANSPORT=disabled. Nessa situacao, cadastro/reenvio/recuperacao continuam retornando 503 EMAIL_UNAVAILABLE, sem simular envio. EMAIL_TRANSPORT=smtp exige configuracao completa. Credenciais e URI do MongoDB permanecem no .env ignorado pelo Git.

## Caixa ficticia local

[Mailpit](https://mailpit.axllent.org/) e uma ferramenta [open source MIT](https://mailpit.axllent.org/docs/development/) que captura SMTP e mostra as mensagens em uma interface web. Ele nao e um provedor de entrega externa. Usar sem relay/forwarding.

Configuracao de captura, ja aplicada somente ao .env local desta maquina:

```dotenv
EMAIL_TRANSPORT=smtp
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURITY=plain
SMTP_FROM=profly@profly.test
PUBLIC_APP_URL=http://127.0.0.1:5174
```

Nao definir SMTP_USER/SMTP_PASSWORD na captura. PUBLIC_APP_URL precisa corresponder a uma origem de ALLOWED_ORIGINS. Fora de loopback, usar HTTPS.

Execucao equivalente do Mailpit, depois de obter o executavel oficial:

```powershell
.\mailpit.exe --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025 --allowed-hosts 127.0.0.1,localhost --disable-version-check --block-remote-css-and-fonts --smtp-allowed-recipients '.*@profly[.]test$' --smtp-max-recipients 1 --max 100 --max-message-size 1 --label ProFly
```

Nesta maquina foi usada a [release oficial v1.32.0](https://github.com/axllent/mailpit/releases/tag/v1.32.0), ZIP Windows amd64 com SHA-256 conferido contra o digest publicado: 16915767a6c95dca569336e8f561f91cf355e9a33c57b91deedcc10a4bba7fd4. Executavel, caixa e logs ficam em work, fora do repositorio; nao houve instalacao global. Variaveis MP_* herdadas foram removidas somente do processo de inicializacao para evitar configuracoes anteriores de relay/forwarding.

Abrir [caixa de teste](http://127.0.0.1:8025). O servidor fica restrito ao proprio computador; a execucao preparada aceita somente destinatarios @profly.test. Foram capturadas duas previas para apresentacao@profly.test. Seus tokens sao ficticios, nao foram persistidos e nao ativam contas. Nao substituir esse endereco por uma pessoa real durante os testes.

## Interface conectada

As telas `/verificar-email#token=...`, `/redefinir-senha#token=...` e `/ativar-acesso#token=...` estão implementadas. O token permanece em memória, é removido da barra e só é enviado por POST após ação explícita; abrir o link por GET não o consome. A recuperação consulta a API com resposta genérica e não promete entrega na caixa externa.

O cadastro completo persiste o perfil e os aceites no servidor, mas as solicitações acadêmicas ficam aguardando a confirmação do e-mail. Verificar cria solicitações SUBMITTED; somente a coordenação responsável pode aprovar cada curso. Troca de e-mail exige senha atual e confirmação do novo endereço; até lá o acesso anterior permanece. Confirmar a troca ou redefinir a senha revoga sessões e tokens pendentes.

A validade de recuperação foi verificada com relógio controlado: 3.599.999 ms aceita, 3.600.000 ms e posteriores recusam. Uso único e duas redefinições simultâneas também foram testados em MongoDB efêmero. A suíte da interface percorre o link, redefine e verifica a revogação, sem enviar a um provedor externo.

Foi feito o pedido autorizado para um destinatário Gmail, com resposta HTTP 202 genérica. Isso não comprova existência de conta nem envio. O transporte continua restrito à captura `@profly.test`, sem relay e sem remetente real autenticado; nenhuma entrega ao Gmail foi confirmada. Não registrar endereço pessoal ou credenciais nos documentos de teste.

## Envio institucional futuro

Depois da aprovacao da faculdade, obter servidor SMTP, remetente autorizado e autenticacao. Alterar SMTP_HOST/PORT/FROM/USER/PASSWORD e SMTP_SECURITY (implicit para TLS direto, normalmente 465; starttls para upgrade obrigatorio, normalmente 587). Usar dominio/origem HTTPS, validar DNS/autenticacao do remetente e testar com destinatario autorizado. Nenhum provedor externo foi habilitado nesta entrega.

Como alternativa temporaria, uma conta Gmail do projeto pode ser avaliada. Gmail e um servico do Google, separado da biblioteca open source. Possui [limites de envio](https://support.google.com/mail/answer/22839?hl=pt-BR). SMTP com senha de app depende de [verificacao em duas etapas e disponibilidade da opcao na conta](https://support.google.com/accounts/answer/185833?hl=pt-BR); contas organizacionais podem restringi-la. A entrada de credenciais deve ocorrer localmente, sem senha no chat ou no Git. OAuth2 e uma evolucao possivel; nao foi implementado neste adaptador inicial.

## Verificacao e limites

REQ-01/02/03/12/13, CASE-001/004/009/051/053. Testes usam somente enderecos sinteticos, SMTP em porta loopback efemera e MongoDB efemero isolado. Cobrem configuracao, recusa de plaintext externo, TLS/certificado obrigatorios nas opcoes, links sem query com token, HTML/texto, um destinatario, rejeicao SMTP e fluxo HTTP completo de verificacao/reset com revogacao de sessao e ausencia de aprovacao academica.

Nao foram testados TLS/autenticacao de provedor real, entrega externa, spam/bounces nem reputacao do remetente. Ainda faltam fila persistente/outbox, retentativas e monitoramento de entregas. O envio atual e sincrono; em falha retorna 503. A resposta de recuperacao e generica quando o servico esta funcional; a diferenca de resposta em indisponibilidade do provedor ainda deve ser revista no endurecimento contra enumeracao de contas antes de producao. As regras de aprovacao academica continuam independentes do e-mail.
