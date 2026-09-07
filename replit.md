# URB Comércio de Eletrônicos

Loja online de eletrônicos: catálogo, carrinho, checkout, conta do cliente e
painel administrativo. **Front-end estático + Supabase** — sem servidor próprio.

## Rodar

- `pnpm install`
- `cp artifacts/web/.env.example artifacts/web/.env` e preencher `VITE_SUPABASE_URL`
  e `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API)
- `pnpm --filter @workspace/web run dev` — http://localhost:5173
- `pnpm run typecheck` — checa web, scripts e mockup-sandbox
- `pnpm run build` — build de produção do `web` (saída em `artifacts/web/dist/public`)

Banco: rode `supabase/migrations/0001_init.sql` e `0002_create_order.sql` no SQL
Editor do Supabase. Seed do catálogo: `pnpm --filter @workspace/scripts run seed`
(precisa de `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Deploy: ver `DEPLOY.md`.

## Stack

- pnpm workspaces, Node 22+, TypeScript 5.9
- Front: Vite 7 + React 19 + Wouter + TanStack Query + Tailwind 4 + shadcn/ui
- Dados/auth: Supabase (`@supabase/supabase-js`) — Postgres, Auth, RLS
- Deploy: Vercel (estático) + Supabase

## Onde as coisas ficam

- `artifacts/web/src/lib/supabase.ts` — cliente único do Supabase
- `artifacts/web/src/lib/api.ts` — hooks React Query sobre o Supabase (produtos,
  perfil, pedidos, métricas via rpc, equipe/papéis)
- `artifacts/web/src/lib/auth-context.tsx` — Supabase Auth + papéis (`user_roles`)
- `artifacts/web/src/lib/shipping.ts` — cotação de frete simulada (client-side)
- `artifacts/web/src/pages/` — Home, Catalog, ProductDetail, Cart, Checkout,
  Account, Admin, e as telas de conta (Login/Register/Forgot/ResetPassword)
- `supabase/migrations/` — schema, RLS, `create_order`, `admin_dashboard_summary`
- `scripts/src/seed.ts` — seed do catálogo (55 produtos) via service_role key
- `artifacts/mockup-sandbox/` — sandbox de design, fora do app da loja

## Modelo de dados (Supabase)

- `products` — catálogo. Leitura pública; escrita só para equipe (`is_staff()`).
- `profiles` — 1 linha por conta, `id = auth.users.id`, criada por trigger no
  cadastro. Cada um lê/edita a sua; equipe lê todas.
- `user_roles` — `admin` / `operator`. Só `admin` gerencia. O 1º admin é
  inserido à mão no SQL Editor.
- `orders` / `order_items` — cliente vê os seus; equipe vê todos. Criados pela
  função `create_order` (totais e baixa de estoque no servidor, atômico).

## Pendências

- SMTP para os e-mails do Supabase Auth
- Gateway de pagamento (checkout finaliza sem cobrança)
- Melhor Envio (frete real)
