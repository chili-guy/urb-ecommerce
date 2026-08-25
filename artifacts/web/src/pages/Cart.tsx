import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight, ShoppingCart } from "lucide-react";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const [, setLocation] = useLocation();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-md">
        <div className="bg-secondary/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
          <ShoppingCart className="h-10 w-10" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-4">Seu carrinho está vazio</h2>
        <p className="text-muted-foreground mb-8">
          Navegue pelo nosso catálogo e adicione produtos ao seu carrinho.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/catalogo">Explorar Produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Carrinho</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-secondary/30 text-sm font-medium text-muted-foreground hidden md:grid">
              <div className="col-span-6">Produto</div>
              <div className="col-span-3 text-center">Quantidade</div>
              <div className="col-span-3 text-right">Subtotal</div>
            </div>
            
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.product.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-1 md:col-span-6 flex gap-4 items-center">
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name} 
                      className="w-20 h-20 object-contain rounded-md bg-secondary/30 mix-blend-multiply border"
                    />
                    <div>
                      <Link href={`/produto/${item.product.id}`} className="font-medium hover:text-primary transition-colors line-clamp-2">
                        {item.product.name}
                      </Link>
                      <div className="text-sm font-mono text-muted-foreground mt-1">
                        {formatCurrency(item.product.price)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-1 md:col-span-3 flex justify-between md:justify-center items-center">
                    <span className="md:hidden text-sm text-muted-foreground">Quantidade:</span>
                    <div className="flex items-center border rounded-md bg-background">
                      <button 
                        className="px-3 py-1 hover:text-primary disabled:opacity-50"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                      <button 
                        className="px-3 py-1 hover:text-primary disabled:opacity-50"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-span-1 md:col-span-3 flex justify-between md:justify-end items-center">
                    <span className="md:hidden text-sm text-muted-foreground">Subtotal:</span>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-medium">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                      <button 
                        onClick={() => removeItem(item.product.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-2"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6 bg-card sticky top-24">
            <h3 className="font-display font-bold text-lg mb-6">Resumo do Pedido</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({items.length} itens)</span>
                <span className="font-mono text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>Calculado no checkout</span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="font-medium">Total</span>
                <span className="font-mono font-bold text-2xl text-primary">{formatCurrency(subtotal)}</span>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="w-full text-base h-12" 
              onClick={() => setLocation('/checkout')}
            >
              Ir para Checkout <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
