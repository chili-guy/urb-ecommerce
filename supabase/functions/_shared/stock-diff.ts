// Compara o estoque do site com o da Bling, produto a produto, casando pelo SKU
// (products.sku == codigo na Bling). Módulo puro — sem rede nem banco — pra dar
// pra testar sem subir nada.

export type BlingProductLite = {
  id: number;
  codigo?: string | null;
  estoque?: { saldoVirtualTotal?: number } | null;
};

export type LocalProductLite = {
  id: number;
  sku: string | null;
  stock: number;
};

export type StockStatus = "ok" | "not_found" | "no_sku" | "no_stock_info";

export type StockItem = {
  product_id: number;
  sku: string | null;
  status: StockStatus;
  bling_product_id: number | null;
  bling_stock: number | null;
  site_stock: number;
  previous_stock: number;
  applied: boolean;
};

export type StockDiff = {
  items: StockItem[];
  toUpdate: { id: number; stock: number }[];
  summary: {
    productsTotal: number;
    matched: number;
    changed: number;
    /** Produtos do site sem par utilizável na Bling (sem SKU, SKU ausente lá ou sem saldo). */
    unmatched: number;
    /** Produtos da Bling com código que não existem no site. */
    blingOnly: number;
    /** Produtos pareados com saldo 0 na Bling — ficam ocultos na loja. */
    zeroed: number;
  };
};

/** Isolado de propósito: é a parte que depende do formato da resposta da Bling. */
export function extractStock(produto: BlingProductLite): number | null {
  const saldo = produto.estoque?.saldoVirtualTotal;
  return typeof saldo === "number" && Number.isFinite(saldo) ? Math.max(0, Math.floor(saldo)) : null;
}

function skuKey(sku: string | null | undefined): string {
  return (sku ?? "").trim().toUpperCase();
}

/** `apply=false` é a "conferência": calcula tudo mas não manda nada pra `toUpdate`. */
export function diffStock(local: LocalProductLite[], bling: BlingProductLite[], apply: boolean): StockDiff {
  const blingByKey = new Map<string, BlingProductLite>();
  for (const p of bling) {
    const key = skuKey(p.codigo);
    if (key) blingByKey.set(key, p);
  }

  const items: StockItem[] = [];
  const toUpdate: { id: number; stock: number }[] = [];
  const localKeys = new Set<string>();
  let matched = 0;
  let changed = 0;
  let unmatched = 0;
  let zeroed = 0;

  for (const product of local) {
    const key = skuKey(product.sku);
    const base = {
      product_id: product.id,
      sku: product.sku?.trim() || null,
      site_stock: product.stock,
      previous_stock: product.stock,
      applied: false,
    };

    if (!key) {
      unmatched++;
      items.push({ ...base, status: "no_sku", bling_product_id: null, bling_stock: null });
      continue;
    }
    localKeys.add(key);

    const match = blingByKey.get(key);
    if (!match) {
      unmatched++;
      items.push({ ...base, status: "not_found", bling_product_id: null, bling_stock: null });
      continue;
    }

    const blingStock = extractStock(match);
    if (blingStock === null) {
      unmatched++;
      items.push({ ...base, status: "no_stock_info", bling_product_id: match.id, bling_stock: null });
      continue;
    }

    matched++;
    if (blingStock === 0) zeroed++;
    const differs = blingStock !== product.stock;
    if (differs) {
      changed++;
      if (apply) toUpdate.push({ id: product.id, stock: blingStock });
    }
    items.push({
      ...base,
      status: "ok",
      bling_product_id: match.id,
      bling_stock: blingStock,
      site_stock: apply ? blingStock : product.stock,
      applied: apply && differs,
    });
  }

  let blingOnly = 0;
  for (const key of blingByKey.keys()) if (!localKeys.has(key)) blingOnly++;

  return {
    items,
    toUpdate,
    summary: { productsTotal: local.length, matched, changed, unmatched, blingOnly, zeroed },
  };
}
