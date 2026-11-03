// Etiquetas da Melhor Envio: monta o envio, compra, gera e busca o rastreio. Formatos conferidos em
// docs.melhorenvio.com.br ("Inserir fretes no carrinho", "Compra de fretes", "Geração de etiquetas",
// "Status da etiqueta", "Cancelamento de etiquetas").
//
// Fluxo por pedido pago:  carrinho (POST /me/cart)  ->  compra (POST /me/shipment/checkout, debita o saldo
// da carteira)  ->  geração (POST /me/shipment/generate)  ->  rastreio (POST /me/shipment/tracking).
// Cada passo concluído fica gravado (`step`): uma nova tentativa continua de onde parou e nunca compra
// duas vezes. O acesso ao banco e à Melhor Envio entra por parâmetro, então o fluxo todo é testável.

import { DEFAULT_PACKAGE, type ShippingConfig } from "./shipping.ts";

// -------------------------------------------------------------------- configuração
export type LabelMode = "off" | "cart" | "full";
export type LabelDocument = "invoice" | "content_declaration";

export type LabelSettings = {
  /** off = não gera; cart = só cria o envio no carrinho (a pessoa paga na Melhor Envio); full = compra e gera. */
  mode: LabelMode;
  /** invoice = precisa da chave da nota fiscal; content_declaration = declaração de conteúdo. null = não escolhido. */
  document: LabelDocument | null;
};

export const DEFAULT_LABEL_SETTINGS: LabelSettings = { mode: "off", document: null };

export function parseLabelSettings(raw: unknown): LabelSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    mode: o.mode === "cart" || o.mode === "full" ? o.mode : "off",
    document: o.document === "invoice" || o.document === "content_declaration" ? o.document : null,
  };
}

export type Sender = {
  name: string;
  /** CPF (11 dígitos) ou CNPJ (14). */
  document: string;
  stateRegister: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export const EMPTY_SENDER: Sender = {
  name: "", document: "", stateRegister: "", phone: "", email: "", postalCode: "",
  address: "", number: "", complement: "", district: "", city: "", state: "",
};

const digits = (v: unknown): string => String(v ?? "").replace(/\D/g, "");
const str = (v: unknown, max = 120): string => String(v ?? "").trim().slice(0, max);

export function parseSender(raw: unknown): Sender {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    name: str(o.name, 120),
    document: digits(o.document),
    stateRegister: str(o.stateRegister, 30),
    phone: digits(o.phone),
    email: str(o.email, 120).toLowerCase(),
    postalCode: digits(o.postalCode).slice(0, 8),
    address: str(o.address),
    number: str(o.number, 12),
    complement: str(o.complement, 80),
    district: str(o.district, 80),
    city: str(o.city, 80),
    state: str(o.state, 2).toUpperCase(),
  };
}

/** O que falta no cadastro do remetente (vazio = completo). */
export function senderProblems(s: Sender): string[] {
  const p: string[] = [];
  if (s.name.length < 3) p.push("nome ou razão social");
  if (s.document.length !== 11 && s.document.length !== 14) p.push("CPF ou CNPJ");
  if (s.phone.length < 10) p.push("telefone com DDD");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email)) p.push("e-mail");
  if (s.postalCode.length !== 8) p.push("CEP");
  if (!s.address) p.push("rua");
  if (!s.number) p.push("número");
  if (!s.district) p.push("bairro");
  if (!s.city) p.push("cidade");
  if (!/^[A-Z]{2}$/.test(s.state)) p.push("estado (UF)");
  return p;
}

// ------------------------------------------------------------- nota fiscal e serviços
/** Chave de acesso da NF-e: 44 dígitos, o último é o dígito verificador (módulo 11). */
export function isValidNfeKey(raw: string): boolean {
  const key = digits(raw);
  if (key.length !== 44) return false;
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return dv === Number(key[43]);
}

/** "me-31" (id que o site guarda no pedido) -> 31 (id do serviço na Melhor Envio). */
export function serviceIdFromOption(id: unknown): number | null {
  const m = /^me-(\d+)$/.exec(String(id ?? ""));
  return m ? Number(m[1]) : null;
}

/** Serviços que a Melhor Envio não deixa comprar por API (precisam de unidade/agência ou só cotam). */
export const MANUAL_ONLY_SERVICES: Record<number, string> = {
  12: "LATAM Cargo",
  16: "Azul Cargo",
};

// ---------------------------------------------------------------------- dados do pedido
export type LabelItem = {
  productId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  weightG: number | null;
  widthCm: number | null;
  heightCm: number | null;
  lengthCm: number | null;
};

