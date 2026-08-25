import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Truck, ArrowUpRight } from "lucide-react";

export default function Home() {
  const { data: featuredProducts, isLoading } = useListProducts({ featured: true, limit: 4 });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="absolute inset-0 noise-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-blue-200">
                Curadoria técnica · seleção especial
              </div>
              <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
                O futuro <span className="text-primary">na sua mesa.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base font-light leading-7 text-slate-300 md:text-lg">
                Equipamentos de alta performance curados para quem leva o próprio setup a sério. Hardware que entrega o prometido, sem excesso de escolha.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button size="lg" className="h-12 px-8 text-base" asChild>
                  <Link href="/catalogo">Explorar catálogo <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 border-white/20 bg-white px-8 text-base text-slate-900 hover:bg-primary hover:text-white" asChild>
                  <Link href="/catalogo?category=Laptops">Ver notebooks</Link>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-wider text-slate-400">
                <span>Postagem no mesmo dia</span>
                <span>12x sem juros</span>
                <span>Garantia Nexa</span>
              </div>
            </div>
            <div className="relative min-h-[240px] overflow-hidden border border-white/10 bg-slate-900/60 lg:min-h-[330px]">
              <img src="/images/hero-nexa.jpg" alt="Setup com notebook e acessórios Nexa" className="absolute inset-0 h-full w-full object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/30 to-transparent" />
              <div className="absolute bottom-5 right-5 border border-white/15 bg-foreground/80 px-4 py-3 backdrop-blur">
                <div className="font-mono text-xs uppercase tracking-widest text-primary">Setup da semana</div>
                <div className="mt-1 font-display text-sm text-white">Performance sem ruído</div>
              </div>
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

      <section className="border-b bg-background py-8">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4">
          <span className="mr-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Explore por categoria</span>
          {["Laptops", "Smartphones", "Áudio", "Gaming", "Câmeras", "Acessórios"].map((category) => (
            <Link
              key={category}
              href={`/catalogo?category=${encodeURIComponent(category)}`}
              className="border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {category}
            </Link>
          ))}
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
