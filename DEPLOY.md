# Deploy na Vercel

Este repositório já está configurado para a Vercel via [`vercel.json`](./vercel.json):

| Parte | Como é servida |
| --- | --- |
| Loja (SPA React/Vite) | build estático em `artifacts/web/dist/public` |
| API (`/api/*`) | função serverless única em [`api/[...slug].ts`](./api/%5B...slug%5D.ts), que reaproveita a app Express (`artifacts/api-server/src/app.ts`) |
| Rotas do cliente (`/catalogo`, `/conta`, …) | rewrite para `index.html` (SPA) |

## Pré-requisitos

- **Banco Postgres com pooling** — em serverless cada instância abre poucas conexões. Use **Neon**, **Supabase** ou **Vercel Postgres** e pegue a *connection string com pooling* (PgBouncer). O `pool` já usa `max: 1` quando detecta a Vercel.

## Passo a passo

1. **Importar o repo na Vercel**
   - New Project → importe `chili-guy/urb-ecommerce`.
   - Framework Preset: **Other** (a Vercel lê o `vercel.json`).
   - Install Command / Build Command / Output: deixe em branco — vêm do `vercel.json`.
   - Node.js Version (Project Settings → General): **22.x** (ou 24.x se disponível).

2. **Variáveis de ambiente** (Project Settings → Environment Variables), em Production e Preview:

   | Nome | Valor |
   | --- | --- |
   | `DATABASE_URL` | connection string do Postgres (com pooling) |
   | `SESSION_SECRET` | string aleatória longa — assina os cookies de sessão |
   | `APP_URL` | URL pública do site, ex. `https://urb-ecommerce.vercel.app` (usada nos links de redefinição de senha) |
   | `ADMIN_BOOTSTRAP_SECRET` | *(opcional)* chave de uso único para criar o 1º admin em `/admin`; se ausente, usa `SESSION_SECRET` |
   | `PG_POOL_MAX` | *(opcional)* sobrescreve o tamanho do pool (padrão 1 na Vercel) |

   `NODE_ENV=production` a Vercel já define sozinha (cookies passam a `secure`).

3. **Criar o schema no banco de produção** (uma vez, do seu computador):

   ```bash
   DATABASE_URL="<sua connection string>" pnpm --filter @workspace/db run push
   ```

4. **(Opcional) Popular o catálogo de exemplo:**

   ```bash
   DATABASE_URL="<sua connection string>" pnpm --filter @workspace/scripts run seed
   ```

5. **Deploy** — a Vercel builda a cada push no `main`.

6. **Primeiro administrador** — acesse `https://<seu-dominio>/admin` e configure com o `ADMIN_BOOTSTRAP_SECRET`. Essa etapa só acontece uma vez.

## Ainda pendente (não bloqueia o deploy)

- **E-mail real:** os links de redefinição de senha só vão para o log da função ([`mailer.ts`](./artifacts/api-server/src/lib/mailer.ts)). Plugar Resend/SES/SMTP.
- **Gateway de pagamento:** o checkout finaliza sem cobrança real.
- **Frete real (Melhor Envio):** hoje usa cotação local simulada.

## Alternativa

Se a parte serverless der atrito (cold start, limites de conexão), **Railway** ou **Render** rodam o servidor Express como está (`artifacts/api-server`) + um serviço estático para a `artifacts/web`, sem precisar da função. O código não muda.
