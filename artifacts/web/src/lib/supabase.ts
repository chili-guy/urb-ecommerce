import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** As duas variáveis (baked no build pelo Vite) estão presentes? */
export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error(
        "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY " +
          "nas variáveis de ambiente e faça um novo build.",
      );
    }
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/**
 * Cliente único do Supabase. Inicializado de forma preguiçosa para que a
 * ausência de configuração não derrube o bundle inteiro na importação —
 * o app mostra uma mensagem (ver main.tsx) em vez de tela branca.
 * A `anon key` é pública por design; a RLS é o que protege os dados.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getClient();
    const value = Reflect.get(c, prop, receiver);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
