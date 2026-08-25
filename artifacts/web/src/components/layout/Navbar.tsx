import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { ShoppingCart, User, Package, Menu, Search, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { itemCount } = useCart();
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Hexagon className="h-6 w-6 text-primary group-hover:text-accent transition-colors" />
            <span className="font-display font-bold text-xl tracking-tight">Nexa</span>
          </Link>
          
          <nav className="hidden md:flex gap-6">
            <Link 
              href="/catalogo" 
              className={`text-sm font-medium transition-colors hover:text-primary ${location === '/catalogo' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Catálogo
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex" asChild>
            <Link href="/catalogo">
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild>
            <Link href="/conta">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/carrinho">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge variant="default" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                  {itemCount}
                </Badge>
              )}
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
