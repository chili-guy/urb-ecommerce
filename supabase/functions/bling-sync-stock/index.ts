// Compara o estoque da Bling com o do site (casando por SKU) e, no modo
// "sync", atualiza products.stock. No modo "check" (conferência) só calcula e
// registra o resultado, sem alterar nenhum produto.
//
// Chamado pelo painel admin (passa o JWT do usuário logado) — verifica
// is_staff() antes de tocar em qualquer coisa. Grava o resultado em
// bling_stock_items / bling_sync_runs (migração 0009) pro painel mostrar.
//
// Deploy: supabase functions deploy bling-sync-stock

import { createClient } from "jsr:@supabase/supabase-js@2";
import { BLING_PRODUCTS_URL, refreshAccessToken } from "../_shared/bling.ts";
import { diffStock, type BlingProductLite, type LocalProductLite } from "../_shared/stock-diff.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "sync" | "check";

type BlingConnection = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function getValidAccessToken(serviceClient: ReturnType<typeof createClient>): Promise<string> {
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

async function fetchAllBlingProducts(accessToken: string): Promise<BlingProductLite[]> {
  const all: BlingProductLite[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const url = new URL(BLING_PRODUCTS_URL);
    url.searchParams.set("pagina", String(pagina));
    url.searchParams.set("limite", "100");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Bling /produtos falhou (${res.status}): ${await res.text()}`);
    const body = await res.json();
    const page: BlingProductLite[] = body.data ?? [];
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
  if (!isStaff) return json({ error: "forbidden" }, 403);

  let mode: Mode = "sync";
  try {
    const body = await req.json();
    if (body?.mode === "check") mode = "check";
  } catch {
    /* sem corpo = sincronizar */
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: userData } = await callerClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  const triggeredBy = userData.user?.id ?? null;
  const startedAt = new Date().toISOString();

  try {
    const accessToken = await getValidAccessToken(serviceClient);
    const blingProducts = await fetchAllBlingProducts(accessToken);

    const { data: localProducts, error: localErr } = await serviceClient
      .from("products")
      .select("id, sku, stock");
    if (localErr) throw localErr;

    const diff = diffStock((localProducts ?? []) as LocalProductLite[], blingProducts, mode === "sync");

    let updateFailures = 0;
    for (const { id, stock } of diff.toUpdate) {
      const { error } = await serviceClient.from("products").update({ stock }).eq("id", id);
      if (error) {
        updateFailures++;
        console.error("[bling-sync-stock] falha ao atualizar produto", id, error);
        const item = diff.items.find((i) => i.product_id === id);
        if (item) {
          item.applied = false;
          item.site_stock = item.previous_stock;
        }
      }
    }

    // Acompanhamento é melhor-esforço: se a migração 0009 ainda não rodou, a
    // sincronização em si continua valendo.
    const checkedAt = new Date().toISOString();
    const { error: itemsErr } = await serviceClient
      .from("bling_stock_items")
      .upsert(diff.items.map((i) => ({ ...i, checked_at: checkedAt })), { onConflict: "product_id" });
    if (itemsErr) console.error("[bling-sync-stock] bling_stock_items", itemsErr);

    const { error: runErr } = await serviceClient.from("bling_sync_runs").insert({
      started_at: startedAt,
      mode,
      status: updateFailures > 0 ? "error" : "ok",
      products_total: diff.summary.productsTotal,
      matched: diff.summary.matched,
      changed: diff.summary.changed,
      not_found: diff.summary.unmatched,
      bling_only: diff.summary.blingOnly,
      zeroed: diff.summary.zeroed,
      error: updateFailures > 0 ? `${updateFailures} produto(s) não puderam ser atualizados` : null,
      triggered_by: triggeredBy,
    });
    if (runErr) console.error("[bling-sync-stock] bling_sync_runs", runErr);

    await serviceClient
      .from("bling_connection")
      .update({
        last_synced_at: checkedAt,
        last_sync_status: updateFailures > 0 ? "error" : "ok",
        last_sync_error: updateFailures > 0 ? `${updateFailures} produto(s) não puderam ser atualizados` : null,
        updated_at: checkedAt,
      })
      .eq("id", 1);

    return json({
      ok: true,
      mode,
      blingProducts: blingProducts.length,
      ...diff.summary,
      updated: diff.toUpdate.length - updateFailures,
      updateFailures,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[bling-sync-stock]", err);

    await serviceClient.from("bling_sync_runs").insert({
      started_at: startedAt,
      mode,
      status: "error",
      error: message,
      triggered_by: triggeredBy,
    });
    await serviceClient
      .from("bling_connection")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "error", last_sync_error: message })
      .eq("id", 1);

    return json({ ok: false, mode, error: message }, message === "not_connected" ? 400 : 500);
  }
});
