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
   - `supabase/migrations/0003_oauth_profile_name.sql`
   - `supabase/migrations/0004_feature_pack.sql` — upload de imagem (bucket
     `product-images`), especificações técnicas, contador de acessos,
     endereços salvos do cliente e status de pedido gerenciável.
   - `supabase/migrations/0005_scope_pack.sql` — subcategoria/SKU/variações de
     produto, galeria de imagens extra, vídeo do YouTube, avaliações de
     clientes, cupons de desconto (com validação no `create_order`) e a
     função `admin_customers_summary()` (aba Clientes do painel).
   Todos são idempotentes: podem ser reexecutados sem erro. O front tolera um
   banco ainda sem a `0005` (checkout sem cupom continua funcionando; as
   features novas ficam inertes até a migração rodar).
3. **Storage**: a migração `0004` já cria o bucket público `product-images`
   com as políticas certas (leitura liberada, escrita só para a equipe).
   Nada a fazer manualmente.
4. **Authentication → Sign In / Providers → Email**: em produção, deixe
   *Confirm email* ligado (e configure um SMTP em *Project Settings → Auth*).
   Em desenvolvimento pode desligar para agilizar.
5. **Login com Google** (opcional): o `0003` já ajusta o trigger de perfil.
   Ative o provedor:
   - Google Cloud Console → *APIs & Services → Credentials* → *Create
     credentials → OAuth client ID* → tipo **Web application**.
   - Em *Authorized redirect URIs* adicione:
     `https://<seu-ref>.supabase.co/auth/v1/callback`
   - Copie *Client ID* e *Client secret* para Supabase →
     *Authentication → Sign In / Providers → Google* → cole e salve.
   - Em *Authentication → URL Configuration → Redirect URLs* adicione a URL
     do site (ex. `https://urb-ecommerce.vercel.app/**` e
     `http://localhost:5173/**` para dev).
6. **Catálogo de exemplo** (opcional), do seu computador:
   ```bash
   SUPABASE_URL="https://xxxx.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="..." \
   pnpm --filter @workspace/scripts run seed
   ```
   > A `service_role` key ignora a RLS — nunca versione nem exponha no front.
7. **Primeiro admin**: cadastre-se no site, pegue seu UUID em
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
   | `VITE_GA4_MEASUREMENT_ID` | opcional — Google Analytics 4 |
   | `VITE_GTM_CONTAINER_ID` | opcional — Google Tag Manager |
   | `VITE_META_PIXEL_ID` | opcional — Pixel do Meta Ads |
   | `VITE_GOOGLE_ADS_ID` | opcional — conversão do Google Ads |

   As 4 de rastreamento são independentes: preencha só as que o cliente usa.
   Sem nenhuma, `lib/analytics.ts` não carrega nenhum script de terceiro.

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
- **Gateway de pagamento** — o checkout finaliza sem cobrança real. Precisa o
  cliente escolher provedor (Mercado Pago / PagSeguro / Asaas / Pagar.me) e
  abrir conta; a integração via API (sem redirecionar para fora do site) exige
  uma Edge Function no Supabase para criar a cobrança e receber o webhook de
  confirmação — o front sozinho não pode confirmar pagamento com segurança.
- **Frete real (Melhor Envio / Frenet / Jadlog)** — `artifacts/web/src/lib/shipping.ts`
  e o widget de frete do produto usam cotação local simulada. Precisa o token
  da conta escolhida + uma Edge Function para cotar e gerar etiqueta.
- **Sincronização de estoque com o Bling** — precisa registrar um app OAuth2 no
  Bling e credenciais da conta do cliente; hoje o estoque é só o que está no
  Supabase (gerenciado manualmente pelo painel).
- **Rastreamento real** — a estrutura (GA4/GTM/Meta Pixel/Google Ads) já está
  pronta em `lib/analytics.ts`; falta só os IDs reais do cliente nas env vars
  acima.
