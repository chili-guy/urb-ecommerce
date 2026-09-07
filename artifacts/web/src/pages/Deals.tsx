import { useMemo } from "react";
import { Link } from "wouter";
import { useProducts } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { ProductCard } from "@/components/ProductCard";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { ArrowRight, ShoppingCart, Tag } from "lucide-react";

function discountPct(p: Product): number {
  if (!p.compareAtPrice || p.compareAtPrice <= p.price) return 0;
  return Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
}

function transparent(url: string): string {
  return url.replace(/\.(jpe?g|webp)$/i, "-transparent.png");
}

function FeaturedDeal({ product }: { product: Product }) {
  const { addItem } = useCart();
  const pct = discountPct(product);
  const saved = (product.compareAtPrice ?? product.price) - product.price;

  return (
    <div className="grid overflow-hidden border border-[#111820]/15 bg-white md:grid-cols-2">
      <div className="relative flex items-center justify-center bg-[#f9f7f2] p-8 sm:p-12">
        <span className="font-mono absolute left-4 top-4 rounded-md bg-[#ff6a13] px-2.5 py-1.5 text-xs font-bold text-white">
          -{pct}%
        </span>
        <img
          src={transparent(product.imageUrl)}
          alt={product.name}
          className="h-[200px] w-full object-contain sm:h-[280px]"
          onError={(e) => {
            if (e.currentTarget.dataset.fallback !== "original") {
              e.currentTarget.dataset.fallback = "original";
              e.currentTarget.src = product.imageUrl;
            }
          }}
        />
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-10">
        <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e26f00]">
          Destaque da semana
        </div>
        <div className="mt-2 font-mono text-xs uppercase tracking-wider text-[#4f585d]">
          {product.category}
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-.03em] sm:text-3xl">
          {product.name}
        </h2>

        <div className="mt-5 flex items-end gap-3">
          <span className="text-sm text-[#8a8a8a] line-through">
            {formatCurrency(product.compareAtPrice ?? product.price)}
          </span>
          <span className="font-display text-3xl font-bold text-[#2f7f57] sm:text-4xl">
            {formatCurrency(product.price)}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-[#e26f00]">
          Você economiza {formatCurrency(saved)}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={`/produto/${product.id}`}
            className="jurb-cta group inline-flex min-h-11 items-center gap-3 bg-[#ff8a0a] px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#111820]"
          >
            Ver produto
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <button
            type="button"
            onClick={() => addItem(product, 1)}
            className="inline-flex min-h-11 items-center gap-2 border border-[#111820]/25 px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#111820] transition-colors hover:border-[#ff8a0a] hover:text-[#e26f00]"
          >
            <ShoppingCart className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Deals() {
  const { data: products, isLoading } = useProducts();

  const deals = useMemo(() => {
    return (products ?? [])
      .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
      .sort((a, b) => discountPct(b) - discountPct(a));
  }, [products]);

  const [featured, ...rest] = deals;

  return (
    <div className="bg-[#f4f1eb] text-[#111820]">
      {/* Header */}
      <section className="relative isolate overflow-hidden border-t-2 border-[#ff8a0a] bg-[#111820] text-[#f4f1eb]">
        <div className="jurb-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-32 -top-24 h-[380px] w-[380px] rounded-full bg-[#ff8a0a]/[.10] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-[1320px] px-4 py-12 sm:px-8 md:py-16 lg:px-12">
          <div className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[.28em] text-[#ffb85d]">
            <span className="h-2 w-2 bg-[#ff8a0a]" /> Oferta da semana
          </div>
          <h1 className="mt-5 max-w-[20ch] text-balance font-display text-[clamp(2rem,6vw,3.4rem)] font-semibold leading-[1.03] tracking-[-.035em]">
            Preço que a bancada <span className="text-[#ff8a0a]">aprova.</span>
          </h1>
          <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[#c4c8c9] sm:text-base">
            Descontos reais em equipamentos testados um a um. Enquanto durar o estoque —
            quando acaba, sai da lista.
          </p>
          {!isLoading && (
            <div className="mt-6 inline-flex items-center gap-2 border border-[#f4f1eb]/20 px-3 py-1.5 font-mono text-xs text-[#c4c8c9]">
              <Tag className="h-3.5 w-3.5 text-[#ff8a0a]" />
              {deals.length} {deals.length === 1 ? "oferta ativa" : "ofertas ativas"}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-12 sm:px-8 md:py-16 lg:px-12">
        {isLoading ? (
          <div className="space-y-10">
            <div className="h-[360px] animate-pulse border border-[#e4dfd7] bg-white" />
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[400px] animate-pulse rounded-xl border border-[#e4dfd7] bg-white sm:h-[560px]" />
              ))}
            </div>
          </div>
        ) : deals.length === 0 ? (
          <div className="border border-dashed border-[#111820]/25 bg-[#f9f7f2] px-6 py-20 text-center">
            <Tag className="mx-auto h-8 w-8 text-[#4f585d]" />
            <h2 className="mt-4 font-display text-xl font-semibold">Nenhuma oferta ativa agora</h2>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm text-[#4f585d]">
              As promoções giram toda semana. Enquanto isso, o catálogo completo continua no ar.
            </p>
            <Link
              href="/catalogo"
              className="jurb-cta mt-6 inline-flex min-h-11 items-center gap-3 bg-[#ff8a0a] px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#111820]"
            >
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {featured && <FeaturedDeal product={featured} />}

            {rest.length > 0 && (
              <div>
                <div className="mb-5 flex items-end justify-between sm:mb-6">
                  <h2 className="font-display text-xl font-semibold tracking-[-.03em] sm:text-2xl">
                    Mais ofertas
                  </h2>
                  <Link
                    href="/catalogo"
                    className="hidden items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-[#e26f00] transition-colors hover:text-[#111820] sm:flex"
                  >
                    Ver catálogo <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                  {rest.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
