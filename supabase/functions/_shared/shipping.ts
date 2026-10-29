// Cotação de frete na Melhor Envio. Parte pura (montar o pedido, ler a resposta) +
// uma chamada de rede. Formato conferido em docs.melhorenvio.com.br ("Cálculo de Fretes"):
// medidas em cm, peso em kg, `custom_price`/`custom_delivery_time` já trazem os descontos da conta.

import { IntegrationError, UserError } from "./errors.ts";

export type ShippingOption = {
  id: string;
  carrier: string;
  service: string;
  price: number;
  deliveryDays: number;
  description: string;
};

export type QuoteItem = { productId: number; quantity: number };

export type ShippingProductRow = {
  id: number;
  price: number;
  weight_g: number | string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  length_cm: number | string | null;
};

/** Usado quando o produto ainda não tem peso/medidas cadastrados — o frete sai como "estimado". */
export const DEFAULT_PACKAGE = { weightG: 500, widthCm: 20, heightCm: 10, lengthCm: 20 };

// Mínimos aceitos pelos Correios; abaixo disso a cotação falha.
const MIN = { weightKg: 0.1, widthCm: 11, heightCm: 2, lengthCm: 16 };

export type CalculateBody = {
  from: { postal_code: string };
  to: { postal_code: string };
  products: {
    id: string;
    width: number;
    height: number;
    length: number;
    weight: number;
    insurance_value: number;
    quantity: number;
  }[];
  options: { receipt: boolean; own_hand: boolean };
};

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function buildCalculateBody(opts: {
  originCep: string;
  destCep: string;
  items: QuoteItem[];
  products: Map<number, ShippingProductRow>;
}): { body: CalculateBody; estimated: boolean } {
  let estimated = false;
  const products = opts.items.map((item) => {
    const p = opts.products.get(item.productId);
    if (!p) throw new UserError("Um dos produtos do carrinho não está mais disponível.", 409);

    const weightG = num(p.weight_g);
    const width = num(p.width_cm);
    const height = num(p.height_cm);
    const length = num(p.length_cm);
    if (weightG === null || width === null || height === null || length === null) estimated = true;

    return {
      id: String(p.id),
      width: Math.max(width ?? DEFAULT_PACKAGE.widthCm, MIN.widthCm),
      height: Math.max(height ?? DEFAULT_PACKAGE.heightCm, MIN.heightCm),
      length: Math.max(length ?? DEFAULT_PACKAGE.lengthCm, MIN.lengthCm),
      weight: Math.max((weightG ?? DEFAULT_PACKAGE.weightG) / 1000, MIN.weightKg),
      insurance_value: Math.round(Number(p.price) * 100) / 100,
      quantity: item.quantity,
    };
  });

  return {
    body: {
      from: { postal_code: opts.originCep },
      to: { postal_code: opts.destCep },
      products,
      options: { receipt: false, own_hand: false },
    },
    estimated,
  };
}

type RawService = {
  id?: number | string;
  name?: string;
  price?: string | number;
  custom_price?: string | number;
  delivery_time?: number;
  custom_delivery_time?: number;
  error?: string;
  company?: { name?: string };
};

/** Fica só com serviços que têm preço (os indisponíveis vêm com `error`), do mais barato ao mais caro. */
export function parseCalculateResponse(json: unknown): ShippingOption[] {
  if (!Array.isArray(json)) return [];
  const options: ShippingOption[] = [];
  for (const raw of json as RawService[]) {
    if (!raw || raw.error || raw.id == null) continue;
    const price = Number(raw.custom_price ?? raw.price);
    if (!Number.isFinite(price) || price < 0) continue;
    const days = Number(raw.custom_delivery_time ?? raw.delivery_time);
    const carrier = raw.company?.name?.trim() || "Transportadora";
    options.push({
      id: `me-${raw.id}`,
      carrier,
      service: String(raw.name ?? "Entrega").trim(),
      price: Math.round(price * 100) / 100,
      deliveryDays: Number.isFinite(days) && days > 0 ? Math.round(days) : 0,
      description: `Entrega por ${carrier}`,
    });
  }
  return options.sort((a, b) => a.price - b.price || a.deliveryDays - b.deliveryDays).slice(0, 8);
}

export type ShippingConfig = {
  token: string;
  originCep: string;
  contactEmail: string;
  baseUrl: string;
};

/** null = ainda não configurado (falta token, CEP de origem ou e-mail de contato). */
export function loadShippingConfig(env: { get(name: string): string | undefined }): ShippingConfig | null {
  const token = env.get("MELHORENVIO_TOKEN")?.trim();
  const originCep = (env.get("SHIPPING_ORIGIN_CEP") ?? "").replace(/\D/g, "");
  const contactEmail = env.get("SHIPPING_CONTACT_EMAIL")?.trim();
  if (!token || originCep.length !== 8 || !contactEmail) return null;
  const sandbox = (env.get("MELHORENVIO_ENV") ?? "production").trim().toLowerCase() === "sandbox";
  return {
    token,
    originCep,
    contactEmail,
    baseUrl: sandbox ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br",
  };
}

// Cache curto em memória: o mesmo carrinho + CEP não precisa ir à Melhor Envio toda hora.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; options: ShippingOption[] }>();

export async function requestQuote(
  cfg: ShippingConfig,
  body: CalculateBody,
  fetchImpl: typeof fetch = fetch,
): Promise<ShippingOption[]> {
  const key = `${cfg.baseUrl}|${JSON.stringify(body)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.options;

  const res = await fetchImpl(`${cfg.baseUrl}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": `UR3 Loja Virtual (${cfg.contactEmail})`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new IntegrationError(`Melhor Envio recusou o token (HTTP ${res.status}). Confira MELHORENVIO_TOKEN e MELHORENVIO_ENV.`);
  }
  if (res.status === 422) {
    // Dados inválidos (ex.: CEP que não existe). Vale mostrar pro cliente.
    throw new UserError("Não foi possível calcular o frete para esse CEP. Confira o CEP e tente de novo.", 422);
  }
  if (!res.ok) throw new IntegrationError(`Melhor Envio respondeu HTTP ${res.status}.`);

  const options = parseCalculateResponse(await res.json());
  if (cache.size > 200) cache.clear();
  cache.set(key, { at: Date.now(), options });
  return options;
}

/** Junta tudo: busca os produtos, monta o pedido de cotação e consulta a Melhor Envio. */
export async function quoteForItems(args: {
  cfg: ShippingConfig;
  items: QuoteItem[];
  destCep: string;
  loadProducts: (ids: number[]) => Promise<ShippingProductRow[]>;
  fetchImpl?: typeof fetch;
}): Promise<{ options: ShippingOption[]; estimated: boolean }> {
  const ids = [...new Set(args.items.map((i) => i.productId))];
  const rows = await args.loadProducts(ids);
  const { body, estimated } = buildCalculateBody({
    originCep: args.cfg.originCep,
    destCep: args.destCep,
    items: args.items,
    products: new Map(rows.map((r) => [r.id, r])),
  });
  const options = await requestQuote(args.cfg, body, args.fetchImpl);
  return { options, estimated };
}
