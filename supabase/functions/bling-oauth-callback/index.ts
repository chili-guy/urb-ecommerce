// Recebe o redirect do OAuth da Bling depois que o admin autoriza o app,
// troca o `code` por um access_token/refresh_token e guarda na tabela
// bling_connection (só a service_role, usada aqui, consegue escrever nela).
//
// URL de redirect a cadastrar no app da Bling (developer.bling.com.br):
//   https://<project-ref>.supabase.co/functions/v1/bling-oauth-callback
//
// Deploy: supabase functions deploy bling-oauth-callback --no-verify-jwt
// (--no-verify-jwt porque quem chama essa URL é a própria Bling, sem JWT do Supabase)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { exchangeCodeForToken } from "../_shared/bling.ts";

const ADMIN_URL = Deno.env.get("ADMIN_REDIRECT_URL") ?? "https://ur3.com.br/admin";

function redirect(status: "connected" | "error", message?: string): Response {
  const url = new URL(ADMIN_URL);
  url.searchParams.set("bling", status);
  if (message) url.searchParams.set("bling_msg", message);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return redirect("error", errorParam);
  }
  if (!code) {
    return redirect("error", "missing_code");
  }

  try {
    const token = await exchangeCodeForToken(code);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("bling_connection").upsert({
      id: 1,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return redirect("connected");
  } catch (err) {
    console.error("[bling-oauth-callback]", err);
    return redirect("error", err instanceof Error ? err.message : "unknown_error");
  }
});
