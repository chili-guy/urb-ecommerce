// Liga o fluxo de etiquetas (labels.ts) ao banco: lê configuração e pedido, reserva a vez de gerar,
// grava o andamento. Também tem o disparo automático depois do pagamento e o cancelamento no estorno.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  createMeApi,
  parseLabelSettings,
  parseSender,
  runLabelFlow,
  type ClaimResult,
  type LabelItem,
  type LabelOrder,
  type LabelStore,
  type MeApi,
  type ShipmentPatch,
} from "./labels.ts";
import { loadShippingConfig } from "./shipping.ts";
import { serviceClient } from "./http.ts";

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function supabaseLabelStore(db: SupabaseClient): LabelStore {
  return {
    async loadSettings() {
      const { data, error } = await db.from("private_settings").select("key, value").in("key", ["shipping_labels", "shipping_sender"]);
      if (error) throw error;
      const byKey = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
      return { settings: parseLabelSettings(byKey.get("shipping_labels")), sender: parseSender(byKey.get("shipping_sender")) };
    },

    async loadOrder(orderId): Promise<LabelOrder | null> {
      const { data: o, error } = await db
        .from("orders")
        .select("id, status, payment_status, subtotal, customer_name, customer_email, customer_cpf, customer_phone, invoice_key, shipping_option, shipping_address")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!o) return null;

      const { data: rows, error: itemsErr } = await db
        .from("order_items")
        .select("product_id, product_name, quantity, unit_price")
        .eq("order_id", orderId);
      if (itemsErr) throw itemsErr;

      const ids = [...new Set((rows ?? []).map((r: { product_id: number | null }) => r.product_id).filter((x: number | null): x is number => x != null))];
      const pkg = new Map<number, { weight_g: unknown; width_cm: unknown; height_cm: unknown; length_cm: unknown }>();
      if (ids.length > 0) {
        const { data: prods, error: prodErr } = await db.from("products").select("id, weight_g, width_cm, height_cm, length_cm").in("id", ids);
        if (prodErr) throw prodErr;
        for (const p of prods ?? []) pkg.set(p.id, p);
      }

      const items: LabelItem[] = (rows ?? []).map(
        (r: { product_id: number | null; product_name: string; quantity: number; unit_price: unknown }) => {
          const p = r.product_id != null ? pkg.get(r.product_id) : undefined;
          return {
            productId: r.product_id,
            name: r.product_name,
            quantity: Number(r.quantity),
            unitPrice: Number(r.unit_price),
            weightG: numOrNull(p?.weight_g),
            widthCm: numOrNull(p?.width_cm),
            heightCm: numOrNull(p?.height_cm),
            lengthCm: numOrNull(p?.length_cm),
          };
        },
      );

      const a = (o.shipping_address ?? null) as Record<string, string> | null;
      return {
        id: o.id,
        status: o.status,
        paymentStatus: o.payment_status,
        subtotal: Number(o.subtotal),
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerCpf: o.customer_cpf,
        customerPhone: o.customer_phone,
        invoiceKey: o.invoice_key ?? null,
        serviceOptionId: (o.shipping_option as { id?: string } | null)?.id ?? null,
        address: a
          ? {
              postalCode: String(a.postalCode ?? ""),
              street: String(a.street ?? ""),
              number: String(a.number ?? ""),
              complement: String(a.complement ?? ""),
              district: String(a.district ?? ""),
              city: String(a.city ?? ""),
              state: String(a.state ?? "").toUpperCase(),
            }
          : null,
        items,
      };
    },

    async claim(orderId): Promise<ClaimResult> {
      const { data, error } = await db.rpc("claim_shipment", { p_order_id: orderId });
      if (error) throw error;
      return data as ClaimResult;
    },

    async save(orderId, patch: ShipmentPatch) {
      const row: Record<string, unknown> = {};
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.step !== undefined) row.step = patch.step;
      if (patch.meOrderId !== undefined) row.me_order_id = patch.meOrderId;
      if (patch.protocol !== undefined) row.protocol = patch.protocol;
      if (patch.serviceId !== undefined) row.service_id = patch.serviceId;
      if (patch.price !== undefined) row.price = patch.price;
      if (patch.tracking !== undefined) row.tracking = patch.tracking;
      if (patch.note !== undefined) row.note = patch.note;
      const { error } = await db.from("order_shipments").update(row).eq("order_id", orderId);
      if (error) throw error;
    },

    async saveInvoiceKey(orderId, key) {
      const { error } = await db.from("orders").update({ invoice_key: key }).eq("id", orderId);
      if (error) throw error;
    },

    async saveTracking(orderId, code) {
      const { error } = await db.from("orders").update({ tracking_code: code }).eq("id", orderId);
      if (error) throw error;
    },

    async markInPreparation(orderId) {
      const { error } = await db.from("orders").update({ status: "Em separação" }).eq("id", orderId).eq("status", "Pedido confirmado");
      if (error) throw error;
    },
  };
}

/**
 * Dispara a geração automática depois do pagamento SEM segurar a resposta (o Asaas espera um 200 rápido):
 * em segundo plano (EdgeRuntime.waitUntil). Nunca lança: falha vira anotação no pedido.
 */
export function triggerAutoLabel(orderId: number): void {
  const job = (async () => {
    try {
      const cfg = loadShippingConfig(Deno.env);
      if (!cfg) return;
      const result = await runLabelFlow({ store: supabaseLabelStore(serviceClient()), me: createMeApi(cfg), orderId, trigger: "auto" });
      console.log("[labels] auto pedido", orderId, "->", result.kind, "reason" in result ? result.reason : "note" in result ? result.note : "");
    } catch (err) {
      console.error("[labels] erro ao gerar etiqueta automática do pedido", orderId, err instanceof Error ? err.message : err);
    }
  })();
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(job);
}

/**
 * Estorno: se a etiqueta já foi comprada, tenta cancelar na Melhor Envio (a carteira recebe o valor de volta
 * em até 12 horas, se a transportadora ainda não coletou). Devolve o que aconteceu, para avisar a equipe.
 */
export async function cancelLabelOnRefund(
  db: SupabaseClient,
  me: MeApi,
  orderId: number,
): Promise<"none" | "cart" | "cancelled" | "failed"> {
  const { data: ship } = await db.from("order_shipments").select("me_order_id, step").eq("order_id", orderId).maybeSingle();
  if (!ship?.me_order_id) return "none";
  if (ship.step === "cart") {
    await db.from("order_shipments").update({ note: "Pedido estornado: o envio no carrinho da Melhor Envio expira sozinho em 7 dias." }).eq("order_id", orderId);
    return "cart";
  }
  try {
    const ok = await me.cancel(ship.me_order_id, `Pedido #${orderId} estornado`);
    await db
      .from("order_shipments")
      .update({ note: ok ? "Etiqueta cancelada no estorno. O valor volta para a carteira em até 12 horas." : "Estorno feito, mas a Melhor Envio não cancelou a etiqueta: cancele no painel deles." })
      .eq("order_id", orderId);
    return ok ? "cancelled" : "failed";
  } catch (err) {
    console.error("[labels] não consegui cancelar a etiqueta do pedido", orderId, err instanceof Error ? err.message : err);
    await db
      .from("order_shipments")
      .update({ note: "Estorno feito, mas não consegui cancelar a etiqueta: cancele no painel da Melhor Envio." })
      .eq("order_id", orderId);
    return "failed";
  }
}
