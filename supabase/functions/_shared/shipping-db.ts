import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ShippingProductRow } from "./shipping.ts";

/** Lê preço e embalagem dos produtos no banco (nunca confia no que o navegador mandou). */
export function productLoader(db: SupabaseClient) {
  return async (ids: number[]): Promise<ShippingProductRow[]> => {
    const { data, error } = await db
      .from("products")
      .select("id, price, weight_g, width_cm, height_cm, length_cm")
      .in("id", ids);
    if (error) throw error;
    return (data ?? []) as ShippingProductRow[];
  };
}
