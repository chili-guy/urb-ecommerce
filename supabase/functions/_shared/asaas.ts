// Cliente do Asaas (API v3) + montagem dos corpos de cobrança. Formatos conferidos em
// docs.asaas.com: autenticação no cabeçalho `access_token`, `User-Agent` obrigatório,
// cartão direto com `creditCard` + `creditCardHolderInfo` + `remoteIp` (IP do COMPRADOR).
//
// Dados de cartão passam por aqui só pra seguir ao Asaas — nunca são gravados nem logados.

import { IntegrationError } from "./errors.ts";

export type AsaasConfig = {
  apiKey: string;
  baseUrl: string;
  sandbox: boolean;
  userAgent: string;
};

/** null = sem chave. O ambiente vem de ASAAS_ENV ou, sem ele, do prefixo da chave ($aact_hmlg_ = teste). */
export function loadAsaasConfig(env: { get(name: string): string | undefined }): AsaasConfig | null {
  const apiKey = env.get("ASAAS_API_KEY")?.trim();
  if (!apiKey) return null;
  const explicit = env.get("ASAAS_ENV")?.trim().toLowerCase();
  const sandbox = explicit ? explicit === "sandbox" : apiKey.includes("_hmlg_");
  return {
    apiKey,
    sandbox,
    baseUrl: sandbox ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3",
    userAgent: "UR3 Loja Virtual",
  };
}

export class AsaasError extends Error {
  status: number;
  descriptions: string[];
  constructor(status: number, descriptions: string[]) {
    super(`Asaas HTTP ${status}${descriptions.length ? `: ${descriptions.join(" | ")}` : ""}`);
    this.name = "AsaasError";
    this.status = status;
    this.descriptions = descriptions;
  }
}

export async function asaasRequest<T>(
  cfg: AsaasConfig,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<T> {
  const res = await (opts.fetchImpl ?? fetch)(cfg.baseUrl + path, {
    method,
    headers: {
      access_token: cfg.apiKey,
      "Content-Type": "application/json",
      "User-Agent": cfg.userAgent,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Com cartão, o Asaas pede no mínimo 60s pra evitar cobrança duplicada em caso de demora.
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* corpo não-JSON */
  }
  if (!res.ok) {
    const errors = (json as { errors?: { description?: string }[] } | null)?.errors;
    throw new AsaasError(
      res.status,
      Array.isArray(errors) ? errors.map((e) => String(e.description ?? "")).filter(Boolean) : [],
    );
  }
  return json as T;
}

/** YYYY-MM-DD no fuso de Brasília (o vencimento do Asaas é por data, não por hora). */
export function todayInSaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

export type CustomerFields = {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  postalCode: string;
  addressNumber: string;
  complement?: string;
};

export function buildCustomerBody(c: CustomerFields) {
  const landline = c.phone.length === 10;
  return {
    name: c.name,
    email: c.email,
    cpfCnpj: c.cpfCnpj,
    ...(landline ? { phone: c.phone } : { mobilePhone: c.phone }),
    postalCode: c.postalCode,
    addressNumber: c.addressNumber,
    ...(c.complement ? { complement: c.complement } : {}),
  };
}

export type CardFields = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

type PaymentCommon = { customerId: string; orderId: number; total: number; dueDate: string; description: string };

export function buildPixPaymentBody(p: PaymentCommon) {
  return {
    customer: p.customerId,
    billingType: "PIX" as const,
    value: p.total,
    dueDate: p.dueDate,
    description: p.description,
    externalReference: String(p.orderId),
  };
}

export function buildCardPaymentBody(
  p: PaymentCommon & { installments: number; card: CardFields; holder: CustomerFields; remoteIp: string },
) {
  return {
    customer: p.customerId,
    billingType: "CREDIT_CARD" as const,
    // Parcelado: o Asaas divide o total e acerta a diferença de centavos na última parcela.
    ...(p.installments > 1 ? { installmentCount: p.installments, totalValue: p.total } : { value: p.total }),
    dueDate: p.dueDate,
    description: p.description,
    externalReference: String(p.orderId),
    creditCard: {
      holderName: p.card.holderName,
      number: p.card.number,
      expiryMonth: p.card.expiryMonth,
      expiryYear: p.card.expiryYear,
      ccv: p.card.ccv,
    },
    creditCardHolderInfo: {
      name: p.holder.name,
      email: p.holder.email,
      cpfCnpj: p.holder.cpfCnpj,
      postalCode: p.holder.postalCode,
      addressNumber: p.holder.addressNumber,
      ...(p.holder.complement ? { addressComplement: p.holder.complement } : {}),
      phone: p.holder.phone,
      ...(p.holder.phone.length === 11 ? { mobilePhone: p.holder.phone } : {}),
    },
    remoteIp: p.remoteIp,
  };
}

export type AsaasPayment = { id: string; status: string; invoiceUrl?: string; value?: number };

const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
export const isPaidStatus = (status: string | undefined): boolean => PAID_STATUSES.has(String(status));

/**
 * O que fazer com uma cobrança na hora do estorno, conforme o status que o Asaas mostra:
 * - refund: paga (cartão CONFIRMED / Pix RECEIVED), dá pra pedir o estorno;
 * - already: o estorno já foi pedido ou feito (tentar de novo seria erro) — só fechamos o pedido;
 * - blocked: não há o que estornar (aguardando, vencida, recebida em dinheiro, contestação...).
 */
export function planRefund(status: string | undefined): "refund" | "already" | "blocked" {
  switch (String(status)) {
    case "CONFIRMED":
    case "RECEIVED":
      return "refund";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
      return "already";
    default:
      return "blocked";
  }
}

/** Acha o cliente pelo CPF/CNPJ (evita duplicar) ou cria. */
export async function findOrCreateCustomer(cfg: AsaasConfig, c: CustomerFields): Promise<string> {
  const found = await asaasRequest<{ data?: { id: string }[] }>(
    cfg,
    "GET",
    `/customers?cpfCnpj=${encodeURIComponent(c.cpfCnpj)}&limit=1`,
  );
  if (found.data?.[0]?.id) return found.data[0].id;
  const created = await asaasRequest<{ id?: string }>(cfg, "POST", "/customers", buildCustomerBody(c));
  if (!created.id) throw new IntegrationError("Asaas não devolveu o id do cliente.");
  return created.id;
}

export type PixQrCode = { encodedImage: string; payload: string; expirationDate?: string };

export function getPixQrCode(cfg: AsaasConfig, paymentId: string): Promise<PixQrCode> {
  return asaasRequest<PixQrCode>(cfg, "GET", `/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
}

/** Mensagem que pode ir pro cliente quando o cartão é recusado. Nunca devolve dados da requisição. */
export function cardErrorMessage(err: AsaasError): string {
  const first = err.descriptions[0]?.trim();
  if (err.status === 400 && first && first.length <= 220) return first;
  return "Pagamento não autorizado. Confira os dados do cartão ou tente outro cartão.";
}
