// Valida o corpo que o navegador manda pro checkout. O servidor nunca confia no que vem
// do cliente: preço, frete e estoque são recalculados; aqui só se confere formato e dados.

import { isValidCardNumber, isValidCpfCnpj, isValidEmail, isValidPhone, onlyDigits } from "./br-docs.ts";
import { UserError } from "./errors.ts";

export type CheckoutInput = {
  items: { productId: number; quantity: number }[];
  shippingServiceId: string;
  customer: { name: string; email: string; cpfCnpj: string; phone: string };
  address: {
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
  };
  couponCode: string | null;
  paymentMethod: "pix" | "credit_card";
  installments: number;
  card: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string } | null;
  idempotencyKey: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function text(v: unknown, label: string, { min = 1, max = 120, optional = false } = {}): string {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  if (!s && optional) return "";
  if (s.length < min) throw new UserError(`Preencha ${label}.`);
  if (s.length > max) throw new UserError(`${label[0].toUpperCase()}${label.slice(1)} é longo demais.`);
  return s;
}

/** Itens do carrinho: usado no checkout e na cotação de frete. */
export function parseItems(raw: unknown): { productId: number; quantity: number }[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 30) {
    throw new UserError("O carrinho está vazio ou grande demais.");
  }
  return raw.map((it) => {
    const productId = isObj(it) ? Number(it.productId) : NaN;
    const quantity = isObj(it) ? Number(it.quantity) : NaN;
    if (!Number.isInteger(productId) || productId < 1) throw new UserError("Produto inválido no carrinho.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new UserError("Quantidade inválida no carrinho.");
    return { productId, quantity };
  });
}

export function parseCheckoutInput(raw: unknown, now: Date = new Date()): CheckoutInput {
  if (!isObj(raw)) throw new UserError("Pedido inválido.");

  const items = parseItems(raw.items);

  const shippingServiceId = text(raw.shippingServiceId, "o frete", { max: 40 });
  if (!/^me-\d+$/.test(shippingServiceId)) throw new UserError("Escolha uma opção de frete.");

  // cliente
  const c = isObj(raw.customer) ? raw.customer : {};
  const customer = {
    name: text(c.name, "o nome completo", { min: 5 }),
    email: text(c.email, "o e-mail", { max: 160 }).toLowerCase(),
    cpfCnpj: onlyDigits(String(c.cpfCnpj ?? "")),
    phone: onlyDigits(String(c.phone ?? "")),
  };
  if (!/\s/.test(customer.name)) throw new UserError("Informe nome e sobrenome.");
  if (!isValidEmail(customer.email)) throw new UserError("E-mail inválido.");
  if (!isValidCpfCnpj(customer.cpfCnpj)) throw new UserError("CPF ou CNPJ inválido.");
  if (!isValidPhone(customer.phone)) throw new UserError("Telefone inválido. Use DDD + número.");

  // endereço
  const a = isObj(raw.address) ? raw.address : {};
  const postalCode = onlyDigits(String(a.postalCode ?? ""));
  if (postalCode.length !== 8) throw new UserError("CEP inválido.");
  const state = text(a.state, "o estado", { min: 2, max: 2 }).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new UserError("Estado inválido (use a sigla, ex.: SP).");
  const address = {
    postalCode,
    street: text(a.street, "a rua"),
    number: text(a.number, "o número", { max: 12 }),
    complement: text(a.complement, "o complemento", { optional: true, max: 80 }),
    district: text(a.district, "o bairro"),
    city: text(a.city, "a cidade"),
    state,
  };

  // pagamento
  const paymentMethod = raw.paymentMethod === "pix" ? "pix" : raw.paymentMethod === "credit_card" ? "credit_card" : null;
  if (!paymentMethod) throw new UserError("Escolha a forma de pagamento.");

  let card: CheckoutInput["card"] = null;
  let installments = 1;
  if (paymentMethod === "credit_card") {
    const k = isObj(raw.card) ? raw.card : {};
    const number = onlyDigits(String(k.number ?? ""));
    if (!isValidCardNumber(number)) throw new UserError("Número do cartão inválido.");
    const month = Number(onlyDigits(String(k.expiryMonth ?? "")));
    let year = Number(onlyDigits(String(k.expiryYear ?? "")));
    if (year < 100) year += 2000;
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new UserError("Mês de validade do cartão inválido.");
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    if (year < nowYear || year > nowYear + 20 || (year === nowYear && month < nowMonth)) {
      throw new UserError("Cartão vencido ou validade inválida.");
    }
    const ccv = onlyDigits(String(k.ccv ?? ""));
    if (ccv.length < 3 || ccv.length > 4) throw new UserError("Código de segurança (CVV) inválido.");
    card = {
      holderName: text(k.holderName, "o nome impresso no cartão", { min: 3, max: 80 }),
      number,
      expiryMonth: String(month).padStart(2, "0"),
      expiryYear: String(year),
      ccv,
    };
    installments = Number(raw.installments ?? 1);
    if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
      throw new UserError("Número de parcelas inválido.");
    }
  }

  const idempotencyKey = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : "";
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKey)) throw new UserError("Pedido inválido. Atualize a página e tente de novo.");

  const couponCode = typeof raw.couponCode === "string" && raw.couponCode.trim() ? raw.couponCode.trim().slice(0, 40) : null;

  return { items, shippingServiceId, customer, address, couponCode, paymentMethod, installments, card, idempotencyKey };
}
