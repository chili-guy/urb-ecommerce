// Helpers compartilhados entre as Edge Functions da integração Bling.
// Credenciais (client id/secret) vêm de variáveis de ambiente (secrets do
// projeto Supabase) — nunca ficam no código nem no frontend.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Endereços e cabeçalhos conferidos na documentação oficial (developer.bling.com.br/aplicativos).
export const BLING_TOKEN_URL = "https://api.bling.com.br/Api/v3/oauth/token";
export const BLING_PRODUCTS_URL = "https://api.bling.com.br/Api/v3/produtos";
export const BLING_CATEGORIES_URL = "https://api.bling.com.br/Api/v3/categorias/produtos";

/** A Bling aceita ~3 requisições por segundo; esperar um pouco entre chamadas em sequência. */
export const BLING_PACE_MS = 340;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET na API da Bling; se ela responder 429 (ritmo alto demais), espera e tenta de novo. */
// deno-lint-ignore no-explicit-any
export async function blingGet(url: string, accessToken: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (res.status === 429 && attempt < 3) {
      await sleep(1200 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Bling ${new URL(url).pathname} falhou (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    return res.json();
  }
  throw new Error("Bling: limite de requisições excedido, tente de novo em instantes.");
}

export type BlingTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

function basicAuthHeader(): string {
  const clientId = Deno.env.get("BLING_CLIENT_ID");
  const clientSecret = Deno.env.get("BLING_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("BLING_CLIENT_ID / BLING_CLIENT_SECRET não configurados nos secrets da função.");
  }
  return "Basic " + btoa(`${clientId}:${clientSecret}`);
}

/** Troca o `code` do redirect OAuth por access_token + refresh_token. */
export async function exchangeCodeForToken(code: string): Promise<BlingTokenResponse> {
  const res = await fetch(BLING_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao trocar code por token (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** Usa o refresh_token pra conseguir um access_token novo quando o atual expira. */
export async function refreshAccessToken(refreshToken: string): Promise<BlingTokenResponse> {
  const res = await fetch(BLING_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao renovar token (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

type BlingConnectionRow = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

/** Devolve um access_token válido, renovando (e gravando) se estiver perto de expirar. */
export async function getValidAccessToken(serviceClient: SupabaseClient): Promise<string> {
  const { data: conn, error } = await serviceClient
    .from("bling_connection")
    .select("access_token, refresh_token, token_expires_at")
    .eq("id", 1)
    .maybeSingle<BlingConnectionRow>();
  if (error) throw error;
  if (!conn?.access_token || !conn.refresh_token) {
    throw new Error("not_connected");
  }

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  const expiringSoon = expiresAt - Date.now() < 5 * 60 * 1000; // margem de 5min
  if (!expiringSoon) return conn.access_token;

  const refreshed = await refreshAccessToken(conn.refresh_token);
  await serviceClient
    .from("bling_connection")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  return refreshed.access_token;
}
