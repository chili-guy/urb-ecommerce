import { useEffect, useMemo, useState } from "react";
import { useBanners, useProducts } from "@/lib/api";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "wouter";
import type { Product } from "@/lib/types";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORY_SHORTCUTS = [
  "Laptops",
  "Smartphones",
  "Áudio",
  "Gaming",
  "Câmeras",
  "Acessórios",
];

function discountPct(p: Product): number {
  if (!p.compareAtPrice || p.compareAtPrice <= p.price) return 0;
  return Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex h-[400px] animate-pulse flex-col rounded-xl border border-[#e4dfd7] bg-white p-3 sm:h-[560px] sm:rounded-2xl sm:p-4">
          <div className="mb-4 h-[150px] w-full rounded-lg bg-[#eee9e1] sm:h-[250px]" />
          <div className="mb-3 h-4 w-20 rounded bg-[#e8f5ec]" />
          <div className="mb-2 h-5 w-full rounded bg-[#eee9e1]" />
          <div className="mb-auto h-5 w-2/3 rounded bg-[#eee9e1]" />
          <div className="mt-4 h-7 w-28 rounded bg-[#e6f2eb]" />
        </div>
      ))}
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  subtitle,
  seeAllHref,
  products,
  isLoading,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  seeAllHref: string;
  products: Product[] | undefined;
  isLoading: boolean;
}) {
  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="bg-[#f4f1eb] pb-14 md:pb-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8 lg:px-12">
        <div className="mb-5 flex items-end justify-between sm:mb-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e26f00]">{eyebrow}</div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.04em] sm:text-3xl md:text-4xl">{title}</h2>
            <p className="mt-1.5 text-sm text-[#4f585d] sm:text-base">{subtitle}</p>
          </div>
          <Link href={seeAllHref} className="hidden items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-[#e26f00] transition-colors hover:text-[#111820] sm:flex">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <ProductGridSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {products!.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BannerCarousel() {
  const { data: banners } = useBanners(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (!banners || banners.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5500);
    return () => clearInterval(id);
  }, [banners]);

  if (!banners || banners.length === 0) return null;

  const current = banners[index];
  const image = (
    <img
      src={current.imageUrl}
      alt={current.title || "Promoção UR3"}
      className="h-full w-full object-cover"
    />
  );

  return (
    <section className="bg-[#f4f1eb] px-4 pt-6 sm:px-8 sm:pt-8 lg:px-12">
      <div className="relative mx-auto aspect-[16/9] max-w-[1320px] overflow-hidden rounded-xl bg-[#111820] sm:aspect-[3/1]">
        {current.linkUrl ? (
          <Link href={current.linkUrl} className="block h-full w-full">
            {image}
          </Link>
        ) : (
          image
        )}

        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111820] shadow-md transition-colors hover:bg-white sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Próximo banner"
              onClick={() => setIndex((i) => (i + 1) % banners.length)}
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111820] shadow-md transition-colors hover:bg-white sm:right-4"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-4">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ver banner ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-5 bg-[#ff8a0a]" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: featuredProducts, isLoading } = useProducts({ featured: true, limit: 4 });
  const { data: newestProducts, isLoading: isLoadingNewest } = useProducts({ sort: "newest", limit: 4 });
  const { data: allProducts, isLoading: isLoadingDeals } = useProducts();

  const topDeals = useMemo(() => {
    return (allProducts ?? [])
      .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
      .sort((a, b) => discountPct(b) - discountPct(a))
      .slice(0, 4);
  }, [allProducts]);

  const recentIds = useMemo(() => getRecentlyViewed(), []);
  const { data: recentlyViewedRaw, isLoading: isLoadingRecent } = useProducts({ ids: recentIds });
  const recentlyViewed = useMemo(() => {
    if (!recentlyViewedRaw) return recentlyViewedRaw;
    const order = new Map(recentIds.map((id, i) => [id, i]));
    return [...recentlyViewedRaw].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [recentlyViewedRaw, recentIds]);

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#111820]">
      <section id="por-que-jurb" className="relative isolate overflow-hidden border-t-2 border-[#ff8a0a] bg-[#111820] text-[#f4f1eb]">
        <div className="jurb-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-32 -top-24 h-[380px] w-[380px] rounded-full bg-[#ff8a0a]/[.10] blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-[1320px] items-center gap-6 px-4 py-8 sm:gap-8 sm:px-8 md:py-11 lg:grid-cols-[1.08fr_.92fr] lg:gap-14 lg:px-12">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex items-center justify-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[.28em] text-[#ffb85d] lg:justify-start">
              <span className="h-2 w-2 bg-[#ff8a0a]" /> O padrão UR3
            </div>
            <h1 className="mt-4 max-w-[18ch] text-balance font-display text-[clamp(1.9rem,7vw,3.1rem)] font-semibold leading-[1.02] tracking-[-.035em] text-[#f4f1eb] lg:max-w-[16ch]">
              Tecnologia boa é tecnologia que <span className="text-[#ff8a0a]">entrega.</span>
            </h1>
            <Link
              href="/catalogo"
              className="jurb-cta group mt-6 inline-flex min-h-11 items-center gap-3 bg-[#ff8a0a] px-6 text-[13px] font-bold uppercase tracking-[.14em] text-[#111820]"
            >
              Explorar catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="relative flex items-center justify-center py-1 sm:py-2 lg:py-4">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40vw] max-h-[220px] w-[82vw] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff8a0a]/[.14] blur-3xl" />
            <img
              src="/images/jurb-logo-full.png"
              alt="UR3 Comércio de Eletrônicos"
              className="relative z-10 h-auto w-[56vw] max-w-[300px] drop-shadow-[0_10px_34px_rgba(0,0,0,0.4)] sm:w-full sm:max-w-[340px] lg:max-w-[440px]"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-[#111820]/15 bg-[#f4f1eb] py-4 sm:py-5">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 overflow-x-auto px-4 sm:flex-wrap sm:px-8 lg:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[.18em] text-[#4f585d]">Categorias</span>
          {CATEGORY_SHORTCUTS.map((category) => (
            <Link
              key={category}
              href={`/catalogo?category=${encodeURIComponent(category)}`}
              className="shrink-0 border border-[#111820]/20 bg-transparent px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-[#ff8a0a] hover:bg-[#ff8a0a] sm:px-4 sm:py-2"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <BannerCarousel />

      <div id="destaques" className="pt-8 md:pt-10">
        <div id="oferta">
          <ProductSection
            eyebrow="Escolhas da semana"
            title="Destaques"
            subtitle="O que há de melhor em nossa loja esta semana."
            seeAllHref="/catalogo"
            products={featuredProducts}
            isLoading={isLoading}
          />
        </div>
      </div>

      <ProductSection
        eyebrow="Direto da bancada"
        title="Recém-adicionados"
        subtitle="Os últimos itens que entraram no catálogo."
        seeAllHref="/catalogo"
        products={newestProducts}
        isLoading={isLoadingNewest}
      />

      <ProductSection
        eyebrow="Preço que a bancada aprova"
        title="Oferta da semana"
        subtitle="Descontos reais, enquanto durar o estoque."
        seeAllHref="/ofertas"
        products={topDeals}
        isLoading={isLoadingDeals}
      />

      {recentIds.length > 0 && (
        <ProductSection
          eyebrow="Continue de onde parou"
          title="Vistos recentemente"
          subtitle="Produtos que você deu uma olhada por aqui."
          seeAllHref="/catalogo"
          products={recentlyViewed}
          isLoading={isLoadingRecent}
        />
      )}
    </main>
  );
}
