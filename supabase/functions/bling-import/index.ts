// Importa produtos da Bling pro site.
//
//   { action: "list" }                      -> produtos ativos da Bling que ainda não
//                                              existem no site (comparando pelo SKU)
//   { action: "import", ids, category? }    -> cria os produtos escolhidos (até 10 por
//                                              chamada, o painel manda em lotes)
//
// Só cria produtos novos — nunca altera nem apaga nada que já existe. As fotos são
// copiadas pro nosso storage (os links da Bling podem expirar). Só equipe logada.
//
// Deploy: supabase functions deploy bling-import

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  BLING_CATEGORIES_URL,
  BLING_PACE_MS,
  BLING_PRODUCTS_URL,
  blingGet,
  getValidAccessToken,
  sleep,
} from "../_shared/bling.ts";
import {
  MAX_IMAGES,
  buildProductRow,
  collectImageUrls,
  isImportable,
  type BlingDetail,
  type BlingListItem,
} from "../_shared/bling-import.ts";
import { CORS_HEADERS, authenticateStaff, json, serviceClient } from "../_shared/http.ts";
import { skuKey } from "../_shared/stock-diff.ts";

const MAX_IDS_PER_CALL = 10;
const IMAGE_BUCKET = "product-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

async function localSkuSet(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db.from("products").select("sku");
  if (error) throw error;
  return new Set((data ?? []).map((r: { sku: string | null }) => skuKey(r.sku)).filter(Boolean));
}

async function listCandidates(db: SupabaseClient, accessToken: string) {
  const all: BlingListItem[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const url = new URL(BLING_PRODUCTS_URL);
    url.searchParams.set("pagina", String(pagina));
    url.searchParams.set("limite", "100");
    url.searchParams.set("criterio", "2"); // só ativos
    const body = await blingGet(url.toString(), accessToken);
    const page: BlingListItem[] = body.data ?? [];
    all.push(...page);
    if (page.length < 100) break;
    await sleep(BLING_PACE_MS);
  }

  const onSite = await localSkuSet(db);
  let alreadyOnSite = 0;
  let withoutCode = 0;
  const candidates = [];
  for (const p of all) {
    if (!isImportable(p)) {
      if (!p.codigo?.trim() && p.tipo !== "S" && p.formato !== "V") withoutCode++;
      continue;
    }
    if (onSite.has(skuKey(p.codigo))) {
      alreadyOnSite++;
      continue;
    }
    const stock = p.estoque?.saldoVirtualTotal;
    candidates.push({
      id: p.id,
      sku: p.codigo!.trim(),
      name: (p.nome ?? "").trim(),
      price: p.preco ?? 0,
      stock: typeof stock === "number" ? Math.max(0, Math.floor(stock)) : null,
      imageUrl: p.imagemURL ?? null,
    });
  }
  return { ok: true, blingTotal: all.length, alreadyOnSite, withoutCode, candidates };
}

/** id da categoria da Bling -> nome. Se falhar, os produtos entram como "Sem categoria". */
async function loadCategoryNames(accessToken: string): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  try {
    for (let pagina = 1; pagina <= 20; pagina++) {
      const url = new URL(BLING_CATEGORIES_URL);
      url.searchParams.set("pagina", String(pagina));
      url.searchParams.set("limite", "100");
      const body = await blingGet(url.toString(), accessToken);
      const page: { id: number; descricao?: string }[] = body.data ?? [];
      for (const c of page) if (c.descricao) names.set(c.id, c.descricao.trim());
      if (page.length < 100) break;
      await sleep(BLING_PACE_MS);
    }
  } catch (err) {
    console.error("[bling-import] categorias", err);
  }
  return names;
}

/** Copia as fotos pro nosso storage; se alguma falhar, mantém o link original da Bling. */
async function hostImages(db: SupabaseClient, urls: string[]): Promise<string[]> {
  return await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const headerType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        const urlExt = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
        const type = IMAGE_TYPES[headerType] ? headerType : EXT_TO_TYPE[urlExt];
        if (!type) throw new Error(`tipo de arquivo não suportado (${headerType || "?"})`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("imagem maior que 5 MB");
        const path = `bling/${crypto.randomUUID()}.${IMAGE_TYPES[type]}`;
        const { error } = await db.storage
          .from(IMAGE_BUCKET)
          .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
        if (error) throw error;
        return db.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      } catch (err) {
        console.error("[bling-import] foto não copiada, mantendo o link original", url, err);
        return url;
      }
    }),
  );
}

type ImportResult = {
  id: number;
  status: "imported" | "skipped" | "error";
  sku?: string;
  name?: string;
  productId?: number;
  message?: string;
  /** Importado com estoque 0 — fica oculto na loja até ter saldo. */
  hidden?: boolean;
};

async function importProducts(db: SupabaseClient, accessToken: string, ids: unknown, categoryOverride: unknown) {
  const list = Array.isArray(ids)
    ? [...new Set(ids.filter((n): n is number => Number.isInteger(n)))].slice(0, MAX_IDS_PER_CALL)
    : [];
  const override = typeof categoryOverride === "string" ? categoryOverride.trim() : "";
  const categories = override || list.length === 0 ? new Map<number, string>() : await loadCategoryNames(accessToken);
  const onSite = await localSkuSet(db);
  const results: ImportResult[] = [];

  for (const id of list) {
    try {
      await sleep(BLING_PACE_MS);
      const detail: BlingDetail = (await blingGet(`${BLING_PRODUCTS_URL}/${id}`, accessToken)).data;
      const sku = detail.codigo?.trim() ?? "";
      const base = { id, sku, name: detail.nome?.trim() };

      if (!isImportable(detail)) {
        results.push({ ...base, status: "skipped", message: "Não importável (sem código, serviço, inativo ou com variações)." });
        continue;
      }
      if (!detail.preco || detail.preco <= 0) {
        results.push({ ...base, status: "skipped", message: "Sem preço na Bling — ajuste lá e tente de novo." });
        continue;
      }
      if (onSite.has(skuKey(sku))) {
        results.push({ ...base, status: "skipped", message: "Já existe no site (mesmo SKU)." });
        continue;
      }

      const category = override || (detail.categoria?.id ? categories.get(detail.categoria.id) : undefined) || "Sem categoria";
      const hosted = await hostImages(db, collectImageUrls(detail).slice(0, MAX_IMAGES));
      const row = buildProductRow(detail, { category, hostedImages: hosted });

      const { data, error } = await db.from("products").insert(row).select("id").single();
      if (error) throw error;
      onSite.add(skuKey(sku));
      results.push({ ...base, status: "imported", productId: data.id as number, hidden: row.stock === 0 });
    } catch (err) {
      console.error("[bling-import] produto", id, err);
      results.push({
        id,
        status: "error",
        message: err instanceof Error ? err.message : (err as { message?: string })?.message ?? "erro desconhecido",
      });
    }
  }
  return { ok: true, results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const { isStaff } = await authenticateStaff(req);
  if (!isStaff) return json({ error: "forbidden" }, 403);

  let body: { action?: string; ids?: unknown; category?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* corpo vazio */
  }

  const db = serviceClient();
  try {
    const accessToken = await getValidAccessToken(db);
    if (body.action === "list") return json(await listCandidates(db, accessToken));
    if (body.action === "import") return json(await importProducts(db, accessToken, body.ids, body.category));
    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[bling-import]", err);
    return json({ ok: false, error: message }, message === "not_connected" ? 400 : 500);
  }
});
