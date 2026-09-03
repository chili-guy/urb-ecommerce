import { Heart, ShoppingCart, Star, Truck } from 'lucide-react';
import './_group.css';

export function KabumInspired() {
  return (
    <main className="jurb-card-stage min-h-screen bg-[#eef0f2] p-8 flex items-center justify-center">
      <article className="jurb-commerce-card relative flex h-[610px] w-[354px] cursor-pointer flex-col overflow-hidden rounded-[18px] border border-transparent bg-white">
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-1 text-xs font-bold text-[#626b74]">
            <Star size={13} fill="#ff8a0a" className="text-[#ff8a0a]" />
            <span>4.9</span>
            <span className="font-medium text-[#9aa0a6]">(128)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="jurb-icon-button grid h-9 w-9 place-items-center rounded-full text-[#61707a] transition-colors hover:bg-[#f4f1eb] hover:text-[#ff8a0a]"
              aria-label="Adicionar aos favoritos"
            >
              <Heart size={20} />
            </button>
            <button
              className="jurb-icon-button relative grid h-9 w-9 place-items-center rounded-full text-[#61707a] transition-colors hover:bg-[#f4f1eb] hover:text-[#ff8a0a]"
              aria-label="Adicionar ao carrinho"
            >
              <ShoppingCart size={20} />
              <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-white bg-[#ff8a0a]" />
            </button>
          </div>
        </div>

        <div className="relative mx-4 flex h-[238px] items-center justify-center">
          <span className="jurb-card-mono absolute left-0 top-3 z-10 rounded bg-[#111820] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
            Oferta JURB
          </span>
          <span className="absolute right-0 top-3 z-10 rounded bg-[#e9f8ef] px-2.5 py-1 text-xs font-bold text-[#198754]">
            -12%
          </span>
          <img
            src="/__mockup/images/jurb-card-console.jpg"
            alt="Console Core Station"
            className="jurb-card-image h-[205px] w-full object-contain mix-blend-multiply"
          />
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5">
          <p className="jurb-card-mono mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff8a0a]">
            Gaming · pronta entrega
          </p>
          <h2 className="jurb-card-display line-clamp-2 min-h-[52px] text-[18px] font-semibold leading-[1.38] text-[#242a30]">
            Core Station, 1TB SSD, controle sem fio e desempenho 4K
          </h2>

          <div className="mt-3">
            <p className="text-xs text-[#7c848c] line-through">R$ 3.999,00</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <strong className="jurb-card-display text-[28px] leading-none text-[#ff7800]">R$ 3.499,00</strong>
            </div>
            <p className="mt-1 text-xs font-bold text-[#198754]">à vista no Pix</p>
            <p className="mt-1.5 text-sm text-[#535d66]">
              ou <strong>12x de R$ 291,58</strong> sem juros
            </p>
          </div>

          <div className="mt-auto">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#59636c]">
              <Truck size={15} className="text-[#ff8a0a]" />
              Envio rápido para todo o Brasil
            </div>
            <button className="jurb-buy-button flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff8a0a] font-bold uppercase tracking-[0.08em] text-[#111820] transition-colors hover:bg-[#e66f00] hover:text-white">
              <ShoppingCart size={18} />
              Comprar
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}