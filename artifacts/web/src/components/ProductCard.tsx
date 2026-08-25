import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@workspace/api-client-react";
import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useCart } from "@/lib/cart-context";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
  };

  return (
    <Link href={`/produto/${product.id}`}>
      <div className="group relative flex flex-col h-full rounded-lg border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98]">
        <div className="aspect-[4/3] bg-secondary/50 p-6 relative flex items-center justify-center overflow-hidden">
          {product.featured && (
            <Badge className="absolute top-3 right-3 z-10 bg-accent hover:bg-accent text-accent-foreground border-none">
              Destaque
            </Badge>
          )}
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/keyboard.jpg';
            }}
            loading="lazy"
            decoding="async"
          />
        </div>
        
        <div className="p-5 flex flex-col flex-1">
          <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
            {product.category}
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-2 line-clamp-2">
            {product.name}
          </h3>
          
          <div className="mt-auto pt-4 flex items-end justify-between">
            <div>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="text-sm text-muted-foreground line-through mb-1">
                  {formatCurrency(product.compareAtPrice)}
                </div>
              )}
              <div className="font-mono font-semibold text-lg text-primary">
                {formatCurrency(product.price)}
              </div>
            </div>
            
            <Button 
              size="icon" 
              variant="secondary" 
              className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
              onClick={handleAdd}
              aria-label="Adicionar ao carrinho"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
