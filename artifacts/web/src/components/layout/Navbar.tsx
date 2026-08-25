import { Link } from "wouter";
import { useCart } from "@/lib/cart-context";
import { ShoppingCart, User, Menu, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { itemCount } = useCart();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f4f1eb]/15 bg-[#111820]/95 text-[#f4f1eb] backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center">
            <img
              src="/images/jurb-logo-full.png"
              alt="JURB Comércio de Eletrônicos"
              className="h-auto w-[138px] transition-opacity group-hover:opacity-85 sm:w-[172px]"
            />
          </Link>
          
          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            <Link href="/#destaques" className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c4c8c9] transition-colors hover:text-[#ff8a0a]">
              Destaques
            </Link>
            <Link href="/#por-que-jurb" className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c4c8c9] transition-colors hover:text-[#ff8a0a]">
              Por que JURB
            </Link>
            <Link href="/#oferta" className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c4c8c9] transition-colors hover:text-[#ff8a0a]">
              Oferta da semana
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/catalogo" className="mr-2 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ffb85d] transition-colors hover:text-[#ff8a0a] sm:flex">
            Ver catálogo <ChevronRight className="h-4 w-4" />
          </Link>

          <Button variant="ghost" size="icon" className="hidden text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820] sm:inline-flex" asChild>
            <Link href="/catalogo" aria-label="Buscar produtos">
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820]" asChild>
            <Link href="/conta" aria-label="Minha conta">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="relative text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820]" asChild>
            <Link href="/carrinho" aria-label="Carrinho">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge variant="default" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-[#ff8a0a] p-0 text-[10px] text-[#111820]">
                  {itemCount}
                </Badge>
              )}
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820] md:hidden" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
