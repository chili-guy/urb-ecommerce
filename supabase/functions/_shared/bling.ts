// Helpers compartilhados entre as Edge Functions da integração Bling.
// Credenciais (client id/secret) vêm de variáveis de ambiente (secrets do
// projeto Supabase) — nunca ficam no código nem no frontend.

export const BLING_TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";
export const BLING_PRODUCTS_URL = "https://www.bling.com.br/Api/v3/produtos";

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
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<BlingTokenResponse> {
  const res = await fetch(BLING_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
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
      Accept: "application/json",
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
