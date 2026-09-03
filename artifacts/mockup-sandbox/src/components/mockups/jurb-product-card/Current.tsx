import { ShoppingCart } from 'lucide-react';
import './_group.css';

export function Current() {
  return (
    <main className="jurb-card-stage min-h-screen bg-[#f4f1eb] p-8 flex items-center justify-center">
      <article className="group relative flex h-[548px] w-[338px] cursor-pointer flex-col overflow-hidden rounded border border-[#d8d2c8] bg-[#faf8f4] transition-all duration-300 hover:border-[#ff8a0a]/50 hover:shadow-lg">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#ebe7df] p-6">
          <span className="absolute right-3 top-3 z-10 rounded-sm bg-[#263c58] px-2.5 py-1 text-xs font-semibold text-white">
            Destaque
          </span>
          <img
            src="/__mockup/images/jurb-card-console.jpg"
            alt="Console Core Station"
            className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="jurb-card-mono mb-2 text-xs uppercase tracking-wider text-[#69717a]">Gaming</p>
          <h2 className="jurb-card-display line-clamp-2 text-lg font-semibold text-[#111820]">
            Core Station
          </h2>

          <div className="mt-auto flex items-end justify-between pt-4">
            <div>
              <p className="mb-1 text-sm text-[#69717a] line-through">R$ 3.999,00</p>
              <p className="jurb-card-mono text-lg font-semibold text-[#ff8a0a]">R$ 3.499,00</p>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff8a0a]/10 text-[#ff8a0a] transition-colors hover:bg-[#ff8a0a] hover:text-white"
              aria-label="Adicionar ao carrinho"
            >
              <ShoppingCart size={17} />
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}