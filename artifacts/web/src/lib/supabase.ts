import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. " +
      "Copie artifacts/web/.env.example para artifacts/web/.env e preencha.",
  );
}

/**
 * Cliente único do Supabase — todo acesso a dados e autenticação passa por aqui.
 * A `anon key` é pública por design; o que protege os dados é a RLS no Postgres.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
