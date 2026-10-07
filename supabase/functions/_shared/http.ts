// Pedaços comuns das Edge Functions chamadas pelo painel admin: CORS, resposta
// JSON, cliente com a service_role e a checagem "quem chamou é da equipe?".

import { createClient } from "jsr:@supabase/supabase-js@2";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Ignora a RLS — só usar no servidor, nunca devolver esse cliente pro navegador. */
export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/** Confere o JWT do chamador com is_staff() (a mesma regra do painel). */
export async function authenticateStaff(req: Request): Promise<{ isStaff: boolean; userId: string | null }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isStaff } = await caller.rpc("is_staff");
  if (!isStaff) return { isStaff: false, userId: null };
  const { data } = await caller.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  return { isStaff: true, userId: data.user?.id ?? null };
}
