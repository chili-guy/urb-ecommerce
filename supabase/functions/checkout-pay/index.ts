// Fecha a compra: confere tudo no servidor, reserva o estoque, cria o pedido e cobra no Asaas
// (Pix ou cartão). Só cliente logado. Preço, frete e total NUNCA vêm do navegador.
//
// Fluxo: valida -> recotação do frete -> create_checkout_order (reserva o estoque) ->
//        cliente + cobrança no Asaas -> Pix: guarda o QR / cartão: confirma na hora ou fica em análise.
// Falha ao cobrar = o pedido é cancelado e o estoque volta. Exceção: se não dá pra saber se o
// cartão foi cobrado (tempo esgotado), o pedido fica aguardando e o aviso do Asaas decide.
//
// Dados de cartão só passam por aqui rumo ao Asaas: não são gravados nem escritos em log.
//
// Deploy: supabase functions deploy checkout-pay        (verificação de login ligada)

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  AsaasError,
  asaasRequest,
  buildCardPaymentBody,
  buildPixPaymentBody,
  cardErrorMessage,
  findOrCreateCustomer,
  getPixQrCode,
  isPaidStatus,
  loadAsaasConfig,
  todayInSaoPaulo,
  type AsaasConfig,
  type AsaasPayment,
  type CustomerFields,
} from "../_shared/asaas.ts";
import { parseCheckoutInput, type CheckoutInput } from "../_shared/checkout-input.ts";
import { IntegrationError, UserError } from "../_shared/errors.ts";
import { CORS_HEADERS, json, serviceClient } from "../_shared/http.ts";
import { installmentsAllowed, maxInstallments } from "../_shared/installments.ts";
import { loadInstallmentSettings } from "../_shared/store-settings.ts";
import { loadShippingConfig, quoteForItems } from "../_shared/shipping.ts";
import { productLoader } from "../_shared/shipping-db.ts";

/** A chamada que cobra o cartão ficou sem resposta: pode ou não ter cobrado. */
class UncertainChargeError extends Error {}

const PIX_WINDOW_MIN = 30; // quanto tempo o estoque fica reservado esperando o Pix
const CARD_WINDOW_MIN = 120; // cartão em análise pode demorar mais

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (!ip) throw new UserError("Não foi possível identificar sua conexão para o pagamento com cartão. Tente com Pix.", 400);
  return ip;
}

async function cancelOrder(db: SupabaseClient, orderId: number, note: string) {
  const { error } = await db.rpc("cancel_unpaid_order", {
    p_order_id: orderId,
    p_payment_status: "failed",
    p_note: note,
  });
  if (error) console.error("[checkout-pay] não consegui cancelar o pedido", orderId, error.message);
}

