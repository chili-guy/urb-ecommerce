/**
 * Preenche a galeria (products.images) com uma 2ª foto para cada produto,
 * usando a variante "-transparent.png" que já existe em /images para a
 * mesma imagem-base. Não mexe em produtos que já têm galeria própria.
 *
 * Uso — a service_role key ignora a RLS, nunca versione essa chave:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm --filter @workspace/scripts run backfill-gallery
 *
 * Requer supabase/migrations/0005_scope_pack.sql já aplicada (coluna
 * products.images). Produtos cuja foto-base não tem uma variante
 * "-transparent" disponível (hoje: categoria Smartphones) ficam com 1 foto só
 * — não existe um segundo asset real para eles ainda.
 */
import { createClient } from "@supabase/supabase-js";

// Bases em /public/images que têm um "<base>-transparent.png" de verdade.
const HAS_TRANSPARENT = new Set([
  "laptop",
  "tablet",
  "console",
  "headphones",
  "camera",
  "keyboard",
  "monitor",
  "smartwatch",
  "speaker",
]);

function secondImageFor(imageUrl: string): string | null {
  const match = imageUrl.match(/^(.*)\/([\w-]+)\.(jpe?g|png|webp)$/i);
  if (!match) return null;
  const [, dir, base] = match;
  if (!HAS_TRANSPARENT.has(base)) return null;
  return `${dir}/${base}-transparent.png`;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: products, error } = await supabase
    .from("products")
    .select("id, image_url, images");
  if (error) {
    console.error(
      error.message.includes("images")
        ? `${error.message}\n→ Rode supabase/migrations/0005_scope_pack.sql antes deste script.`
        : error.message,
    );
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  for (const p of products ?? []) {
    const current = Array.isArray(p.images) ? (p.images as unknown[]) : [];
    if (current.length > 0) {
      skipped++;
      continue;
    }
    const second = secondImageFor(p.image_url as string);
    if (!second) {
      skipped++;
      continue;
    }
    const { error: updErr } = await supabase
      .from("products")
      .update({ images: [second] })
      .eq("id", p.id as number);
    if (updErr) {
      console.error(`Produto ${p.id}: ${updErr.message}`);
      continue;
    }
    updated++;
  }

  console.log(`✓ ${updated} produtos ganharam uma 2ª foto na galeria.`);
  if (skipped > 0) {
    console.log(
      `• ${skipped} ficaram como estavam (já tinham galeria própria, ou a foto-base não tem uma 2ª variante disponível — hoje isso vale só para Smartphones).`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
