// Recebe os avisos (webhooks) do Asaas e atualiza o pedido: Pix/cartão confirmado, cartão
// recusado, cobrança vencida, reembolso. A Asaas autentica com o cabeçalho `asaas-access-token`
// (o mesmo valor do segredo ASAAS_WEBHOOK_TOKEN). Cada aviso tem um id: processar duas vezes é inofensivo.
//
// Responder 200 rápido importa: depois de 15 falhas seguidas o Asaas pausa a fila de avisos.
// Por isso só devolvemos erro (5xx) quando é uma falha nossa e vale a pena tentar de novo.
//
// URL pra cadastrar no Asaas: https://<projeto>.supabase.co/functions/v1/asaas-webhook
// Deploy: supabase functions deploy asaas-webhook --no-verify-jwt

import { CORS_HEADERS, json, serviceClient } from "../_shared/http.ts";
import { actionForEvent, tokenMatches, type AsaasWebhookBody } from "../_shared/payment-events.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false }, 405);

  if (!tokenMatches(req.headers.get("asaas-access-token"), Deno.env.get("ASAAS_WEBHOOK_TOKEN"))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: AsaasWebhookBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: true, ignored: "corpo ilegível" }); // 200: o Asaas não precisa tentar de novo
  }
  const eventId = body.id;
  const event = body.event ?? "";
  const payment = body.payment;
  if (!eventId || !event || !payment?.id) return json({ ok: true, ignored: "aviso sem dados de cobrança" });

  const db = serviceClient();
  try {
    // Registra o aviso; se já foi processado, não faz nada de novo.
    const slim = {
      event,
      payment: {
        id: payment.id,
        status: payment.status,
        externalReference: payment.externalReference,
        installment: payment.installment ?? null,
      },
    };
    const { error: insErr } = await db.from("payment_events").insert({ id: eventId, event, payload: slim });
    if (insErr) {
      if (insErr.code !== "23505") throw insErr;
      const { data: prev } = await db.from("payment_events").select("result").eq("id", eventId).maybeSingle();
      if (prev?.result) return json({ ok: true, duplicate: true });
    }

    await db.rpc("expire_unpaid_orders"); // aproveita pra liberar reservas vencidas

    // Acha o pedido: pela referência que mandamos (id do pedido) ou pelo id da cobrança.
    let orderId = Number(payment.externalReference);
    if (!Number.isInteger(orderId) || orderId < 1) {
      const { data: byPayment } = await db.from("orders").select("id").eq("payment_id", payment.id).maybeSingle();
      orderId = byPayment?.id ?? 0;
    }
    const { data: order } = orderId
      ? await db.from("orders").select("id, total").eq("id", orderId).maybeSingle()
      : { data: null };

    let result: string;
    const action = actionForEvent(event);
    if (!order) {
      result = action.kind === "ignore" ? "ignored" : "order_not_found";
    } else {
      switch (action.kind) {
        case "paid": {
          // Cobrança avulsa: o valor tem que bater com o pedido. Parcelas de cartão têm valor próprio.
          const single = !payment.installment;
          const value = Number(payment.value);
          if (single && Number.isFinite(value) && Math.abs(value - Number(order.total)) > 0.01) {
            result = "value_mismatch";
            console.error("[asaas-webhook] valor diferente do pedido", order.id, value, order.total);
            await db.from("orders").update({ payment_note: "Valor pago diferente do total do pedido: conferir no Asaas." }).eq("id", order.id);
            break;
          }
          const { data, error } = await db.rpc("mark_order_paid", { p_order_id: order.id, p_payment_id: payment.id });
          if (error) throw error;
          result = String(data);
          break;
        }
        case "failed":
        case "expired": {
          const { data, error } = await db.rpc("cancel_unpaid_order", {
            p_order_id: order.id,
            p_payment_status: action.kind,
            p_note: action.note,
          });
          if (error) throw error;
          result = data ? "cancelled" : "nothing_to_cancel";
          break;
        }
        case "refunded": {
          const { error } = await db
            .from("orders")
            .update({ payment_status: "refunded", payment_note: "Pagamento reembolsado no Asaas." })
            .eq("id", order.id)
            .eq("payment_status", "paid");
          if (error) throw error;
          result = "refunded";
          break;
        }
        case "chargeback": {
          const { error } = await db
            .from("orders")
            .update({ payment_note: "Contestação (chargeback) aberta no Asaas: verifique antes de enviar." })
            .eq("id", order.id);
          if (error) throw error;
          result = "chargeback_noted";
          break;
        }
        default:
          result = "ignored";
      }
    }

    await db.from("payment_events").update({ result, order_id: order?.id ?? null }).eq("id", eventId);
    return json({ ok: true, result });
  } catch (err) {
    console.error("[asaas-webhook] falha ao processar", eventId, event, err instanceof Error ? err.message : err);
    return json({ ok: false, error: "processing_failed" }, 500); // o Asaas tenta de novo
  }
});
