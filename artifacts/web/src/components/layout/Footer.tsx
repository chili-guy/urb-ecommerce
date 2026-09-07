import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#111820]/15 bg-[#f4f1eb] text-[#111820]">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center">
              <img src="/images/jurb-logo-full.png" alt="UR3 Comércio de Eletrônicos" className="w-[140px]" />
            </Link>
            <p className="text-sm text-[#4f585d]">
              Curadoria técnica de eletrônicos. Equipamentos selecionados para quem exige o melhor desempenho.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4">Produtos</h4>
             <ul className="space-y-2 text-sm text-[#4f585d]">
              <li><Link href="/catalogo" className="hover:text-[#e26f00]">Todos os Produtos</Link></li>
              <li><Link href="/ofertas" className="hover:text-[#e26f00]">Oferta da semana</Link></li>
              <li><Link href="/catalogo?category=Laptops" className="hover:text-[#e26f00]">Notebooks</Link></li>
               <li><Link href="/catalogo?category=%C3%81udio" className="hover:text-[#e26f00]">Áudio Profissional</Link></li>
               <li><Link href="/catalogo?category=Acess%C3%B3rios" className="hover:text-[#e26f00]">Acessórios</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Minha Conta</h4>
             <ul className="space-y-2 text-sm text-[#4f585d]">
              <li><Link href="/conta" className="hover:text-primary">Perfil</Link></li>
              <li><Link href="/conta" className="hover:text-primary">Meus Pedidos</Link></li>
              <li><Link href="/carrinho" className="hover:text-primary">Carrinho</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">A UR3</h4>
             <ul className="space-y-2 text-sm text-[#4f585d]">
              <li><Link href="/por-que-ur3" className="hover:text-[#e26f00]">Por que a UR3</Link></li>
              <li><Link href="/ofertas" className="hover:text-[#e26f00]">Oferta da semana</Link></li>
              <li><Link href="/admin" className="hover:text-[#e26f00]">Painel de Controle</Link></li>
            </ul>
          </div>
        </div>
        
         <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#111820]/15 pt-8 text-xs text-[#4f585d] md:flex-row">
           <p>© {new Date().getFullYear()} UR3 Comércio de Eletrônicos. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <span>Privacidade</span>
            <span>Termos de Uso</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
