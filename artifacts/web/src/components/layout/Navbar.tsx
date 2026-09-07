import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import {
  ShoppingCart,
  User,
  Menu,
  Search,
  ChevronRight,
  Package,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function AccountMenu() {
  const { customer, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="text-[#f4f1eb]"
        aria-label="Carregando conta"
        disabled
      >
        <User className="h-5 w-5 opacity-60" />
      </Button>
    );
  }

  if (!customer) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820]"
        asChild
      >
        <Link href="/entrar" aria-label="Entrar na minha conta">
          <User className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  const firstName = customer.name.split(" ")[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 px-2 text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820]"
          aria-label="Minha conta"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ff8a0a] text-xs font-bold text-[#111820]">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <span className="hidden text-[13px] font-medium sm:inline">{firstName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {customer.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/conta">
            <User className="mr-2 h-4 w-4" /> Minha conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/conta?tab=orders">
            <Package className="mr-2 h-4 w-4" /> Meus pedidos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await logout();
            toast.success("Você saiu da sua conta");
            setLocation("/");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { itemCount } = useCart();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f4f1eb]/15 bg-[#111820]/95 text-[#f4f1eb] backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center"
            aria-label="URB Comércio de Eletrônicos — início"
          >
            <img
              src="/images/jurb-logo-mark.png"
              alt="URB Comércio de Eletrônicos"
              className="h-10 w-10 object-contain transition-opacity group-hover:opacity-85 sm:h-11 sm:w-11"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            <Link href="/#destaques" className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c4c8c9] transition-colors hover:text-[#ff8a0a]">
              Destaques
            </Link>
            <Link href="/#por-que-jurb" className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c4c8c9] transition-colors hover:text-[#ff8a0a]">
              Por que URB
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

          <AccountMenu />

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
