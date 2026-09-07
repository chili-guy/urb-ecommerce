import { useState } from "react";
import { useProducts } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "Todos",
  "Laptops",
  "Tablets",
  "Smartphones",
  "Câmeras",
  "Áudio",
  "Monitores",
  "Gaming",
  "Wearables",
  "Periféricos",
  "Acessórios",
];

export default function Catalog() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category") || "Todos";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);

  const { data: products, isLoading } = useProducts({
    search: search || undefined,
    category: category !== "Todos" ? category : undefined,
  });

  const searchField = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Pesquisar produtos..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11 pl-9"
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 md:py-12">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Encontre o equipamento perfeito para sua necessidade.
        </p>
      </div>

      {/* Filtros mobile: busca + linha de chips com scroll horizontal */}
      <div className="mb-6 space-y-3 lg:hidden">
        {searchField}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                category === cat
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar (desktop) */}
        <aside className="hidden space-y-6 lg:col-span-1 lg:block">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-display font-semibold">
              <Search className="h-4 w-4" /> Busca
            </h3>
            {searchField}
          </div>
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-display font-semibold">
              <SlidersHorizontal className="h-4 w-4" /> Categorias
            </h3>
            <div className="flex flex-col gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    category === cat
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Grade de produtos */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex h-[420px] animate-pulse flex-col rounded-2xl border bg-white p-3 sm:h-[520px] sm:p-4">
                  <div className="mb-4 h-[180px] w-full rounded-xl bg-secondary/50 sm:h-[220px]" />
                  <div className="mb-3 h-4 w-20 rounded bg-secondary" />
                  <div className="mb-2 h-5 w-full rounded bg-secondary" />
                  <div className="h-5 w-2/3 rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-secondary/20 px-4 py-16 text-center sm:py-24">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mb-2 font-display text-lg font-semibold sm:text-xl">Nenhum produto encontrado</h3>
              <p className="mb-6 text-sm text-muted-foreground">Tente ajustar sua busca ou categoria.</p>
              <Button onClick={() => { setSearch(""); setCategory("Todos"); }}>Limpar filtros</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
