// Puxa o estoque atual da Bling e atualiza products.stock no Supabase,
// casando pelo SKU (products.sku == codigo do produto na Bling).
//
// Chamado pelo botão "Sincronizar agora" do admin (passa o JWT do usuário
// logado) — verifica is_staff() antes de tocar em qualquer coisa.
//
// ATENÇÃO: o formato exato da resposta de /estoques/saldos (nomes de campo)
// foi escrito com base na documentação pública da Bling v3, mas não foi
// testado contra uma conta real ainda — primeira sincronização deve ser
// conferida com cuidado (o campo `lastSyncError` do bling_connection mostra
// o que falhou, se falhar).
//
// Deploy: supabase functions deploy bling-sync-stock

import { createClient } from "jsr:@supabase/supabase-js@2";
import { BLING_PRODUCTS_URL, refreshAccessToken } from "../_shared/bling.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type BlingConnection = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

async function getValidAccessToken(
  serviceClient: ReturnType<typeof createClient>,
): Promise<string> {
  const { data: conn, error } = await serviceClient
    .from("bling_connection")
    .select("access_token, refresh_token, token_expires_at")
    .eq("id", 1)
    .maybeSingle<BlingConnection>();
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

type BlingProduto = {
  id: number;
  codigo?: string | null;
  estoque?: { saldoVirtualTotal?: number } | null;
};

/** Isolado de propósito — é a parte a conferir contra uma resposta real da Bling. */
function extractStock(produto: BlingProduto): number | null {
  const saldo = produto.estoque?.saldoVirtualTotal;
  return typeof saldo === "number" ? Math.max(0, Math.floor(saldo)) : null;
}

async function fetchAllBlingProducts(accessToken: string): Promise<BlingProduto[]> {
  const all: BlingProduto[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const url = new URL(BLING_PRODUCTS_URL);
    url.searchParams.set("pagina", String(pagina));
    url.searchParams.set("limite", "100");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Bling /produtos falhou (${res.status}): ${await res.text()}`);
    const json = await res.json();
    const page: BlingProduto[] = json.data ?? [];
    all.push(...page);
    if (page.length < 100) break;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isStaff } = await callerClient.rpc("is_staff");
  if (!isStaff) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let matched = 0;
  let updated = 0;
  let skippedNoStock = 0;

  try {
    const accessToken = await getValidAccessToken(serviceClient);
    const blingProducts = await fetchAllBlingProducts(accessToken);

    const stockBySku = new Map<string, number>();
    for (const p of blingProducts) {
      if (!p.codigo) continue;
      const stock = extractStock(p);
      if (stock === null) {
        skippedNoStock++;
        continue;
      }
      stockBySku.set(p.codigo.trim(), stock);
    }

    const { data: localProducts, error: localErr } = await serviceClient
      .from("products")
      .select("id, sku")
      .not("sku", "is", null);
    if (localErr) throw localErr;

    for (const product of localProducts ?? []) {
      const sku = (product.sku as string | null)?.trim();
      if (!sku || !stockBySku.has(sku)) continue;
      matched++;
      const { error: updateErr } = await serviceClient
        .from("products")
        .update({ stock: stockBySku.get(sku) })
        .eq("id", product.id);
      if (!updateErr) updated++;
    }

    await serviceClient
      .from("bling_connection")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "ok",
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return new Response(
      JSON.stringify({ ok: true, blingProducts: blingProducts.length, matched, updated, skippedNoStock }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    await serviceClient
      .from("bling_connection")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "error", last_sync_error: message })
      .eq("id", 1);
    console.error("[bling-sync-stock]", err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: message === "not_connected" ? 400 : 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
