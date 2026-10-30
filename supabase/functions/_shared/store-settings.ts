// Lê configurações da loja gravadas no painel (tabela store_settings).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  DEFAULT_INSTALLMENT_SETTINGS,
  parseInstallmentSettings,
  type InstallmentSettings,
} from "./installments.ts";

/** Se a leitura falhar, vale o padrão (mais restritivo): o checkout não deve cair por isso. */
export async function loadInstallmentSettings(db: SupabaseClient): Promise<InstallmentSettings> {
  const { data, error } = await db.from("store_settings").select("value").eq("key", "installments").maybeSingle();
  if (error) {
    console.error("[store-settings] não consegui ler o parcelamento, usando o padrão:", error.message);
    return DEFAULT_INSTALLMENT_SETTINGS;
  }
  return parseInstallmentSettings(data?.value);
}
