import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Truck } from "lucide-react";

export default function Home() {
  const { data: featuredProducts, isLoading } = useListProducts({ featured: true, limit: 4 });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-foreground text-background py-24 md:py-32">
        <div className="absolute inset-0 noise-bg opacity-20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
              O futuro <span className="text-primary">na sua mesa.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted mb-10 max-w-2xl font-light">
              Equipamentos de alta performance curados para profissionais exigentes. 
              Sem vitrines genéricas, apenas hardware que entrega o prometido.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="text-base h-12 px-8" asChild>
                <Link href="/catalogo">Explorar Catálogo</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8 text-foreground border-border/40 hover:bg-white/10 hover:text-white" asChild>
                <Link href="/catalogo?category=Laptops">Ver Notebooks</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-secondary/50 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start">
              <div className="bg-primary/10 p-3 rounded-lg text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2">Curadoria Técnica</h3>
                <p className="text-sm text-muted-foreground">Todos os produtos são testados e validados por nossa equipe de especialistas.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-primary/10 p-3 rounded-lg text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2">Garantia Estendida</h3>
                <p className="text-sm text-muted-foreground">Cobertura completa em peças e mão de obra para sua tranquilidade.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-primary/10 p-3 rounded-lg text-primary">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2">Entrega Expressa</h3>
                <p className="text-sm text-muted-foreground">Postagem no mesmo dia e rastreamento em tempo real via transportadora.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Destaques</h2>
              <p className="text-muted-foreground">O que há de melhor em nossa loja esta semana.</p>
            </div>
            <Link href="/catalogo" className="hidden sm:flex items-center gap-2 text-primary hover:text-accent font-medium transition-colors">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg border bg-card h-[400px] animate-pulse p-4 flex flex-col">
                  <div className="w-full h-48 bg-secondary/50 rounded-md mb-4" />
                  <div className="w-24 h-4 bg-secondary rounded mb-4" />
                  <div className="w-full h-6 bg-secondary rounded mb-2" />
                  <div className="w-2/3 h-6 bg-secondary rounded mb-auto" />
                  <div className="w-32 h-6 bg-secondary rounded mt-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="mt-8 text-center sm:hidden">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/catalogo">Ver todos os produtos</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
