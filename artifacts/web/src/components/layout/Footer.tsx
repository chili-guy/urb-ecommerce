import { Hexagon } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-secondary/30 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 text-foreground">
              <Hexagon className="h-6 w-6 text-primary" />
              <span className="font-display font-bold text-xl tracking-tight">Nexa</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Curadoria técnica de eletrônicos. Equipamentos selecionados para quem exige o melhor desempenho.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4">Produtos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/catalogo" className="hover:text-primary">Todos os Produtos</Link></li>
              <li><Link href="/catalogo?category=Laptops" className="hover:text-primary">Notebooks</Link></li>
              <li><Link href="/catalogo?category=Audio" className="hover:text-primary">Áudio Profissional</Link></li>
              <li><Link href="/catalogo?category=Accessories" className="hover:text-primary">Acessórios</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Minha Conta</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/conta" className="hover:text-primary">Perfil</Link></li>
              <li><Link href="/conta" className="hover:text-primary">Meus Pedidos</Link></li>
              <li><Link href="/carrinho" className="hover:text-primary">Carrinho</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Administração</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/admin" className="hover:text-primary">Painel de Controle</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Nexa Eletrônicos. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <span>Privacidade</span>
            <span>Termos de Uso</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