export type LabelOrder = {
  id: number;
  status: string;
  paymentStatus: string | null;
  subtotal: number;
  customerName: string;
  customerEmail: string;
  customerCpf: string | null;
  customerPhone: string | null;
  invoiceKey: string | null;
  serviceOptionId: string | null;
  address: {
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
  } | null;
  items: LabelItem[];
};

// Mínimos aceitos pelos Correios (mesmos da cotação).
const MIN = { weightKg: 0.1, widthCm: 11, heightCm: 2, lengthCm: 16 };

/**
 * Junta todos os itens num volume só: a maior largura e o maior comprimento, alturas empilhadas e peso somado.
 * A Melhor Envio recalcula o preço por esse volume, então ele pode sair diferente da cotação.
 * `estimated` = algum item não tem peso/medidas cadastrados e entrou a caixa padrão.
 */
export function buildVolume(items: LabelItem[]): { height: number; width: number; length: number; weight: number; estimated: boolean } {
  let estimated = false;
  let weightG = 0;
  let width = 0;
  let length = 0;
  let height = 0;
  for (const it of items) {
    if (it.weightG == null || it.widthCm == null || it.heightCm == null || it.lengthCm == null) estimated = true;
    weightG += (it.weightG ?? DEFAULT_PACKAGE.weightG) * it.quantity;
    width = Math.max(width, it.widthCm ?? DEFAULT_PACKAGE.widthCm);
    length = Math.max(length, it.lengthCm ?? DEFAULT_PACKAGE.lengthCm);
    height += (it.heightCm ?? DEFAULT_PACKAGE.heightCm) * it.quantity;
  }
  return {
    height: Math.max(Math.ceil(height), MIN.heightCm),
    width: Math.max(Math.ceil(width), MIN.widthCm),
    length: Math.max(Math.ceil(length), MIN.lengthCm),
    weight: Math.max(Math.round((weightG / 1000) * 1000) / 1000, MIN.weightKg),
    estimated,
  };
}

const money = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

export type CartBody = Record<string, unknown>;

/** Corpo do POST /api/v2/me/cart. Lança LabelFailure se faltar dado que a Melhor Envio exige. */
export function buildCartBody(args: {
  order: LabelOrder;
  sender: Sender;
  document: LabelDocument;
  invoiceKey: string | null;
  serviceId: number;
}): { body: CartBody; estimated: boolean } {
  const { order, sender, document, serviceId } = args;
  const a = order.address;
  if (!a || !a.street || !a.number || !a.district || !a.city || !/^[A-Z]{2}$/.test(a.state) || digits(a.postalCode).length !== 8) {
    throw new LabelFailure("O endereço de entrega do pedido está incompleto (rua, número, bairro, cidade, UF e CEP).");
  }
  const cpf = digits(order.customerCpf);
  if (cpf.length !== 11 && cpf.length !== 14) throw new LabelFailure("O pedido não tem CPF/CNPJ do cliente.");
  if (order.items.length === 0) throw new LabelFailure("O pedido não tem itens.");

  const volume = buildVolume(order.items);
  const commercial = document === "invoice";
  if (commercial && !args.invoiceKey) throw new LabelFailure("Informe a chave da nota fiscal (44 dígitos) para gerar a etiqueta.");

  const sDoc = sender.document;
  const body: CartBody = {
    service: serviceId,
    from: {
      name: sender.name,
      phone: sender.phone,
      email: sender.email,
      document: sDoc.length === 11 ? sDoc : "",
      company_document: sDoc.length === 14 ? sDoc : "",
      // Envio comercial: a Inscrição Estadual da loja (ou ISENTO). Declaração de conteúdo: vazio/ISENTO.
      state_register: sender.stateRegister || "ISENTO",
      address: sender.address,
      complement: sender.complement,
      number: sender.number,
      district: sender.district,
      city: sender.city,
      country_id: "BR",
      postal_code: sender.postalCode,
      state_abbr: sender.state,
    },
    to: {
      name: order.customerName,
      phone: digits(order.customerPhone),
      email: order.customerEmail,
      document: cpf.length === 11 ? cpf : "",
      company_document: cpf.length === 14 ? cpf : "",
      address: a.street,
      complement: a.complement,
      number: a.number,
      district: a.district,
      city: a.city,
      country_id: "BR",
      postal_code: digits(a.postalCode),
      state_abbr: a.state,
    },
    // Os produtos precisam estar corretos e completos: a Melhor Envio os usa na declaração de conteúdo eletrônica (DC-e).
    products: order.items.map((it) => ({
      name: it.name.slice(0, 120),
      quantity: String(it.quantity),
      unitary_value: money(it.unitPrice),
    })),
    volumes: [{ height: volume.height, width: volume.width, length: volume.length, weight: volume.weight }],
    options: {
      insurance_value: Math.round(order.subtotal * 100) / 100,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: !commercial,
      ...(commercial ? { invoice: { key: args.invoiceKey } } : {}),
      platform: "UR3 Loja Virtual",
      tags: [{ tag: `Pedido #${order.id}`, url: null }],
    },
  };
  return { body, estimated: volume.estimated };
}

