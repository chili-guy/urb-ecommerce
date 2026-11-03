// Frete grátis por regra (cortesia da loja), definido no painel em "Frete". Parte pura
// (casar a regra com o pedido, zerar o preço) + busca da cidade pelo CEP e leitura das regras.
//
// Quem decide é o servidor, sempre pelo CEP: cidade e estado digitados pelo cliente no
// formulário NÃO contam, senão qualquer um escreveria "Cascavel" para ganhar frete grátis.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ShippingOption } from "./shipping.ts";

export type ShippingRule = {
  id: number;
  name: string;
  active: boolean;
  areaType: "all" | "states" | "cities" | "cep_range";
  states: string[];
  cities: string[];
  cepFrom: string | null;
  cepTo: string | null;
  /** Soma dos produtos (sem frete, antes de cupom). null = sem mínimo. */
  minOrderValue: number | null;
  /** cheapest = só a opção mais barata fica grátis; all = todas. */
  scope: "cheapest" | "all";
};

export type Place = { uf: string; city: string };

/** Minúsculas, sem acento e sem espaço sobrando: "São  Paulo" e "sao paulo" são a mesma cidade. */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Linha da tabela shipping_rules -> regra. Dado estranho vira regra que não casa com nada (nunca grátis por engano). */
export function parseRuleRow(row: Record<string, unknown>): ShippingRule {
  const areaType = ["all", "states", "cities", "cep_range"].includes(String(row.area_type))
    ? (row.area_type as ShippingRule["areaType"])
    : "states";
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);
  const min = row.min_order_value == null ? null : Number(row.min_order_value);
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    active: row.active === true,
    areaType,
    states: list(row.states).map((s) => s.toUpperCase()),
    cities: list(row.cities),
    cepFrom: row.cep_from ? String(row.cep_from) : null,
    cepTo: row.cep_to ? String(row.cep_to) : null,
    minOrderValue: min !== null && Number.isFinite(min) ? min : null,
    scope: row.scope === "all" ? "all" : "cheapest",
  };
}

/** Alguma regra ativa precisa saber a cidade/estado? (evita consultar o CEP à toa) */
export function needsPlace(rules: ShippingRule[]): boolean {
  return rules.some((r) => r.active && (r.areaType === "states" || r.areaType === "cities"));
}

export type OrderContext = { cep: string; place: Place | null; subtotal: number };

export function ruleMatches(rule: ShippingRule, ctx: OrderContext): boolean {
  if (!rule.active) return false;
  if (rule.minOrderValue !== null && ctx.subtotal + 1e-9 < rule.minOrderValue) return false;
  switch (rule.areaType) {
    case "all":
      return true;
    case "states":
      return !!ctx.place && rule.states.includes(ctx.place.uf);
    case "cities": {
      if (!ctx.place || !rule.states.includes(ctx.place.uf)) return false;
      const city = normalizeText(ctx.place.city);
      return rule.cities.some((c) => normalizeText(c) === city);
    }
    case "cep_range":
      return (
        !!rule.cepFrom && !!rule.cepTo && /^\d{8}$/.test(ctx.cep) && ctx.cep >= rule.cepFrom && ctx.cep <= rule.cepTo
      );
    default:
      return false;
  }
}

/** Regras ativas que casam com o pedido, da mais antiga para a mais nova. */
export function matchingRules(rules: ShippingRule[], ctx: OrderContext): ShippingRule[] {
  return rules.filter((r) => ruleMatches(r, ctx)).sort((a, b) => a.id - b.id);
}

/** Entre várias que casam, vale a que libera todas as opções; senão, a mais antiga. */
export function chooseRule(matched: ShippingRule[]): ShippingRule | null {
  return matched.find((r) => r.scope === "all") ?? matched[0] ?? null;
}

export type FreeShippingResult = {
  options: ShippingOption[];
  /** Nome da regra que valeu, ou null se o cliente paga o frete normal. */
  appliedRule: string | null;
};

/**
 * Zera o preço das opções que a regra cobre. O preço de verdade fica em `originalPrice`
 * (é o que a loja paga pela etiqueta). Se mais de uma regra casa, "todas as opções" vence
 * "só a mais barata"; empatando, a de menor id.
 */
export function applyFreeShipping(options: ShippingOption[], rules: ShippingRule[], ctx: OrderContext): FreeShippingResult {
  const matched = matchingRules(rules, ctx);
  if (matched.length === 0 || options.length === 0) return { options, appliedRule: null };

  const rule = chooseRule(matched)!;
  const allRule = rule.scope === "all";
  const cheapest = options.reduce((best, o) => (o.price < best.price ? o : best), options[0]);

  const out = options.map((o) => {
    const covered = allRule || o.id === cheapest.id;
    if (!covered || o.price === 0) return o;
    return { ...o, price: 0, originalPrice: o.price, freeShippingRule: rule.name, description: "Frete grátis para a sua região" };
  });
  return { options: out, appliedRule: rule.name };
}

// ----------------------------------------------------------------- cidade pelo CEP
const PLACE_TTL_MS = 60 * 60 * 1000;
const placeCache = new Map<string, { at: number; place: Place | null }>();

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(3500), headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** ViaCEP primeiro, BrasilAPI de reserva. null = não achou (regras de cidade/estado simplesmente não valem). */
export async function lookupPlace(cep: string, fetchImpl: typeof fetch = fetch): Promise<Place | null> {
  if (!/^\d{8}$/.test(cep)) return null;
  const hit = placeCache.get(cep);
  if (hit && Date.now() - hit.at < PLACE_TTL_MS) return hit.place;

  let place: Place | null = null;
  const via = await fetchJson(`https://viacep.com.br/ws/${cep}/json/`, fetchImpl);
  if (via && !via.erro && typeof via.uf === "string" && typeof via.localidade === "string" && via.uf && via.localidade) {
    place = { uf: via.uf.toUpperCase(), city: via.localidade };
  } else {
    const br = await fetchJson(`https://brasilapi.com.br/api/cep/v2/${cep}`, fetchImpl);
    if (br && typeof br.state === "string" && typeof br.city === "string" && br.state && br.city) {
      place = { uf: br.state.toUpperCase(), city: br.city };
    }
  }
  if (placeCache.size > 500) placeCache.clear();
  // Falha de rede não fica guardada por uma hora: tenta de novo logo.
  placeCache.set(cep, { at: place ? Date.now() : Date.now() - PLACE_TTL_MS + 60 * 1000, place });
  return place;
}

/** Regras ativas, da mais antiga para a mais nova. Se a leitura falhar, ninguém ganha frete grátis por engano. */
export async function loadShippingRules(db: SupabaseClient): Promise<ShippingRule[]> {
  const { data, error } = await db.from("shipping_rules").select("*").eq("active", true).order("id");
  if (error) {
    console.error("[shipping-rules] não consegui ler as regras de frete grátis:", error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => parseRuleRow(row));
}

/** Aplica as regras do painel a uma cotação: busca cidade/estado só se alguma regra pedir. */
export async function applyRulesToQuote(args: {
  db: SupabaseClient;
  options: ShippingOption[];
  cep: string;
  subtotal: number;
  fetchImpl?: typeof fetch;
}): Promise<FreeShippingResult> {
  const rules = await loadShippingRules(args.db);
  if (rules.length === 0) return { options: args.options, appliedRule: null };
  const place = needsPlace(rules) ? await lookupPlace(args.cep, args.fetchImpl) : null;
  return applyFreeShipping(args.options, rules, { cep: args.cep, place, subtotal: args.subtotal });
}
