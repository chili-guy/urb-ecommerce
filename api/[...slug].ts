import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../artifacts/api-server/src/app";

/**
 * Função serverless da Vercel que serve toda a API (`/api/*`).
 *
 * Reaproveita a mesma app Express usada no servidor local — apenas não chama
 * `app.listen`, quem cuida do ciclo de requisição é a Vercel.
 *
 * Variáveis de ambiente necessárias no projeto Vercel:
 *   DATABASE_URL   – Postgres (use um provedor serverless: Neon, Supabase,
 *                    Vercel Postgres…); rode `pnpm --filter @workspace/db run push`
 *                    uma vez contra esse banco.
 *   SESSION_SECRET – assina os cookies de sessão (admin e cliente).
 *   APP_URL        – URL pública do site (ex. https://urb.vercel.app), usada
 *                    nos links de redefinição de senha.
 *   ADMIN_BOOTSTRAP_SECRET – opcional; chave única para criar o 1º admin.
 */
const handler = app as unknown as (
  req: IncomingMessage,
  res: ServerResponse,
) => void;

export default handler;
