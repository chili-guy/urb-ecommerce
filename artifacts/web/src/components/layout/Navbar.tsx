import { useState } from "react";
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
  LayoutDashboard,
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

const NAV_LINKS = [
  { href: "/#destaques", label: "Destaques" },
  { href: "/#por-que-jurb", label: "Por que URB" },
  { href: "/#oferta", label: "Oferta da semana" },
];

function AccountMenu() {
  const { user, isLoading, isStaff, signOut } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" className="text-[#f4f1eb]" aria-label="Carregando conta" disabled>
        <User className="h-5 w-5 opacity-60" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" size="icon" className="text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820]" asChild>
        <Link href="/entrar" aria-label="Entrar na minha conta">
          <User className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  const firstName = user.name.split(" ")[0];

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
          {user.email}
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
        {isStaff && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" /> Painel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
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

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user, isStaff, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const close = () => setOpen(false);

  const itemCls =
    "flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium text-[#f4f1eb] transition-colors hover:bg-[#ff8a0a] hover:text-[#111820]";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#f4f1eb] hover:bg-[#ff8a0a] hover:text-[#111820] md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[86vw] max-w-[340px] border-[#f4f1eb]/10 bg-[#111820] p-0 text-[#f4f1eb]"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-[#f4f1eb]/10 p-5">
            <img src="/images/jurb-logo-mark.png" alt="" className="h-9 w-9 object-contain" />
            <span className="font-display text-lg font-semibold tracking-tight">URB</span>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            <Link href="/catalogo" onClick={close} className={`${itemCls} bg-[#ff8a0a]/15 text-[#ffb85d]`}>
              <Search className="h-[18px] w-[18px]" /> Ver catálogo
            </Link>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={close} className={itemCls}>
                {l.label}
              </Link>
            ))}

            <div className="my-2 h-px bg-[#f4f1eb]/10" />

            {user ? (
              <>
                <Link href="/conta" onClick={close} className={itemCls}>
                  <User className="h-[18px] w-[18px]" /> Minha conta
                </Link>
                <Link href="/conta?tab=orders" onClick={close} className={itemCls}>
                  <Package className="h-[18px] w-[18px]" /> Meus pedidos
                </Link>
                {isStaff && (
                  <Link href="/admin" onClick={close} className={itemCls}>
                    <LayoutDashboard className="h-[18px] w-[18px]" /> Painel
                  </Link>
                )}
                <button
                  className={`${itemCls} w-full text-left`}
                  onClick={async () => {
                    close();
                    await signOut();
                    toast.success("Você saiu da sua conta");
                    setLocation("/");
                  }}
                >
                  <LogOut className="h-[18px] w-[18px]" /> Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/entrar" onClick={close} className={itemCls}>
                  <User className="h-[18px] w-[18px]" /> Entrar
                </Link>
                <Link href="/cadastrar" onClick={close} className={`${itemCls} text-[#ffb85d]`}>
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Navbar() {
  const { itemCount } = useCart();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f4f1eb]/15 bg-[#111820]/95 text-[#f4f1eb] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:h-[76px] sm:px-8 lg:px-12">
        <div className="flex items-center gap-2 md:gap-8">
          <MobileMenu />

          <Link
            href="/"
            className="group flex items-center"
            aria-label="URB Comércio de Eletrônicos — início"
          >
            <img
              src="/images/jurb-logo-mark.png"
              alt="URB Comércio de Eletrônicos"
              className="h-9 w-9 object-contain transition-opacity group-hover:opacity-85 sm:h-11 sm:w-11"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c4c8c9] transition-colors hover:text-[#ff8a0a]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-2">
          <Link href="/catalogo" className="mr-2 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ffb85d] transition-colors hover:text-[#ff8a0a] lg:flex">
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
        </div>
      </div>
    </header>
  );
}
