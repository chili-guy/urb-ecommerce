import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "wouter";
import { useCategories, useProducts, type ProductSort } from "@/lib/api";
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS, type Product, type ProductCondition } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, Star, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Usado só como ponto de partida antes da 1ª carga real das categorias — o
// catálogo passa a listar o que estiver de fato cadastrado nos produtos.
const FALLBACK_CATEGORIES = [
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

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "relevance", label: "Relevância" },
  { value: "newest", label: "Novidades" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "rating", label: "Melhor avaliados" },
];

function sortProducts(list: Product[], sort: ProductSort): Product[] {
  const sorted = [...list];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    default:
      return sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}

export default function Catalog() {
  const routeParams = useParams<{ category?: string; subcategory?: string }>();
  const [urlParams] = useSearchParams();
  const searchParams = urlParams;

  const initialCategory =
    (routeParams.category && decodeURIComponent(routeParams.category)) ||
    searchParams.get("category") ||
    "Todos";
  const initialSubcategory =
    (routeParams.subcategory && decodeURIComponent(routeParams.subcategory)) || "Todas";

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [sort, setSort] = useState<ProductSort>("relevance");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [condition, setCondition] = useState<ProductCondition | "Todas">("Todas");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Nova categoria pela URL (ex: clicou em outro link /categoria/:x) reresincroniza.
  useEffect(() => {
    if (routeParams.category) setCategory(decodeURIComponent(routeParams.category));
  }, [routeParams.category]);
  useEffect(() => {
    setSubcategory(
      routeParams.subcategory ? decodeURIComponent(routeParams.subcategory) : "Todas",
    );
  }, [routeParams.subcategory]);
  // Busca vinda da navbar (ex: /catalogo?search=...) também sincroniza.
  useEffect(() => {
    const q = urlParams.get("search");
    if (q) setSearch(q);
  }, [urlParams]);

  const { data: products, isLoading } = useProducts({
    search: search || undefined,
    category: category !== "Todos" ? category : undefined,
  });

  const { data: liveCategories } = useCategories();
  const categories = useMemo(
    () => ["Todos", ...(liveCategories && liveCategories.length > 0 ? liveCategories : FALLBACK_CATEGORIES)],
    [liveCategories],
  );

  const subcategories = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => {
      if (p.subcategory) set.add(p.subcategory);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setSubcategory("Todas");
  };

  const activeFilterCount =
    (subcategory !== "Todas" ? 1 : 0) +
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (condition !== "Todas" ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const clearAdvancedFilters = () => {
    setSubcategory("Todas");
    setPriceMin("");
    setPriceMax("");
    setMinRating(0);
    setCondition("Todas");
    setInStockOnly(false);
  };

  const filteredProducts = useMemo(() => {
    let list = products ?? [];
    if (subcategory !== "Todas") list = list.filter((p) => p.subcategory === subcategory);
    const min = priceMin ? Number(priceMin) : undefined;
    const max = priceMax ? Number(priceMax) : undefined;
    if (min !== undefined && !Number.isNaN(min)) list = list.filter((p) => p.price >= min);
    if (max !== undefined && !Number.isNaN(max)) list = list.filter((p) => p.price <= max);
    if (minRating > 0) list = list.filter((p) => p.rating >= minRating);
    if (condition !== "Todas") list = list.filter((p) => p.condition === condition);
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    return sortProducts(list, sort);
  }, [products, subcategory, priceMin, priceMax, minRating, condition, inStockOnly, sort]);

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

  const ratingFilter = (
    <div className="space-y-2">
      <h3 className="font-display font-semibold">Avaliação mínima</h3>
      <div className="flex flex-wrap gap-1.5">
        {[0, 3, 4, 4.5].map((r) => (
          <button
            key={r}
            onClick={() => setMinRating(r)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              minRating === r
                ? "border-primary bg-primary text-primary-foreground font-medium"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {r === 0 ? (
              "Todas"
            ) : (
              <>
                <Star className="h-3.5 w-3.5 fill-current" /> {r}+
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const conditionFilter = (
    <div className="space-y-2">
      <h3 className="font-display font-semibold">Condição</h3>
      <div className="flex flex-wrap gap-1.5">
        {(["Todas", ...PRODUCT_CONDITIONS] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCondition(c)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              condition === c
                ? "border-primary bg-primary text-primary-foreground font-medium"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {c === "Todas" ? "Todas" : PRODUCT_CONDITION_LABELS[c]}
          </button>
        ))}
      </div>
    </div>
  );

  const priceFilter = (
    <div className="space-y-2">
      <h3 className="font-display font-semibold">Faixa de preço</h3>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          inputMode="decimal"
          placeholder="Mín."
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          className="h-10"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="number"
          min="0"
          inputMode="decimal"
          placeholder="Máx."
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          className="h-10"
        />
      </div>
    </div>
  );

  const stockFilter = (
    <label className="flex items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={inStockOnly}
        onChange={(e) => setInStockOnly(e.target.checked)}
        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
      />
      Somente em estoque
    </label>
  );

  const subcategoryFilter = subcategories.length > 0 && (
    <div className="space-y-2">
      <h3 className="font-display font-semibold">Subcategoria</h3>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setSubcategory("Todas")}
          className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
            subcategory === "Todas"
              ? "bg-primary font-medium text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          Todas
        </button>
        {subcategories.map((sub) => (
          <button
            key={sub}
            onClick={() => setSubcategory(sub)}
            className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
              subcategory === sub
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 md:py-12">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {category === "Todos" ? "Catálogo" : category}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {subcategory !== "Todas"
            ? `${subcategory} · Encontre o equipamento perfeito para sua necessidade.`
            : "Encontre o equipamento perfeito para sua necessidade."}
        </p>
      </div>

      {/* Filtros mobile: busca + chips de categoria + botão de filtros avançados */}
      <div className="mb-6 space-y-3 lg:hidden">
        {searchField}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
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
        <div className="flex items-center gap-2">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-10 flex-1 justify-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
              <SheetTitle>Filtros avançados</SheetTitle>
              <div className="mt-4 space-y-6 pb-6">
                {subcategoryFilter}
                {priceFilter}
                {ratingFilter}
                {conditionFilter}
                {stockFilter}
              </div>
              <div className="flex gap-3 border-t pt-4">
                <Button variant="outline" className="flex-1" onClick={clearAdvancedFilters}>
                  Limpar
                </Button>
                <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                  Ver {filteredProducts.length} resultados
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProductSort)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
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

          {subcategoryFilter}

          <div className="space-y-6 border-t pt-6">
            <h3 className="font-display font-semibold">Filtros avançados</h3>
            {priceFilter}
            {ratingFilter}
            {conditionFilter}
            {stockFilter}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAdvancedFilters}
                className="text-sm font-medium text-primary hover:underline"
              >
                Limpar filtros avançados
              </button>
            )}
          </div>
        </aside>

        {/* Grade de produtos */}
        <div className="lg:col-span-3">
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : `${filteredProducts.length} produtos`}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSort)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Ordenar: {o.label}
                </option>
              ))}
            </select>
          </div>

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
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-secondary/20 px-4 py-16 text-center sm:py-24">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mb-2 font-display text-lg font-semibold sm:text-xl">Nenhum produto encontrado</h3>
              <p className="mb-6 text-sm text-muted-foreground">Tente ajustar sua busca ou os filtros.</p>
              <Button
                onClick={() => {
                  setSearch("");
                  handleCategoryChange("Todos");
                  clearAdvancedFilters();
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
