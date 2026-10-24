# Back-end do ProFly

API Node.js com TypeScript, Fastify, validacao Zod e driver oficial do MongoDB. Modulo independente do front-end, com dependencias e lockfile proprios.

## Estrutura

```text
src/config.ts          Configuracao validada, sem credenciais padrao
src/database.ts        Conexao, indices e fronteira de transacao
src/app.ts             Composicao HTTP, protecoes, erros e health checks
src/server.ts          Inicializacao e encerramento
src/shared/            Erros e validacao de contratos
test/                  Testes unitarios e integracao explicitamente habilitada
scripts/               Exportacao do contrato OpenAPI
docs/openapi.json      Contrato gerado das rotas implementadas
```

## Executar

Requisitos: Node.js 24+, pnpm 11.25 e MongoDB com suporte a transacoes. O integrante responsavel pelo banco deve fornecer URI e banco de desenvolvimento apropriados.

Na pasta backend:

```bash
pnpm install
```

Copiar .env.example para .env local e ajustar os valores com o responsavel pelo banco. O exemplo nao contem credenciais reais. Depois:

```bash
pnpm dev
```

O servidor recusa configuracao incompleta e MongoDB standalone sem suporte a transacoes. Nao troca uma falha do banco por persistencia simulada.

## Verificacoes

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test:unit
pnpm format:check
pnpm openapi
```

Os testes unitarios nao iniciam banco nem fazem download. A integracao precisa ser habilitada explicitamente. Em PowerShell:

```powershell
$env:PROFLY_RUN_INTEGRATION = '1'
pnpm test:integration
```

Esse comando inicia um replica set MongoDB efemero, local, usado exclusivamente pelos testes, e encerra seus processos ao terminar. O primeiro uso pode baixar um binario oficial. Nenhuma credencial da faculdade e utilizada. O banco de teste precisa ter nome terminado em _test; testes padrao nao usam banco de producao.

## Rotas disponiveis na base

| Rota | Funcao |
| --- | --- |
| GET /health/live | Processo HTTP respondendo. |
| GET /health/ready | Confere acesso ao MongoDB. |
| GET /openapi.json | Especificacao gerada das rotas reais. |

Rotas funcionais serao documentadas conforme forem implementadas. Health checks aprovados nao significam que todos os requisitos do produto estejam implementados.

## Decisoes tecnicas

As validacoes rejeitam campos extras e tipos incorretos, sem remover silenciosamente dados enviados pelo cliente. Essa configuracao foi conferida na [documentacao do Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

As operacoes consistentes entre documentos usam a fronteira de transacao do [driver oficial do MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/). As regras de concorrencia dos modulos ainda precisam de implementacao e testes especificos.

Scripts de dependencias sao permitidos individualmente em pnpm-workspace.yaml: esbuild para a ferramenta TypeScript; o download automatico do MongoDB no postinstall fica desabilitado, sendo feito somente na integracao explicita. A politica segue o [controle de builds do pnpm](https://github.com/pnpm/pnpm.io/blob/main/docs/settings/build.md).

O estado do projeto e dos testes esta em [STATUS.md](../docs/validation/STATUS.md). As regras de produto permanecem na [spec](../docs/specs/BACKEND_V1.md).
