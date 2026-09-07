# Deploy

Arquitetura: **front-end estático (Vite/React) + Supabase** (Postgres + Auth +
RLS). Não há servidor próprio — o navegador fala direto com o Supabase.

```
artifacts/web        SPA React (o app inteiro)
supabase/migrations  schema + RLS + funções (rodar no SQL Editor)
scripts              seed do catálogo via service_role key
```

## 1. Supabase (uma vez)

1. Crie o projeto em https://supabase.com.
2. **SQL Editor** → rode, nesta ordem, o conteúdo de:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_create_order.sql`
3. **Authentication → Sign In / Providers → Email**: em produção, deixe
   *Confirm email* ligado (e configure um SMTP em *Project Settings → Auth*).
   Em desenvolvimento pode desligar para agilizar.
4. **Catálogo de exemplo** (opcional), do seu computador:
   ```bash
   SUPABASE_URL="https://xxxx.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="..." \
   pnpm --filter @workspace/scripts run seed
   ```
   > A `service_role` key ignora a RLS — nunca versione nem exponha no front.
5. **Primeiro admin**: cadastre-se no site, pegue seu UUID em
   *Authentication → Users* e rode no SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role) values ('<seu-uuid>', 'admin');
   ```

## 2. Vercel

1. New Project → importe `chili-guy/urb-ecommerce` → Framework **Other**
   (a Vercel lê o `vercel.json`; build e output já vêm dele).
2. **Environment Variables** (Production + Preview):

   | Nome | Valor |
   | --- | --- |
   | `VITE_SUPABASE_URL` | URL do projeto Supabase |
   | `VITE_SUPABASE_ANON_KEY` | a *anon/publishable* key (Project Settings → API) — pública por design |

3. Deploy. A cada push no `main` a Vercel rebuilda.

## Rodar local

```bash
cp artifacts/web/.env.example artifacts/web/.env   # preencha as 2 variáveis
pnpm install
pnpm --filter @workspace/web run dev               # http://localhost:5173
```

## Ainda pendente (não bloqueia o deploy)

- **SMTP** para os e-mails de confirmação/recuperação (hoje usa o mailer padrão
  do Supabase, com limite baixo).
- **Gateway de pagamento** — o checkout finaliza sem cobrança real.
- **Frete real (Melhor Envio)** — `artifacts/web/src/lib/shipping.ts` usa
  cotação local simulada.