// ------------------------------------------------------------------------- erros
/** Falha com mensagem pronta (em português) para mostrar à equipe no pedido. */
export class LabelFailure extends Error {}

export class MeHttpError extends Error {
  status: number;
  messages: string[];
  constructor(status: number, messages: string[]) {
    super(`Melhor Envio HTTP ${status}${messages.length ? `: ${messages.join(" | ")}` : ""}`);
    this.name = "MeHttpError";
    this.status = status;
    this.messages = messages;
  }
}

/** Junta os textos de erro que a Melhor Envio devolve (message, error, errors.campo[...]). */
export function flattenMeErrors(json: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (out.length >= 6 || depth > 4 || v == null) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (t && !out.includes(t)) out.push(t.slice(0, 200));
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k of Object.keys(o)) {
        if (["message", "error", "errors"].includes(k) || depth > 0) walk(o[k], depth + 1);
      }
    }
  };
  walk(json, 0);
  return out;
}

const SCOPE_HINT: Record<string, string> = {
  cart: "cart-write",
  checkout: "shipping-checkout",
  generate: "shipping-generate",
  print: "shipping-print",
  tracking: "shipping-tracking",
  cancel: "shipping-cancel",
  balance: "a leitura do saldo",
};

/** Texto para a equipe a partir de um erro da Melhor Envio, no passo `where`. */
export function describeMeError(err: unknown, where: keyof typeof SCOPE_HINT): string {
  if (err instanceof MeHttpError) {
    if (err.status === 401 || err.status === 403) {
      return `A Melhor Envio recusou o token (${SCOPE_HINT[where]}). Gere um novo token com todas as permissões de etiqueta e atualize o segredo MELHORENVIO_TOKEN.`;
    }
    const joined = err.messages.join(" ");
    if (where === "checkout" && /saldo|insuficiente|balance/i.test(joined)) {
      return "Saldo insuficiente na carteira da Melhor Envio. Recarregue o saldo e clique em Gerar etiqueta de novo.";
    }
    if (err.messages.length > 0) return `A Melhor Envio não aceitou: ${err.messages.slice(0, 3).join("; ")}`;
    return `A Melhor Envio respondeu erro ${err.status}. Tente de novo em instantes.`;
  }
  return "Não consegui falar com a Melhor Envio agora. Tente de novo em instantes.";
}

// ------------------------------------------------------------------ cliente da API
export type CartResult = { id: string; protocol: string | null; price: number | null; serviceId: number | null };
export type CheckoutResult = { total: number | null; price: number | null };

