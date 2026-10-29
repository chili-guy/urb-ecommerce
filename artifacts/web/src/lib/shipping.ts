import { useQuery } from "@tanstack/react-query";
import { invokeFunction } from "./functions";
import type { ShippingOption } from "./types";

export type ShippingQuote = {
  options: ShippingOption[];
  /** true = algum produto ainda não tem peso/medidas cadastrados; o valor é uma estimativa. */
  estimated: boolean;
};

export type QuoteItem = { productId: number; quantity: number };

async function fetchShippingQuote(postalCode: string, items: QuoteItem[]): Promise<ShippingQuote> {
  const r = await invokeFunction<{ ok: boolean; error?: string; options?: ShippingOption[]; estimated?: boolean }>(
    "shipping-quote",
    { postalCode, items },
  );
  if (!r.ok || !r.options) throw new Error(r.error ?? "Não foi possível calcular o frete.");
  return { options: r.options, estimated: Boolean(r.estimated) };
}

/**
 * Frete real (Melhor Envio) pro carrinho. Só consulta com CEP de 8 dígitos e itens;
 * o preço final é sempre recalculado no servidor na hora de pagar.
 */
export function useShippingQuote(postalCode: string | null, items: QuoteItem[]) {
  const cep = (postalCode ?? "").replace(/\D/g, "");
  const itemsKey = items.map((i) => `${i.productId}x${i.quantity}`).sort().join(",");
  return useQuery({
    queryKey: ["shipping-quote", cep, itemsKey],
    enabled: cep.length === 8 && items.length > 0,
    queryFn: () => fetchShippingQuote(cep, items),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
