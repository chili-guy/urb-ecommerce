// Gera supabase/seed.sql a partir do array PRODUCTS em scripts/src/seed.ts.
// Uso: node scripts/gen-seed-sql.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(root, "scripts/src/seed.ts"), "utf8");

const marker = "const PRODUCTS: Seed[] = ";
const start = src.indexOf(marker);
const end = src.indexOf("\n];", start) + 3;
const literal = src.slice(start + marker.length, end).replace(/;\s*$/, "");
/** @type {Array<Record<string, unknown>>} */
const PRODUCTS = eval(literal); // literal do nosso próprio arquivo, sem chamadas

const slugify = (v) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const values = PRODUCTS.map((p, i) =>
  "  (" +
  [
    q(p.name),
    q(`${slugify(p.name)}-${i + 1}`),
    q(p.description),
    q(p.category),
    p.price,
    p.compareAtPrice ?? "null",
    p.stock,
    q(`/images/${p.image}.jpg`),
    p.featured ? "true" : "false",
    p.rating ?? 4.8,
    p.reviewCount ?? 0,
  ].join(", ") +
  ")",
).join(",\n");

const out = `-- Catalogo de exemplo (${PRODUCTS.length} produtos).
-- Rode DEPOIS de 0001_init.sql. Idempotente: reexecutar nao duplica.
insert into public.products
  (name, slug, description, category, price, compare_at_price, stock, image_url, featured, rating, review_count)
values
${values}
on conflict (slug) do nothing;
`;

mkdirSync(resolve(root, "supabase"), { recursive: true });
writeFileSync(resolve(root, "supabase/seed.sql"), out);
console.log(`✓ supabase/seed.sql — ${PRODUCTS.length} produtos`);
