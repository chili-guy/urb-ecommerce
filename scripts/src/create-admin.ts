/**
 * Cria (ou reutiliza) uma conta e concede o papel `admin`.
 *
 * Uso — a service_role key ignora a RLS, então NUNCA versione essa chave:
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm --filter @workspace/scripts run create-admin -- admin@urb.com.br "senhaForte123" "Admin UR3"
 *
 * Ou via env: ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 * Passe `operator` como 4º argumento para conceder o papel de operador.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const [, , argEmail, argPassword, argName, argRole] = process.argv;
const email = (argEmail || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = argPassword || process.env.ADMIN_PASSWORD || "";
const name = argName || process.env.ADMIN_NAME || email.split("@")[0];
const role = (argRole || "admin") as "admin" | "operator";

if (!email || !password) {
  console.error("Informe e-mail e senha (argumentos ou ADMIN_EMAIL/ADMIN_PASSWORD).");
  process.exit(1);
}
if (password.length < 8) {
  console.error("A senha precisa ter ao menos 8 caracteres.");
  process.exit(1);
}
if (role !== "admin" && role !== "operator") {
  console.error("Papel inválido. Use 'admin' ou 'operator'.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(target: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  let userId: string;

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (created.error) {
    if (/already been registered|already exists/i.test(created.error.message)) {
      const existing = await findUserByEmail(email);
      if (!existing) throw created.error;
      userId = existing.id;
      console.log(`• conta ${email} já existia — reaproveitando (${userId})`);
    } else {
      throw created.error;
    }
  } else {
    userId = created.data.user!.id;
    console.log(`• conta criada: ${email} (${userId})`);
  }

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (roleError) throw roleError;

  console.log(`✓ papel "${role}" concedido a ${email}`);
  console.log("  Já pode entrar em /entrar e acessar /admin.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