async function charge(args: {
  db: SupabaseClient;
  cfg: AsaasConfig;
  req: Request;
  input: CheckoutInput;
  orderId: number;
  total: number;
}): Promise<{ paymentStatus: "paid" | "pending" }> {
  const { db, cfg, input, orderId, total } = args;
  const holder: CustomerFields = {
    name: input.customer.name,
    email: input.customer.email,
    cpfCnpj: input.customer.cpfCnpj,
    phone: input.customer.phone,
    postalCode: input.address.postalCode,
    addressNumber: input.address.number,
    complement: input.address.complement || undefined,
  };
  const customerId = await findOrCreateCustomer(cfg, holder);
  const common = {
    customerId,
    orderId,
    total,
    dueDate: todayInSaoPaulo(),
    description: `Pedido #${orderId} - UR3`,
  };

  if (input.paymentMethod === "pix") {
    const payment = await asaasRequest<AsaasPayment>(cfg, "POST", "/payments", buildPixPaymentBody(common));
    try {
      const qr = await getPixQrCode(cfg, payment.id);
      const { error } = await db
        .from("orders")
        .update({
          payment_id: payment.id,
          payment_data: {
            invoiceUrl: payment.invoiceUrl ?? null,
            pix: { payload: qr.payload, encodedImage: qr.encodedImage, expirationDate: qr.expirationDate ?? null },
          },
        })
        .eq("id", orderId);
      if (error) throw error;
    } catch (err) {
      // Cobrança criada mas sem QR utilizável: remove no Asaas pra ninguém pagar sem pedido.
      await asaasRequest(cfg, "DELETE", `/payments/${payment.id}`).catch(() => undefined);
      throw err;
    }
    return { paymentStatus: "pending" };
  }

  // cartão
  const cardBody = buildCardPaymentBody({
    ...common,
    installments: input.installments,
    card: input.card!,
    holder: { ...holder, name: input.card!.holderName },
    remoteIp: clientIp(args.req),
  });
  let payment: AsaasPayment;
  try {
    payment = await asaasRequest<AsaasPayment>(cfg, "POST", "/payments", cardBody, { timeoutMs: 60000 });
  } catch (err) {
    if (err instanceof AsaasError) throw err; // o Asaas respondeu "não": nada foi cobrado
    throw new UncertainChargeError(err instanceof Error ? err.message : "sem resposta");
  }
  const { error: updErr } = await db
    .from("orders")
    .update({
      payment_id: payment.id,
      installments: input.installments,
      payment_data: { invoiceUrl: payment.invoiceUrl ?? null },
    })
    .eq("id", orderId);
  if (updErr) console.error("[checkout-pay] pedido", orderId, "cobrado mas não gravou o id do pagamento:", updErr.message);

  if (isPaidStatus(payment.status)) {
    const { error } = await db.rpc("mark_order_paid", { p_order_id: orderId, p_payment_id: payment.id });
    if (error) console.error("[checkout-pay] pedido", orderId, "pago mas mark_order_paid falhou:", error.message);
    return { paymentStatus: "paid" };
  }
  return { paymentStatus: "pending" }; // em análise: o aviso do Asaas confirma ou recusa
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);

  let orderIdForLog: number | null = null;
  try {
    const db = serviceClient();

    // 1. quem está comprando
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await db.auth.getUser(jwt);
    if (!auth.user) throw new UserError("Faça login para finalizar a compra.", 401);

    // 2. dados do pedido
    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {
      /* cai na validação */
    }
    const input = parseCheckoutInput(raw);

    // 3. integrações configuradas?
    const shipCfg = loadShippingConfig(Deno.env);
    const asaasCfg = loadAsaasConfig(Deno.env);
    if (!shipCfg || !asaasCfg) {
      console.error("[checkout-pay] integração não configurada: frete=", !!shipCfg, "pagamento=", !!asaasCfg);
      throw new UserError("O pagamento ainda não está disponível. Tente mais tarde.", 503);
    }

    // 4. libera reservas vencidas (estoque de quem não pagou volta pra loja)
    await db.rpc("expire_unpaid_orders");

    // 5. frete recotado no servidor — o valor do navegador é ignorado
    const { options } = await quoteForItems({
      cfg: shipCfg,
      items: input.items,
      destCep: input.address.postalCode,
      loadProducts: productLoader(db),
    });
    const shipping = options.find((o) => o.id === input.shippingServiceId);
    if (!shipping) throw new UserError("O frete escolhido não está mais disponível. Recalcule o frete.", 409);

    // 6. pedido + reserva de estoque (atômico)
    const { data: created, error: createErr } = await db.rpc("create_checkout_order", {
      p_user_id: auth.user.id,
      p_items: input.items,
      p_shipping: shipping,
      p_customer: {
        name: input.customer.name,
        email: input.customer.email,
        cpf: input.customer.cpfCnpj,
        phone: input.customer.phone,
        postalCode: input.address.postalCode,
        address: input.address,
      },
      p_coupon_code: input.couponCode,
      p_payment_method: input.paymentMethod,
      p_expires_minutes: input.paymentMethod === "pix" ? PIX_WINDOW_MIN : CARD_WINDOW_MIN,
      p_idempotency_key: input.idempotencyKey,
    });
    if (createErr) {
      // exceções "raise exception" do banco já vêm em português (estoque, cupom, valor mínimo...)
      if (createErr.code === "P0001") throw new UserError(createErr.message, 409);
      throw new IntegrationError(`create_checkout_order: ${createErr.message}`);
    }
    const orderId = Number((created as { orderId: number }).orderId);
    orderIdForLog = orderId;

    const { data: order, error: readErr } = await db
      .from("orders")
      .select("id, total, status, payment_status, payment_id")
      .eq("id", orderId)
      .single();
    if (readErr || !order) throw new IntegrationError(`pedido ${orderId} não encontrado depois de criado`);

    // Reenvio da mesma tentativa: devolve o que já existe, sem cobrar de novo.
    if (order.payment_id || order.status !== "Aguardando pagamento") {
      return json({ ok: true, orderId, paymentStatus: order.payment_status, method: input.paymentMethod });
    }

    const total = Number(order.total);
    if (input.paymentMethod === "credit_card") {
      // A regra vem do painel (Pagamentos); o número que o navegador mandou só vale se couber nela.
      const settings = await loadInstallmentSettings(db);
      if (!installmentsAllowed(total, input.installments, settings)) {
        await cancelOrder(db, orderId, "Parcelamento fora do permitido.");
        const max = maxInstallments(total, settings);
        throw new UserError(
          max === 1
            ? "Essa compra só pode ser paga à vista no cartão."
            : `Esse parcelamento não está disponível. Escolha até ${max}x.`,
          422,
        );
      }
    }

    // 7. cobrança
    try {
      const { paymentStatus } = await charge({ db, cfg: asaasCfg, req, input, orderId, total });
      return json({ ok: true, orderId, paymentStatus, method: input.paymentMethod });
    } catch (err) {
      if (err instanceof AsaasError) {
        // O Asaas respondeu "não": nada foi cobrado. Desfaz o pedido e devolve o estoque.
        await cancelOrder(db, orderId, "Pagamento não aprovado.");
        console.error("[checkout-pay] pedido", orderId, "recusado pelo Asaas:", err.status, err.descriptions.join(" | "));
        if (input.paymentMethod === "credit_card") throw new UserError(cardErrorMessage(err), 402);
        throw new UserError("Não foi possível gerar o Pix agora. Tente novamente.", 502);
      }
      if (err instanceof UncertainChargeError) {
        // Sem resposta (tempo esgotado/rede): o cartão PODE ter sido cobrado. Não cancela — o aviso do Asaas decide.
        console.error("[checkout-pay] pedido", orderId, "cartão sem resposta do Asaas; mantido aguardando:", err.message);
        return json({ ok: true, orderId, paymentStatus: "pending", method: "credit_card", unconfirmed: true });
      }
      if (err instanceof UserError) {
        await cancelOrder(db, orderId, err.message);
        throw err;
      }
      await cancelOrder(db, orderId, "Falha ao gerar o pagamento.");
      throw err;
    }
  } catch (err) {
    if (err instanceof UserError) return json({ ok: false, error: err.message }, err.status);
    console.error("[checkout-pay] pedido", orderIdForLog, err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Não foi possível processar o pagamento agora. Tente novamente em instantes." }, 502);
  }
});
