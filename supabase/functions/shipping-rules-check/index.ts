// "Simulador" da aba Frete: o administrador digita um CEP e um valor de pedido e vê se teria
// frete grátis e por qual regra. Não cota nada na Melhor Envio. Só administrador.
//
//   { cep: "85810150", subtotal: 350 } ->
//   { ok: true, place: { uf: "PR", city: "Cascavel" } | null, appliedRule: { id, name, scope } | null,
//     matched: [{ id, name, scope }], needsPlace: boolean }
//
// Deploy: supabase functions deploy shipping-rules-check        (verificação de login ligada)

import { onlyDigits } from "../_shared/br-docs.ts";
import { UserError } from "../_shared/errors.ts";
import { CORS_HEADERS, authenticateAdmin, json, serviceClient } from "../_shared/http.ts";
import { chooseRule, loadShippingRules, lookupPlace, matchingRules, needsPlace } from "../_shared/shipping-rules.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const auth = await authenticateAdmin(req);
    if (!auth.isAdmin) return json({ ok: false, error: "Só administradores podem usar o simulador." }, 403);

    const body = await req.json().catch(() => ({}));
    const cep = onlyDigits(String(body?.cep ?? ""));
    if (cep.length !== 8) throw new UserError("CEP inválido.");
    const subtotal = Number(String(body?.subtotal ?? "0").replace(",", "."));
    if (!Number.isFinite(subtotal) || subtotal < 0 || subtotal > 10_000_000) throw new UserError("Valor do pedido inválido.");

    const rules = await loadShippingRules(serviceClient());
    const needs = needsPlace(rules);
    const place = await lookupPlace(cep); // sempre: o painel mostra de onde é o CEP
    const matched = matchingRules(rules, { cep, place, subtotal });
    const applied = chooseRule(matched);
    const pick = (r: { id: number; name: string; scope: string }) => ({ id: r.id, name: r.name, scope: r.scope });

    return json({
      ok: true,
      place,
      needsPlace: needs,
      matched: matched.map(pick),
      appliedRule: applied ? pick(applied) : null,
    });
  } catch (err) {
    if (err instanceof UserError) return json({ ok: false, error: err.message }, err.status);
    console.error("[shipping-rules-check]", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Não consegui simular agora. Tente de novo." }, 502);
  }
});
