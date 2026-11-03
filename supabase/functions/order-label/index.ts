// Etiquetas da Melhor Envio pelo painel. Ações (POST, JSON com "action"):
//   generate  { orderId, invoiceKey? }  compra e gera a etiqueta (ou continua de onde parou)  — equipe
//   print     { orderId }               devolve o link para imprimir a etiqueta               — equipe
//   tracking  { orderId }               atualiza o código de rastreio                         — equipe
//   cancel    { orderId }               cancela a etiqueta comprada (saldo volta em até 12 h) — equipe
//   check     {}                        mostra o saldo da carteira e se o cadastro está completo — só administrador
//
// A geração automática depois do pagamento usa o mesmo fluxo (_shared/labels.ts).
// Deploy: supabase functions deploy order-label        (verificação de login ligada)

import { UserError } from "../_shared/errors.ts";
import { CORS_HEADERS, authenticateAdmin, authenticateStaff, json, serviceClient } from "../_shared/http.ts";
import { supabaseLabelStore } from "../_shared/label-store.ts";
import { createMeApi, describeMeError, runLabelFlow, senderProblems } from "../_shared/labels.ts";
import { loadShippingConfig } from "../_shared/shipping.ts";

const SKIPPED: Record<string, string> = {
  in_progress: "Já existe uma geração em andamento para este pedido. Aguarde um minuto e confira de novo.",
  not_paid: "Este pedido não está pago (ou foi cancelado/estornado).",
  not_found: "Pedido não encontrado.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    if (!["generate", "print", "tracking", "cancel", "check"].includes(action)) throw new UserError("Ação inválida.");

    if (action === "check") {
      if (!(await authenticateAdmin(req)).isAdmin) return json({ ok: false, error: "Só administradores podem testar a conexão." }, 403);
    } else if (!(await authenticateStaff(req)).isStaff) {
      return json({ ok: false, error: "Só a equipe pode gerar etiquetas." }, 403);
    }

    const cfg = loadShippingConfig(Deno.env);
    if (!cfg) throw new UserError("A Melhor Envio ainda não está configurada (token, CEP de origem e e-mail).", 503);
    const me = createMeApi(cfg);
    const db = serviceClient();
    const store = supabaseLabelStore(db);

    if (action === "check") {
      const { settings, sender } = await store.loadSettings();
      const problems = senderProblems(sender);
      let balance: { balance: number; reserved: number; debts: number } | null = null;
      let tokenNote: string | null = null;
      try {
        balance = await me.balance();
      } catch (err) {
        tokenNote = describeMeError(err, "balance");
      }
      return json({ ok: true, settings, senderMissing: problems, balance, tokenNote });
    }

    const orderId = Number(body?.orderId);
    if (!Number.isInteger(orderId) || orderId < 1) throw new UserError("Pedido inválido.");

    if (action === "generate") {
      const result = await runLabelFlow({
        store,
        me,
        orderId,
        trigger: "manual",
        invoiceKey: typeof body?.invoiceKey === "string" && body.invoiceKey.trim() ? body.invoiceKey : null,
      });
      if (result.kind === "failed") return json({ ok: false, error: result.note }, 422);
      if (result.kind === "skipped") {
        if (result.reason === "already_generated") return json({ ok: true, result: "already_generated" });
        return json({ ok: false, error: SKIPPED[result.reason] ?? "Não foi possível gerar a etiqueta agora." }, 409);
      }
      return json({ ok: true, result: result.kind, tracking: result.kind === "generated" ? result.tracking : null, estimated: result.estimated });
    }

    const { data: ship, error: shipErr } = await db
      .from("order_shipments")
      .select("me_order_id, step")
      .eq("order_id", orderId)
      .maybeSingle();
    if (shipErr) throw shipErr;
    if (!ship?.me_order_id) throw new UserError("Este pedido ainda não tem etiqueta.", 409);

    try {
      if (action === "print") {
        if (ship.step !== "generated") throw new UserError("A etiqueta ainda não foi gerada.", 409);
        return json({ ok: true, url: await me.print(ship.me_order_id) });
      }

      if (action === "tracking") {
        const t = await me.tracking(ship.me_order_id);
        if (t.tracking) {
          await db.from("order_shipments").update({ tracking: t.tracking }).eq("order_id", orderId);
          await db.from("orders").update({ tracking_code: t.tracking }).eq("id", orderId);
        }
        return json({ ok: true, tracking: t.tracking, status: t.status });
      }

      // cancel
      if (ship.step !== "purchased" && ship.step !== "generated") throw new UserError("Só dá para cancelar uma etiqueta já comprada.", 409);
      const canceled = await me.cancel(ship.me_order_id, `Cancelada pelo painel (pedido #${orderId})`);
      if (!canceled) throw new UserError("A Melhor Envio não cancelou: a transportadora já pode ter coletado ou postado o envio.", 409);
      await db
        .from("order_shipments")
        .update({
          status: "failed",
          step: null,
          me_order_id: null,
          tracking: null,
          note: "Etiqueta cancelada na Melhor Envio (o valor volta para a carteira em até 12 horas). Clique em Gerar etiqueta para criar outra.",
        })
        .eq("order_id", orderId);
      await db.from("orders").update({ tracking_code: null }).eq("id", orderId);
      return json({ ok: true, result: "cancelled" });
    } catch (err) {
      if (err instanceof UserError) throw err;
      return json({ ok: false, error: describeMeError(err, action as "print" | "tracking" | "cancel") }, 502);
    }
  } catch (err) {
    if (err instanceof UserError) return json({ ok: false, error: err.message }, err.status);
    console.error("[order-label]", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Não consegui concluir agora. Tente de novo em instantes." }, 502);
  }
});
