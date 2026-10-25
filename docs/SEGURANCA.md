# Segurança do ambiente

Revisão em 24/10/2026. Esta é uma base de proteção para desenvolvimento e avaliação; **o aplicativo ainda não está pronto para receber dados institucionais reais**.

## Demonstração e acesso público

A interface usa a API por padrão, com sessão de servidor e autorização por curso. A demonstração local anterior exige `VITE_DEMO_MODE=true`; suas contas e permissões locais não autenticam no servidor. `src/app/EntryApp.tsx` mantém a barreira de loopback em ambos os modos até homologação. Um domínio público ou endereço de rede mostra que o acesso institucional ainda não foi configurado. Essa barreira não substitui autenticação.

Vite inicia em 127.0.0.1:5174 com porta estrita. A prévia do build também utiliza loopback. Nenhum serviço ou banco foi publicado durante esta revisão.

## Proteções verificadas

- API: cookie HttpOnly e SameSite=Strict; Secure em produção; tokens opacos derivados e expiração conferida no servidor; proteção CSRF em comandos autenticados; autorização por perfil e curso.
- API: respostas sob /api/ recebem Cache-Control: no-store, inclusive em erros. Origem fora da lista é recusada. Comandos com Fetch Metadata cross-site sem origem também são recusados, sem impedir clientes de servidor que não enviam esses cabeçalhos.
- API: Helmet, limite de corpo, schemas estritos, mensagens sem segredos e limite de tentativas nas rotas de identidade. A limitação atual usa memória por instância; várias réplicas exigem armazenamento compartilhado e configuração de proxy revisada.
- Prévia do front-end: Content-Security-Policy com scripts locais, conexões apenas à própria origem e à BrasilAPI, bloqueio de objetos e enquadramento; nosniff, Referrer-Policy e Permissions-Policy. Estilos inline continuam necessários para a grade dinâmica. Scripts inline não são liberados no build.
- Arquivos: backend/.env é ignorado pelo Git e sua leitura via Vite retorna 403. Valores não foram impressos. Nenhuma credencial foi enviada ao serviço de auditoria.
- Recuperação: a demonstração informa indisponibilidade de envio; não afirma que um e-mail foi enviado nem altera a senha. A API tem token expirável, uso único, revogação de sessões e adaptador SMTP, validado com captura local fictícia. Fora de loopback, exige TLS; remetente e origem dos links vêm do ambiente do servidor. As telas estão integradas; falta configurar o remetente real e homologar a operação. Detalhes e limites em [E-mail no backend](EMAIL_BACKEND.md).
- Cadastro: termos e ciência de privacidade começam desmarcados; abrir os documentos não marca as opções. A versão e o instante de aceite são registrados atomicamente no servidor no cadastro conectado; a demonstração mantém seu armazenamento local separado. As minutas ainda dependem de revisão institucional.

## Evidência desta revisão

- API: 9 testes unitários e 22 de integração passaram, sem pulos. Integração em MongoDB efêmero com replica set, sem ler .env e sem escrever no banco institucional.
- Checagens HTTP locais: build responde 200 com os cabeçalhos previstos; backend/.env é recusado com 403. Login do build renderizado no Chrome sem erros de console observados.
- Dependências de produção: consulta do lockfile do front-end ao endpoint oficial de advisories do npm, 7 pacotes; pnpm audit --prod no back-end, 79 dependências. Nenhum aviso conhecido retornado no momento da consulta. Não é evidência de ausência de vulnerabilidades nem auditoria completa das dependências de desenvolvimento.
- Testes de interface e verificações de tipos/lint/build constam em [STATUS.md](validation/STATUS.md).

## Antes de uso institucional

Manter o modo conectado e não habilitar demonstração na hospedagem. Configurar envio real de e-mail, origem HTTPS, identidade do controlador e revisão das minutas; revisar retenção e armazenamento privado dos documentos. Configurar os mesmos cabeçalhos do front-end no servidor de hospedagem: os headers de vite preview não configuram automaticamente uma hospedagem externa. Não publicar .env, uploads privados ou o diretório do projeto como arquivos estáticos.

Publicação, histórico, atestados, árvore/score e notificações possuem fluxos conectados e testes isolados; pesos/regras e políticas de privacidade continuam propostas. Certificações estruturadas como anexos acadêmicos separados não fazem parte desta entrega. Não há validação de produção integrada, teste de penetração completo, dispositivo iOS real ou infraestrutura de hospedagem nesta entrega.

## Referências técnicas

- [Content Security Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
- [Rate limit — documentação oficial do plugin Fastify](https://github.com/fastify/fastify-rate-limit).

## Controles da integração em 25/10/2026

Cadastro completo persiste perfil, aceites e intenção de curso antes da confirmação; ativar identidade cria solicitações pendentes, sem conceder aprovação. Trocar e-mail exige senha atual e prova do novo endereço. Recuperação foi testada no limite exato de uma hora, uso único e consumo concorrente; redefinir revoga sessões e tokens pendentes. CSRF fica somente em memória na interface.

Foto e atestado são validados por decodificação real e permanecem privados. Cada download verifica o autor ou coordenador do curso selecionado e é auditado. PDF ainda não aceito; operação com dados de saúde reais exige política institucional. Escritas de planejamento usam guarda transacional e versões; publicação mantém cópias imutáveis e preserva o histórico passado.

Não há entrega externa de e-mail confirmada. Envio síncrono ainda precisa de outbox, retentativas e endurecimento contra enumeração durante falhas do SMTP. Recuperação funciona e possui expiração testada; isso não encerra auditoria de segurança. Limites por instância, escalabilidade, backups/restore, retenção, infraestrutura HTTPS e teste de penetração permanecem pendentes. Evidências atuais em [STATUS.md](validation/STATUS.md), que complementam as revisões históricas acima.

## Revisão de CORS e TLS local em 25/10/2026

Origens exatas deduplicadas, sem wildcard; rejeição explícita antes do preflight, inclusive null e origem parecida com a legítima. CORS declara GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS e somente Content-Type/X-CSRF-Token, com credenciais e preflight estrito. Helmet precede o guard de origem. HSTS é exclusivo de produção, sem preload e sem estender automaticamente a subdomínios. COOKIE_SECURE=true habilita o cookie seguro no HTTPS local e não pode ser false em produção.

Vite local aceita PFX privado opcional, mínimo TLS1.2, host loopback, sem CORS aberto de fontes e com bloqueio de arquivos privados. A prévia HTTPS foi exercitada com TLS1.3, verificação explícita do certificado e nome, cookie Secure/HttpOnly/SameSite=Strict, recusa de escrita sem CSRF, origens hostis e leituras estáticas privadas403. Não foi usado bypass de certificado.

A instalação de confiança iniciada durante a preparação foi desfeita após confirmação acidental do usuário; ausência do certificado específico nos stores foi conferida. O navegador não tem confiança configurada por esta entrega. Detalhes em [HTTPS_LOCAL.md](HTTPS_LOCAL.md). Isso não configura TLS do domínio institucional, envio real de e-mail, disponibilidade do Atlas ou auditoria completa de segurança.
