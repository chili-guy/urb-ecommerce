// Estorna um pedido pago pelo painel: pede o reembolso total ao Asaas e fecha o pedido
// (Cancelado + Reembolsado), devolvendo ou não os itens ao estoque do site. Só administrador.
//
// Seguro de repetir: se o estorno já foi pedido ao Asaas, não pede de novo — só termina de
// atualizar o pedido. Se o Asaas recusar (ex.: saldo insuficiente para estornar um Pix),
// nada muda no pedido e a mensagem do Asaas aparece pro administrador.
//
// Pedido: { orderId: number, restoreStock: boolean, reason?: string }
// Deploy: supabase functions deploy order-refund        (verificação de login ligada)

import { AsaasError, asaasRequest, loadAsaasConfig, planRefund, type AsaasPayment } from "../_shared/asaas.ts";
import { UserError } from "../_shared/errors.ts";
import { CORS_HEADERS, authenticateAdmin, json, serviceClient } from "../_shared/http.ts";

function stamp(now = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(now);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let orderIdForLog: number | null = null;
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.isAdmin) return json({ ok: false, error: "Só administradores podem estornar pagamentos." }, 403);

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.orderId);
    if (!Number.isInteger(orderId) || orderId < 1) throw new UserError("Pedido inválido.");
    orderIdForLog = orderId;
    const restoreStock = body?.restoreStock === true;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 160) : "";

    const cfg = loadAsaasConfig(Deno.env);
    if (!cfg) throw new UserError("O Asaas não está configurado.", 503);

    const db = serviceClient();
    const { data: order, error: readErr } = await db
      .from("orders")
      .select("id, status, payment_status, payment_id")
      .eq("id", orderId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!order) throw new UserError("Pedido não encontrado.", 404);

    if (order.payment_status === "refunded" && order.status === "Cancelado") {
      return json({ ok: true, result: "already_refunded" });
    }
    if (!order.payment_id || !["paid", "refunded"].includes(String(order.payment_status))) {
      throw new UserError("Esse pedido não tem um pagamento confirmado para estornar.", 409);
    }

    const note = `Estornado pelo painel em ${stamp()}${reason ? ` — ${reason}` : ""}.`;

    // Grava a escolha antes de pedir ao Asaas: se o aviso de estorno chegar primeiro, o banco já sabe.
    const { error: intentErr } = await db
      .from("orders")
      .update({ refund_intent: { restoreStock, note } })
      .eq("id", orderId);
    if (intentErr) throw intentErr;

    try {
      const payment = await asaasRequest<AsaasPayment>(cfg, "GET", `/payments/${encodeURIComponent(order.payment_id)}`);
      const plan = planRefund(payment.status);
      if (plan === "blocked") {
        throw new UserError(`O Asaas mostra essa cobrança como "${payment.status}": não há o que estornar.`, 409);
      }
      if (plan === "refund") {
        await asaasRequest(cfg, "POST", `/payments/${encodeURIComponent(order.payment_id)}/refund`, {
          description: `Estorno do pedido #${orderId}`,
        });
      }
    } catch (err) {
      await db.from("orders").update({ refund_intent: null }).eq("id", orderId);
      if (err instanceof AsaasError) {
        console.error("[order-refund] Asaas recusou o estorno do pedido", orderId, err.status, err.descriptions.join(" | "));
        throw new UserError(
          `O Asaas não aceitou o estorno: ${err.descriptions[0] || `erro ${err.status}`}`,
          422,
        );
      }
      throw err;
    }

    const { data: result, error: recErr } = await db.rpc("refund_order_record", {
      p_order_id: orderId,
      p_restore_stock: restoreStock,
      p_note: note,
    });
    if (recErr) {
      console.error("[order-refund] estorno pedido no Asaas, mas o pedido não foi atualizado:", orderId, recErr.message);
      return json(
        {
          ok: false,
          error:
            "O estorno foi pedido ao Asaas, mas não consegui atualizar o pedido. Tente de novo: ele não estorna duas vezes.",
        },
        500,
      );
    }

    console.log("[order-refund] pedido", orderId, "estornado por", auth.userId, "estoque:", restoreStock, "->", result);
    return json({ ok: true, result });
  } catch (err) {
    if (err instanceof UserError) return json({ ok: false, error: err.message }, err.status);
    console.error("[order-refund] pedido", orderIdForLog, err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Não consegui estornar agora. Tente de novo em instantes." }, 502);
  }
});
