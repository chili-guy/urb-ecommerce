// Compara o estoque da Bling com o do site (casando por SKU) e, no modo
// "sync", atualiza products.stock. No modo "check" (conferência) só calcula e
// registra o resultado, sem alterar nenhum produto.
//
// Chamado pelo painel admin (passa o JWT do usuário logado) — verifica
// is_staff() antes de tocar em qualquer coisa. Grava o resultado em
// bling_stock_items / bling_sync_runs (migração 0009) pro painel mostrar.
//
// Deploy: supabase functions deploy bling-sync-stock

import { BLING_PACE_MS, BLING_PRODUCTS_URL, blingGet, getValidAccessToken, sleep } from "../_shared/bling.ts";
import { CORS_HEADERS, authenticateStaff, json, serviceClient } from "../_shared/http.ts";
import { diffStock, type BlingProductLite, type LocalProductLite } from "../_shared/stock-diff.ts";

type Mode = "sync" | "check";

async function fetchAllBlingProducts(accessToken: string): Promise<BlingProductLite[]> {
  const all: BlingProductLite[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const url = new URL(BLING_PRODUCTS_URL);
    url.searchParams.set("pagina", String(pagina));
    url.searchParams.set("limite", "100");
    const body = await blingGet(url.toString(), accessToken);
    const page: BlingProductLite[] = body.data ?? [];
    all.push(...page);
    if (page.length < 100) break;
    await sleep(BLING_PACE_MS);
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const { isStaff, userId: triggeredBy } = await authenticateStaff(req);
  if (!isStaff) return json({ error: "forbidden" }, 403);

  let mode: Mode = "sync";
  try {
    const body = await req.json();
    if (body?.mode === "check") mode = "check";
  } catch {
    /* sem corpo = sincronizar */
  }

  const db = serviceClient();
  const startedAt = new Date().toISOString();

  try {
    const accessToken = await getValidAccessToken(db);
    const blingProducts = await fetchAllBlingProducts(accessToken);

    const { data: localProducts, error: localErr } = await db
      .from("products")
      .select("id, sku, stock");
    if (localErr) throw localErr;

    const diff = diffStock((localProducts ?? []) as LocalProductLite[], blingProducts, mode === "sync");

    let updateFailures = 0;
    for (const { id, stock } of diff.toUpdate) {
      const { error } = await db.from("products").update({ stock }).eq("id", id);
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
    const { error: itemsErr } = await db
      .from("bling_stock_items")
      .upsert(diff.items.map((i) => ({ ...i, checked_at: checkedAt })), { onConflict: "product_id" });
    if (itemsErr) console.error("[bling-sync-stock] bling_stock_items", itemsErr);

    const { error: runErr } = await db.from("bling_sync_runs").insert({
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

    await db
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

    await db.from("bling_sync_runs").insert({
      started_at: startedAt,
      mode,
      status: "error",
      error: message,
      triggered_by: triggeredBy,
    });
    await db
      .from("bling_connection")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "error", last_sync_error: message })
      .eq("id", 1);

    return json({ ok: false, mode, error: message }, message === "not_connected" ? 400 : 500);
  }
});
