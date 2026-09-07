import { useParams, Link } from "wouter";
import { useProduct } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowLeft, Star, ShieldCheck, Truck, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProduct(Number(id), { enabled: !!id });
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 w-32 bg-secondary rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-secondary rounded-lg" />
          <div className="space-y-6">
            <div className="h-10 bg-secondary rounded w-3/4" />
            <div className="h-6 bg-secondary rounded w-1/4" />
            <div className="h-8 bg-secondary rounded w-1/3" />
            <div className="space-y-2 pt-8">
              <div className="h-4 bg-secondary rounded w-full" />
              <div className="h-4 bg-secondary rounded w-full" />
              <div className="h-4 bg-secondary rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Produto não encontrado</h2>
        <Button asChild>
          <Link href="/catalogo">Voltar ao catálogo</Link>
        </Button>
      </div>
    );
  }

  const handleAdd = () => {
    addItem(product, quantity);
    toast.success("Adicionado ao carrinho", {
      description: `${quantity}x ${product.name}`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <Link href="/catalogo" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:mb-8">
        <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
      </Link>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12 lg:gap-16">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-secondary/30 p-6 sm:p-8">
          {product.featured && (
            <Badge className="absolute top-4 left-4 z-10 bg-accent hover:bg-accent border-none text-accent-foreground">
              Destaque
            </Badge>
          )}
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/800x800/e2e8f0/1e293b?text=Produto';
            }}
          />
        </div>

        <div className="flex flex-col">
          <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">
            {product.category}
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold tracking-tight sm:text-3xl md:mb-4 md:text-4xl">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-amber-500">
              <Star className="h-5 w-5 fill-current" />
              <span className="ml-1 font-medium">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              ({product.reviewCount} avaliações)
            </span>
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" /> Em estoque
            </span>
          </div>

          <div className="mb-8">
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div className="text-lg text-muted-foreground line-through mb-1">
                {formatCurrency(product.compareAtPrice)}
              </div>
            )}
            <div className="text-4xl font-mono font-bold text-primary">
              {formatCurrency(product.price)}
            </div>
          </div>

          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            {product.description}
          </p>

          <div className="mt-auto space-y-6 pt-8 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <button 
                  className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-12 text-center font-medium font-mono">{quantity}</span>
                <button 
                  className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
              <Button size="lg" className="flex-1 text-base h-12" onClick={handleAdd}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Adicionar ao Carrinho
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 sm:gap-4">
              <div className="flex gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <span>Garantia de 12 meses direto com a UR3.</span>
              </div>
              <div className="flex gap-3 text-sm text-muted-foreground">
                <Truck className="h-5 w-5 shrink-0 text-primary" />
                <span>Frete expresso disponível para todo Brasil.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
