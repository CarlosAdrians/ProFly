# Segurança do ambiente

Revisão em 24/10/2026. Esta é uma base de proteção para desenvolvimento e avaliação; **o aplicativo ainda não está pronto para receber dados institucionais reais**.

## Demonstração e acesso público

A interface usa adaptadores de navegador e uma sessão demonstrativa. As permissões dessa interface não são uma fronteira de autorização. O arquivo main.tsx permite a demonstração somente em localhost, 127.0.0.1 e IPv6 de loopback, com comparação exata. Um domínio público ou endereço de rede mostra que o acesso institucional ainda não foi configurado. Essa barreira evita a publicação acidental da experiência demonstrativa; não substitui autenticação no servidor e pode ser alterada por quem controla o navegador.

Vite inicia em 127.0.0.1:5174 com porta estrita. A prévia do build também utiliza loopback. Nenhum serviço ou banco foi publicado durante esta revisão.

## Proteções verificadas

- API: cookie HttpOnly e SameSite=Strict; Secure em produção; tokens opacos derivados e expiração conferida no servidor; proteção CSRF em comandos autenticados; autorização por perfil e curso.
- API: respostas sob /api/ recebem Cache-Control: no-store, inclusive em erros. Origem fora da lista é recusada. Comandos com Fetch Metadata cross-site sem origem também são recusados, sem impedir clientes de servidor que não enviam esses cabeçalhos.
- API: Helmet, limite de corpo, schemas estritos, mensagens sem segredos e limite de tentativas nas rotas de identidade. A limitação atual usa memória por instância; várias réplicas exigem armazenamento compartilhado e configuração de proxy revisada.
- Prévia do front-end: Content-Security-Policy com scripts locais, conexões apenas à própria origem e à BrasilAPI, bloqueio de objetos e enquadramento; nosniff, Referrer-Policy e Permissions-Policy. Estilos inline continuam necessários para a grade dinâmica. Scripts inline não são liberados no build.
- Arquivos: backend/.env é ignorado pelo Git e sua leitura via Vite retorna 403. Valores não foram impressos. Nenhuma credencial foi enviada ao serviço de auditoria.
- Recuperação: a demonstração informa indisponibilidade de envio; não afirma que um e-mail foi enviado nem altera a senha. A API tem token expirável, uso único, revogação de sessões e adaptador SMTP, validado com captura local fictícia. Fora de loopback, exige TLS; remetente e origem dos links vêm do ambiente do servidor. Falta configurar o provedor institucional e integrar a tela. Detalhes e limites em [E-mail no backend](EMAIL_BACKEND.md).
- Cadastro: termos e ciência de privacidade começam desmarcados; abrir os documentos não marca as opções. A versão e o instante de aceite são registrados no cadastro demonstrativo. As minutas ainda dependem de revisão institucional.

## Evidência desta revisão

- API: 9 testes unitários e 22 de integração passaram, sem pulos. Integração em MongoDB efêmero com replica set, sem ler .env e sem escrever no banco institucional.
- Checagens HTTP locais: build responde 200 com os cabeçalhos previstos; backend/.env é recusado com 403. Login do build renderizado no Chrome sem erros de console observados.
- Dependências de produção: consulta do lockfile do front-end ao endpoint oficial de advisories do npm, 7 pacotes; pnpm audit --prod no back-end, 79 dependências. Nenhum aviso conhecido retornado no momento da consulta. Não é evidência de ausência de vulnerabilidades nem auditoria completa das dependências de desenvolvimento.
- Testes de interface e verificações de tipos/lint/build constam em [STATUS.md](validation/STATUS.md).

## Antes de uso institucional

Integrar todas as telas à API e remover a credencial/sessão demonstrativa. Configurar envio real de e-mail, origem HTTPS, identidade do controlador e revisão das minutas; revisar retenção e armazenamento privado dos documentos. Configurar os mesmos cabeçalhos do front-end no servidor de hospedagem: os headers de vite preview não configuram automaticamente uma hospedagem externa. Não publicar .env, uploads privados ou o diretório do projeto como arquivos estáticos.

Publicação de escalas, histórico, certificados na interface, atestados e árvore/score ainda têm trabalho pendente. Não há validação de produção integrada, teste de penetração completo, dispositivo iOS real ou infraestrutura de hospedagem nesta entrega.

## Referências técnicas

- [Content Security Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
- [Rate limit — documentação oficial do plugin Fastify](https://github.com/fastify/fastify-rate-limit).
