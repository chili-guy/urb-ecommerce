import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useProducts } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS, type ProductCondition } from "@/lib/types";
import { ArrowRight, ShieldCheck, Tag } from "lucide-react";

export default function Seminovos() {
  const { data: products, isLoading } = useProducts();
  const [filter, setFilter] = useState<ProductCondition | "Todos">("Todos");

  const items = useMemo(() => {
    return (products ?? []).filter((p) => p.condition !== "novo");
  }, [products]);

  const filtered = useMemo(() => {
    if (filter === "Todos") return items;
    return items.filter((p) => p.condition === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const map = new Map<ProductCondition, number>();
    items.forEach((p) => map.set(p.condition, (map.get(p.condition) ?? 0) + 1));
    return map;
  }, [items]);

  return (
    <div className="bg-[#f4f1eb] text-[#111820]">
      {/* Header */}
      <section className="relative isolate overflow-hidden border-t-2 border-[#ff8a0a] bg-[#111820] text-[#f4f1eb]">
        <div className="jurb-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-32 -top-24 h-[380px] w-[380px] rounded-full bg-[#ff8a0a]/[.10] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-[1320px] px-4 py-12 sm:px-8 md:py-16 lg:px-12">
          <div className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[.28em] text-[#ffb85d]">
            <span className="h-2 w-2 bg-[#ff8a0a]" /> Seminovos &amp; usados
          </div>
          <h1 className="mt-5 max-w-[22ch] text-balance font-display text-[clamp(2rem,6vw,3.4rem)] font-semibold leading-[1.03] tracking-[-.035em]">
            Boa tecnologia não precisa ser <span className="text-[#ff8a0a]">nova.</span>
          </h1>
          <p className="mt-5 max-w-[54ch] text-[15px] leading-relaxed text-[#c4c8c9] sm:text-base">
            Cada item aqui passou pela mesma bancada de testes do resto do catálogo e
            sai com a garantia UR3. A diferença é só o preço — sempre marcado como{" "}
            <strong className="text-[#f4f1eb]">Seminovo</strong> ou{" "}
            <strong className="text-[#f4f1eb]">Usado</strong> pra você comprar sabendo exatamente o que leva.
          </p>

          {!isLoading && items.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("Todos")}
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  filter === "Todos"
                    ? "border-[#ff8a0a] bg-[#ff8a0a] text-[#111820]"
                    : "border-[#f4f1eb]/25 text-[#f4f1eb] hover:border-[#ff8a0a]/60"
                }`}
              >
                Todos ({items.length})
              </button>
              {PRODUCT_CONDITIONS.filter((c) => c !== "novo" && counts.has(c)).map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    filter === c
                      ? "border-[#ff8a0a] bg-[#ff8a0a] text-[#111820]"
                      : "border-[#f4f1eb]/25 text-[#f4f1eb] hover:border-[#ff8a0a]/60"
                  }`}
                >
                  {PRODUCT_CONDITION_LABELS[c]} ({counts.get(c)})
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-12 sm:px-8 md:py-16 lg:px-12">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[400px] animate-pulse rounded-xl border border-[#e4dfd7] bg-white sm:h-[560px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-[#111820]/25 bg-[#f9f7f2] px-6 py-20 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-[#4f585d]" />
            <h2 className="mt-4 font-display text-xl font-semibold">
              {items.length === 0 ? "Nenhum seminovo ou usado no momento" : "Nada nessa condição agora"}
            </h2>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm text-[#4f585d]">
              {items.length === 0
                ? "Assim que um item entrar como seminovo ou usado no painel, ele aparece aqui primeiro."
                : "Tente outra condição ou veja o catálogo completo."}
            </p>
            <Link
              href="/catalogo"
              className="jurb-cta mt-6 inline-flex min-h-11 items-center gap-3 bg-[#ff8a0a] px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#111820]"
            >
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-2 text-sm text-[#4f585d] sm:mb-6">
              <Tag className="h-4 w-4" />
              {filtered.length} {filtered.length === 1 ? "item" : "itens"} disponíveis
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