export interface MeApi {
  addToCart(body: CartBody): Promise<CartResult>;
  checkout(meOrderId: string): Promise<CheckoutResult>;
  generate(meOrderId: string): Promise<void>;
  tracking(meOrderId: string): Promise<{ status: string | null; tracking: string | null }>;
  print(meOrderId: string): Promise<string>;
  cancel(meOrderId: string, reason: string): Promise<boolean>;
  balance(): Promise<{ balance: number; reserved: number; debts: number }>;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

export function createMeApi(cfg: ShippingConfig, fetchImpl: typeof fetch = fetch): MeApi {
  async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    const res = await fetchImpl(`${cfg.baseUrl}/api/v2${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": `UR3 Loja Virtual (${cfg.contactEmail})`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* corpo não-JSON */
    }
    if (!res.ok) throw new MeHttpError(res.status, flattenMeErrors(json));
    return json;
  }

  return {
    async addToCart(body) {
      const r = (await call("POST", "/me/cart", body)) as Record<string, unknown> | null;
      if (!r || typeof r.id !== "string") throw new MeHttpError(502, ["A Melhor Envio não devolveu o id do envio."]);
      return { id: r.id, protocol: typeof r.protocol === "string" ? r.protocol : null, price: num(r.price), serviceId: num(r.service_id) };
    },
    async checkout(meOrderId) {
      const r = (await call("POST", "/me/shipment/checkout", { orders: [meOrderId] })) as { purchase?: { total?: unknown; orders?: { id?: string; price?: unknown }[] } } | null;
      const order = r?.purchase?.orders?.find((o) => o.id === meOrderId) ?? r?.purchase?.orders?.[0];
      return { total: num(r?.purchase?.total), price: num(order?.price) };
    },
    async generate(meOrderId) {
      const r = (await call("POST", "/me/shipment/generate", { orders: [meOrderId] })) as Record<string, { status?: boolean; message?: string }> | null;
      const item = r?.[meOrderId];
      if (!item || item.status !== true) {
        throw new MeHttpError(422, [item?.message ?? "A Melhor Envio não confirmou a geração da etiqueta."]);
      }
    },
    async tracking(meOrderId) {
      const r = (await call("POST", "/me/shipment/tracking", { orders: [meOrderId] })) as Record<string, { status?: string; tracking?: string | null }> | null;
      const item = r?.[meOrderId];
      return { status: item?.status ?? null, tracking: item?.tracking ? String(item.tracking) : null };
    },
    async print(meOrderId) {
      const r = (await call("POST", "/me/shipment/print", { mode: "public", orders: [meOrderId] })) as { url?: string } | null;
      if (!r?.url) throw new MeHttpError(502, ["A Melhor Envio não devolveu o link da etiqueta."]);
      return r.url;
    },
    async cancel(meOrderId, reason) {
      const r = (await call("POST", "/me/shipment/cancel", { order: { id: meOrderId, reason_id: "2", description: reason.slice(0, 200) } })) as Record<string, { canceled?: boolean }> | null;
      return r?.[meOrderId]?.canceled === true;
    },
    async balance() {
      const r = (await call("GET", "/me/balance")) as { balance?: unknown; reserved?: unknown; debts?: unknown } | null;
      return { balance: num(r?.balance) ?? 0, reserved: num(r?.reserved) ?? 0, debts: num(r?.debts) ?? 0 };
    },
  };
}

// ----------------------------------------------------------------------- o fluxo
export type Step = "cart" | "purchased" | "generated";

export type ShipmentPatch = {
  status?: "processing" | "ok" | "failed";
  step?: Step | null;
  meOrderId?: string | null;
  protocol?: string | null;
  serviceId?: number | null;
  price?: number | null;
  tracking?: string | null;
  note?: string | null;
};

export type ClaimResult =
  | { ok: true; resume: { meOrderId: string | null; step: Step | null } | null }
  | { ok: false; reason: string };

export interface LabelStore {
  loadSettings(): Promise<{ settings: LabelSettings; sender: Sender }>;
  loadOrder(orderId: number): Promise<LabelOrder | null>;
  claim(orderId: number): Promise<ClaimResult>;
  save(orderId: number, patch: ShipmentPatch): Promise<void>;
  saveInvoiceKey(orderId: number, key: string): Promise<void>;
  /** Grava o código de rastreio no pedido (o cliente vê) e, se ainda confirmado, passa para "Em separação". */
  saveTracking(orderId: number, code: string): Promise<void>;
  /** Pedido ficou "Em separação" porque a etiqueta foi gerada. */
  markInPreparation(orderId: number): Promise<void>;
}

export type FlowResult =
  | { kind: "skipped"; reason: string }
  | { kind: "cart"; meOrderId: string; estimated: boolean }
  | { kind: "generated"; meOrderId: string; tracking: string | null; price: number | null; estimated: boolean }
  | { kind: "failed"; note: string };

const ALREADY_PAID = /j[aá]\s+(foi|foram|est[aá]|estao|estão)\s+pag|already\s+paid/i;

/**
 * Gera a etiqueta de um pedido pago.
 * - trigger "auto": roda ao confirmar o pagamento; respeita o modo do painel (desligado, só carrinho ou completo) e,
 *   se o documento for nota fiscal, espera a chave ser informada.
 * - trigger "manual": clique da equipe; sempre vai até a etiqueta e aceita a chave da nota.
 */
export async function runLabelFlow(args: {
  store: LabelStore;
  me: MeApi;
  orderId: number;
  trigger: "auto" | "manual";
  invoiceKey?: string | null;
}): Promise<FlowResult> {
  const { store, me, orderId, trigger } = args;
  const { settings, sender } = await store.loadSettings();
  if (trigger === "auto" && settings.mode === "off") return { kind: "skipped", reason: "off" };

  const order = await store.loadOrder(orderId);
  if (!order) return { kind: "skipped", reason: "not_found" };

  // Chave informada agora vale para este e para os próximos passos.
  const providedKey = args.invoiceKey ? digits(args.invoiceKey) : null;
  if (providedKey) {
    if (!isValidNfeKey(providedKey)) {
      return { kind: "failed", note: "A chave da nota fiscal é inválida: confira os 44 dígitos." };
    }
    await store.saveInvoiceKey(orderId, providedKey);
    order.invoiceKey = providedKey;
  }
  // Com nota fiscal, o automático espera a pessoa emitir a nota e informar a chave.
  if (trigger === "auto" && settings.document === "invoice" && !order.invoiceKey) {
    return { kind: "skipped", reason: "waiting_invoice" };
  }

  const claim = await store.claim(orderId);
  if (!claim.ok) return { kind: "skipped", reason: claim.reason };

  const target: "cart" | "full" = trigger === "auto" && settings.mode === "cart" ? "cart" : "full";
  let step: Step | null = claim.resume?.step ?? null;
  let meId: string | null = claim.resume?.meOrderId ?? null;
  let estimated = false;
  let where: keyof typeof SCOPE_HINT = "cart";

  const fail = async (note: string): Promise<FlowResult> => {
    await store.save(orderId, { status: "failed", note });
    return { kind: "failed", note };
  };

  try {
    // 1. Pré-requisitos que não dependem da Melhor Envio.
    if (!meId) {
      const problems = senderProblems(sender);
      if (problems.length > 0) return await fail(`Cadastre o remetente em Frete > Etiquetas. Falta: ${problems.join(", ")}.`);
      if (!settings.document) return await fail("Escolha o documento da etiqueta (nota fiscal ou declaração de conteúdo) em Frete > Etiquetas.");
      const serviceId = serviceIdFromOption(order.serviceOptionId);
      if (serviceId === null) return await fail("Não sei qual transportadora o cliente escolheu (pedido antigo). Gere a etiqueta direto na Melhor Envio.");
      if (MANUAL_ONLY_SERVICES[serviceId]) {
        return await fail(`${MANUAL_ONLY_SERVICES[serviceId]} não pode ser comprada por aqui (exige escolher a unidade). Gere essa etiqueta direto na Melhor Envio.`);
      }

      // 2. Carrinho
      const built = buildCartBody({ order, sender, document: settings.document, invoiceKey: order.invoiceKey, serviceId });
      estimated = built.estimated;
      const cart = await me.addToCart(built.body);
      meId = cart.id;
      step = "cart";
      await store.save(orderId, { step: "cart", meOrderId: cart.id, protocol: cart.protocol, serviceId: cart.serviceId ?? serviceId, price: cart.price });
    }

    if (target === "cart") {
      await store.save(orderId, { status: "ok", note: estimated ? "Medidas estimadas: confira peso e caixa antes de pagar a etiqueta." : null });
      return { kind: "cart", meOrderId: meId!, estimated };
    }

    // 3. Compra (debita o saldo da carteira)
    if (step !== "purchased" && step !== "generated") {
      where = "checkout";
      let price: number | null = null;
      try {
        const bought = await me.checkout(meId!);
        price = bought.price ?? bought.total;
      } catch (err) {
        // Já foi paga numa tentativa anterior (ex.: resposta perdida): segue para a geração.
        if (!(err instanceof MeHttpError && err.status === 422 && ALREADY_PAID.test(err.messages.join(" ")))) throw err;
      }
      step = "purchased";
      await store.save(orderId, { step: "purchased", ...(price != null ? { price } : {}) });
    }

    // 4. Geração
    if (step !== "generated") {
      where = "generate";
      await me.generate(meId!);
      step = "generated";
      await store.save(orderId, { step: "generated" });
    }

    // 5. Rastreio (o código pode aparecer só depois; não é motivo para falhar)
    let tracking: string | null = null;
    try {
      tracking = (await me.tracking(meId!)).tracking;
    } catch {
      /* a equipe atualiza depois */
    }
    await store.save(orderId, { status: "ok", tracking, note: estimated ? "Medidas estimadas: a Melhor Envio pode cobrar ajuste de peso." : null });
    if (tracking) await store.saveTracking(orderId, tracking);
    await store.markInPreparation(orderId);
    return { kind: "generated", meOrderId: meId!, tracking, price: null, estimated };
  } catch (err) {
    if (err instanceof LabelFailure) return await fail(err.message);
    console.error("[labels] pedido", orderId, "passo", where, err instanceof Error ? err.message : err);
    return await fail(describeMeError(err, where));
  }
}
