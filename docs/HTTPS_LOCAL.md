# HTTPS local do ProFly

A configuração HTTPS é opcional e serve somente desenvolvimento em loopback. O modo HTTP existente continua disponível. O certificado local não é certificado institucional nem configura domínio/hospedagem.

## Configuração privada

O Vite aceita um PFX com chave privada e senha por variáveis do processo Node. Não use prefixo VITE_, pois ele publica valores no cliente. Mantenha o certificado fora do repositório e um arquivo ignorado `.env.https.local` na raiz:

```dotenv
PROFLY_TLS_PFX=C:/certificados-privados/profly-local.pfx
PROFLY_TLS_PFX_PASSWORD=senha-definida-somente-localmente
PROFLY_API_TARGET=http://127.0.0.1:3335
```

O par certificado/senha é obrigatório no comando HTTPS; falha de configuração encerra a execução. Inicie com `npm run dev:https`. A interface atende `https://localhost:5176`; a API pode permanecer HTTP em loopback atrás do proxy. Nunca exponha esse trecho HTTP em uma rede externa. O certificado precisa incluir localhost nos nomes válidos. O mínimo configurado é TLS 1.2.

Nesta máquina, o material privado de desenvolvimento está em `work/https-local` fora do checkout, com permissões de usuário atual e SYSTEM; senha apenas no arquivo privado ignorado. O certificado foi gerado com ECDSA P-256/SHA-256, uso de servidor, CA=false, nomes localhost/127.0.0.1/::1 e validade até 24/11/2026. Renovação exige gerar outro certificado e atualizar a configuração privada; não há renovação automática.

## Confiança do navegador

Este comando **não instala certificados** nem altera a confiança do Windows. O certificado autoassinado local não tem confiança pública. Não ignore um aviso de segurança do navegador. Para uso institucional, a hospedagem deverá terminar TLS com certificado válido para o domínio aprovado pela instituição.

Durante a preparação local houve confirmação acidental de instalação. A pedido do usuário, o certificado específico foi removido de CurrentUser/Root; a remoção foi verificada, sem entrada correspondente em CurrentUser/CA ou LocalMachine/Root. Não há confiança local instalada por esta entrega. Não repetir a importação automaticamente.

O teste técnico validou TLS, nome do servidor e certificado usando explicitamente apenas o certificado público como âncora do cliente de teste. Não usou rejectUnauthorized=false nem ignorou validação. Isso comprova o transporte da prévia, mas não comprova confiança do navegador.

## API e prévia isolada

Para a prévia sintética HTTPS, na pasta backend execute, em PowerShell:

```powershell
$env:PROFLY_RUN_INTEGRATION='1'
$env:PROFLY_PREVIEW_HTTPS='1'
node --import tsx scripts/dev-isolated.ts
```

Isso inicia API loopback3335 e MongoDB efêmero separado da prévia HTTP3334. Exige a captura Mailpit local para e-mails fictícios. Não lê .env nem popula o banco institucional. As contas sintéticas são as descritas em [INTERFACE_API.md](INTERFACE_API.md), mas os dados das duas prévias são independentes. Encerre/reinicie uma prévia somente após concluir o checklist dela.

Na API normal, configure ALLOWED_ORIGINS com origens HTTPS exatas, incluindo a porta quando houver. COOKIE_SECURE=true ativa Secure no desenvolvimento HTTPS; em produção Secure é obrigatório e não pode ser desligado. HTTP não deve ser usado com a sessão da configuração HTTPS. Use localhost na prévia HTTPS para separar o cookie da prévia HTTP em 127.0.0.1; cookies não são isolados por porta.

O CORS permite somente origens configuradas, métodos explícitos e headers Content-Type/X-CSRF-Token. Continua sendo necessário autenticar e autorizar cada recurso; CORS não substitui CSRF ou autorização. Arquivos .env, certificados e chaves têm leitura estática bloqueada pelo Vite. Configure controles equivalentes na hospedagem futura.

Referências: [HTTPS do Vite](https://vite.dev/config/server-options#server-https) e [CORS do Fastify](https://github.com/fastify/fastify-cors).
