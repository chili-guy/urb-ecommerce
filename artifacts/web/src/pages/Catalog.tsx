import { useState } from "react";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const CATEGORIES = ["Todos", "Laptops", "Smartphones", "Audio", "Monitores", "Acessórios"];

export default function Catalog() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get('category') || "Todos";
  
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);

  const { data: products, isLoading } = useListProducts({ 
    search: search || undefined,
    category: category !== "Todos" ? category : undefined
  });

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Catálogo</h1>
          <p className="text-muted-foreground">Encontre o equipamento perfeito para sua necessidade.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6 lg:col-span-1">
          <div className="space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Search className="h-4 w-4" /> Busca
            </h3>
            <div className="relative">
              <Input 
                placeholder="Pesquisar produtos..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Categorias
            </h3>
            <div className="flex flex-col gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    category === cat 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border bg-card h-[400px] animate-pulse p-4 flex flex-col">
                  <div className="w-full h-48 bg-secondary/50 rounded-md mb-4" />
                  <div className="w-24 h-4 bg-secondary rounded mb-4" />
                  <div className="w-full h-6 bg-secondary rounded mb-2" />
                  <div className="w-full h-6 bg-secondary rounded mb-2" />
                </div>
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-24 px-4 border rounded-lg border-dashed bg-secondary/20">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-display text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground mb-6">Tente ajustar seus filtros de busca ou categoria.</p>
              <Button onClick={() => { setSearch(""); setCategory("Todos"); }}>Limpar Filtros</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
