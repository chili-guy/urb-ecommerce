// Cotação de frete (Melhor Envio) para o carrinho. Pública: quem está só olhando o produto
// também calcula. Peso, medidas e preço vêm do banco; o navegador só diz CEP, produto e quantidade.
//
//   { postalCode: "01001000", items: [{ productId: 1, quantity: 2 }] }
//   -> { ok: true, options: [...], estimated: boolean }
//
// Deploy: supabase functions deploy shipping-quote --no-verify-jwt

import { onlyDigits } from "../_shared/br-docs.ts";
import { parseItems } from "../_shared/checkout-input.ts";
import { IntegrationError, UserError } from "../_shared/errors.ts";
import { CORS_HEADERS, json, serviceClient } from "../_shared/http.ts";
import { loadShippingConfig, quoteForItems } from "../_shared/shipping.ts";
import { productLoader } from "../_shared/shipping-db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);

  try {
    let body: { postalCode?: unknown; items?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new UserError("Pedido inválido.");
    }

    const destCep = onlyDigits(String(body.postalCode ?? ""));
    if (destCep.length !== 8) throw new UserError("CEP inválido.");
    const items = parseItems(body.items);

    const cfg = loadShippingConfig(Deno.env);
    if (!cfg) {
      console.error("[shipping-quote] frete não configurado (MELHORENVIO_TOKEN / SHIPPING_ORIGIN_CEP / SHIPPING_CONTACT_EMAIL)");
      return json({ ok: false, error: "O cálculo de frete ainda não está disponível. Tente mais tarde." }, 503);
    }

    const { options, estimated } = await quoteForItems({
      cfg,
      items,
      destCep,
      loadProducts: productLoader(serviceClient()),
    });

    if (options.length === 0) {
      return json({ ok: false, error: "Nenhuma transportadora entrega esse pedido nesse CEP." }, 200);
    }
    return json({ ok: true, options, estimated });
  } catch (err) {
    if (err instanceof UserError) return json({ ok: false, error: err.message }, err.status);
    console.error("[shipping-quote]", err instanceof IntegrationError ? err.message : err);
    return json({ ok: false, error: "Não foi possível calcular o frete agora. Tente de novo em instantes." }, 502);
  }
});
