# Nexa Eletrônicos

Loja online de eletrônicos com catálogo, carrinho, checkout, área do cliente e painel administrativo.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — signs the HttpOnly administrative session cookie
- Optional env: `ADMIN_BOOTSTRAP_SECRET` — one-time key for configuring the first administrator; when absent, `SESSION_SECRET` is used. Store it only in Replit Secrets.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/web/src/` — interface da loja, páginas, carrinho e painel administrativo
- `artifacts/api-server/src/routes/store.ts` — catálogo, pedidos, frete, perfil e métricas
- `lib/api-spec/openapi.yaml` — contrato fonte das rotas e tipos da aplicação
- `lib/db/src/schema/` — tabelas de produtos, perfis, pedidos e itens de pedido
- `artifacts/web/public/images/` — imagens originais dos produtos do catálogo inicial

## Architecture decisions

- O catálogo e os pedidos usam PostgreSQL com Drizzle para que alterações feitas no painel persistam após recarregar.
- A cotação de frete é isolada em uma camada de opções; o fluxo atual funciona com cotações locais enquanto a conta de uma transportadora não é conectada.
- A especificação OpenAPI permanece como fonte única para gerar os hooks React Query e os validadores do servidor.

## Product

- Navegação por destaques e catálogo com busca e categorias.
- Detalhes do produto, carrinho local e checkout com opções de entrega.
- Perfil editável e histórico de pedidos.
- Painel administrativo com métricas e CRUD de produtos.
- O primeiro administrador é configurado uma única vez em `/admin` com a chave de inicialização do ambiente; o app não cria credenciais padrão e não reabre essa etapa depois de concluída.

## User preferences

_Nenhuma preferência registrada._

## Gotchas

- Depois de alterar `lib/api-spec/openapi.yaml`, execute o codegen antes de usar os hooks atualizados.
- O catálogo inicial depende dos arquivos em `artifacts/web/public/images/`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
