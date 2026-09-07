import { useProducts } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

const CATEGORY_SHORTCUTS = [
  "Laptops",
  "Smartphones",
  "Áudio",
  "Gaming",
  "Câmeras",
  "Acessórios",
];

export default function Home() {
  const { data: featuredProducts, isLoading } = useProducts({ featured: true, limit: 4 });

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

      <section id="destaques" className="bg-[#f4f1eb] pb-14 pt-8 md:pb-20 md:pt-10">
        <div id="oferta" className="mx-auto max-w-[1320px] px-4 sm:px-8 lg:px-12">
          <div className="mb-5 flex items-end justify-between sm:mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e26f00]">Escolhas da semana</div>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-.04em] sm:text-3xl md:text-4xl">Destaques</h2>
              <p className="mt-1.5 text-sm text-[#4f585d] sm:text-base">O que há de melhor em nossa loja esta semana.</p>
            </div>
            <Link href="/catalogo" className="hidden items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-[#e26f00] transition-colors hover:text-[#111820] sm:flex">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
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
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {featuredProducts?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-6 sm:hidden">
            <Link href="/catalogo" className="inline-flex min-h-12 w-full items-center justify-center bg-[#ff8a0a] px-6 text-sm font-bold uppercase tracking-[.12em] text-[#111820]">
              Ver todos os produtos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
