import { Heart, Rocket, Star } from 'lucide-react';
import './_group.css';

export function TerabyteInspired() {
  return (
    <main className="jurb-card-stage flex min-h-screen items-center justify-center bg-[#f3f3f3] p-8">
      <article className="jurb-commerce-card group relative flex h-[560px] w-[330px] cursor-pointer flex-col overflow-hidden rounded-[16px] border border-[#e4dfd7] bg-white p-4">
        <span className="jurb-card-mono absolute left-3 top-3 z-10 rounded-lg bg-[#ff6a13] px-2.5 py-1.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(255,106,19,.28)]">
          -12%
        </span>
        <button
          aria-label="Adicionar aos favoritos"
          className="jurb-icon-button absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#70777d] shadow-sm transition-colors hover:text-[#ff6a13]"
        >
          <Heart size={20} />
        </button>

        <div className="flex h-[250px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fdfdfd] px-4 pt-4">
          <img
            src="/__mockup/images/jurb-card-console.jpg"
            alt="Console Core Station"
            className="jurb-card-image h-[220px] w-full object-contain mix-blend-multiply"
          />
        </div>

        <div className="mt-1 flex flex-1 flex-col px-1">
          <div className="mb-3 flex w-fit items-center gap-1.5 rounded-md bg-[#e8f5ec] px-2 py-1 text-[11px] font-bold text-[#267b4e]">
            <Rocket size={12} />
            Frete grátis
          </div>

          <h2 className="line-clamp-3 min-h-[63px] text-[15px] font-medium leading-[1.38] text-[#242424]">
            Console Core Station, 1TB SSD, controle sem fio, desempenho 4K
          </h2>

          <div className="mt-2 flex items-center gap-1">
            <div className="flex text-[#f7c500]" aria-label="Avaliação 4,9 de 5">
              {[0, 1, 2, 3, 4].map((item) => (
                <Star key={item} size={14} fill="currentColor" />
              ))}
            </div>
            <span className="text-xs text-[#555]">(128)</span>
          </div>

          <div className="mt-auto">
            <p className="text-xs text-[#8a8a8a]">
              De: <span className="line-through">R$ 3.999,00</span> por:
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <strong className="text-[25px] font-bold leading-none text-[#2f7f57]">R$ 3.499,00</strong>
              <span className="rounded bg-[#e6f2eb] px-2 py-1 text-[10px] font-bold text-[#2f7f57]">
                à vista no Pix
              </span>
            </div>
            <p className="mt-3 text-xs text-[#555]">
              12x de <strong>R$ 291,58</strong> sem juros no cartão
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}