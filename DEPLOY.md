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
4. **Login com Google** (opcional): rode `supabase/migrations/0003_oauth_profile_name.sql`
   e ative o provedor:
   - Google Cloud Console → *APIs & Services → Credentials* → *Create
     credentials → OAuth client ID* → tipo **Web application**.
   - Em *Authorized redirect URIs* adicione:
     `https://<seu-ref>.supabase.co/auth/v1/callback`
   - Copie *Client ID* e *Client secret* para Supabase →
     *Authentication → Sign In / Providers → Google* → cole e salve.
   - Em *Authentication → URL Configuration → Redirect URLs* adicione a URL
     do site (ex. `https://urb-ecommerce.vercel.app/**` e
     `http://localhost:5173/**` para dev).
5. **Catálogo de exemplo** (opcional), do seu computador:
   ```bash
   SUPABASE_URL="https://xxxx.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="..." \
   pnpm --filter @workspace/scripts run seed
   ```
   > A `service_role` key ignora a RLS — nunca versione nem exponha no front.
6. **Primeiro admin**: cadastre-se no site, pegue seu UUID em
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
