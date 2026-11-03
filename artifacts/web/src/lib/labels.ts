// Etiquetas da Melhor Envio no painel: tipos, o cadastro do remetente e o texto de cada situação.
// Quem gera de verdade é o servidor (supabase/functions/_shared/labels.ts).

export type LabelMode = "off" | "cart" | "full";
export type LabelDocument = "invoice" | "content_declaration";

export type LabelSettings = {
  /** off = não gera sozinho; cart = só cria o envio no carrinho; full = compra e gera a etiqueta. */
  mode: LabelMode;
  /** null = a loja ainda não escolheu (a geração automática não roda sem isso). */
  document: LabelDocument | null;
};

export const DEFAULT_LABEL_SETTINGS: LabelSettings = { mode: "off", document: null };

export type Sender = {
  name: string;
  /** CPF (11 dígitos) ou CNPJ (14), só números. */
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

export function parseLabelSettings(raw: unknown): LabelSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    mode: o.mode === "cart" || o.mode === "full" ? o.mode : "off",
    document: o.document === "invoice" || o.document === "content_declaration" ? o.document : null,
  };
}

const digits = (v: unknown): string => String(v ?? "").replace(/\D/g, "");

export function parseSender(raw: unknown): Sender {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
  return {
    name: s(o.name),
    document: digits(o.document),
    stateRegister: s(o.stateRegister, 30),
    phone: digits(o.phone),
    email: s(o.email).toLowerCase(),
    postalCode: digits(o.postalCode).slice(0, 8),
    address: s(o.address),
    number: s(o.number, 12),
    complement: s(o.complement, 80),
    district: s(o.district, 80),
    city: s(o.city, 80),
    state: s(o.state, 2).toUpperCase(),
  };
}

/** O que falta no cadastro do remetente (vazio = completo). Mesma regra do servidor. */
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
  return (rest < 2 ? 0 : 11 - rest) === Number(key[43]);
}

/** Linha de andamento (tabela order_shipments). Só a equipe enxerga. */
export type OrderShipment = {
  orderId: number;
  status: "processing" | "ok" | "failed";
  step: "cart" | "purchased" | "generated" | null;
  meOrderId: string | null;
  protocol: string | null;
  price: number | null;
  tracking: string | null;
  note: string | null;
  attempts: number;
  updatedAt: string;
};

export type ShipmentTone = "neutral" | "warn" | "ok" | "bad";

/** Rótulo curto para a lista de pedidos. `paid` = o pedido está pago e não cancelado. */
export function shipmentBadge(s: OrderShipment | undefined, paid: boolean): { text: string; tone: ShipmentTone } {
  if (!s) return paid ? { text: "Sem etiqueta", tone: "neutral" } : { text: "—", tone: "neutral" };
  if (s.step === "generated") return { text: "Etiqueta gerada", tone: "ok" };
  if (s.status === "processing") return { text: "Gerando...", tone: "warn" };
  if (s.status === "failed") return { text: "Falhou", tone: "bad" };
  if (s.step === "cart") return { text: "No carrinho", tone: "warn" };
  return { text: "Sem etiqueta", tone: "neutral" };
}
