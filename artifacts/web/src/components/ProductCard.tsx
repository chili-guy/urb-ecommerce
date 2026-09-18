import { useState, type MouseEvent } from "react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_CONDITION_LABELS, type Product } from "@/lib/types";
import { Rocket, ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { trackAddToCart } from "@/lib/analytics";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  // A 1ª foto usa a versão "-transparent.png" (recorte de fundo do catálogo
  // seed); as demais são as imagens de galeria cadastradas no admin, tal qual.
  const transparentImageUrl = product.imageUrl.replace(
    /\.(jpe?g|webp)$/i,
    "-transparent.png",
  );
  const gallery = [transparentImageUrl, ...product.images];
  const activeSrc = activeImage === 0 ? transparentImageUrl : gallery[activeImage];

  // Passar o mouse sobre a foto alterna entre as imagens (estilo Mercado Livre).
  const handleGalleryHover = (event: MouseEvent<HTMLDivElement>) => {
    if (gallery.length <= 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.min(gallery.length - 1, Math.max(0, Math.floor(ratio * gallery.length)));
    setActiveImage(index);
  };

  const hasDiscount =
    product.compareAtPrice !== null &&
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) *
          100,
      )
    : 0;
  const installmentValue = product.price / 12;

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addItem(product, 1);
    trackAddToCart({ id: product.id, name: product.name, price: product.price, category: product.category });
  };

  return (
    <Link href={`/produto/${product.id}`} className="block h-full">
      <article className="jurb-catalog-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[#e4dfd7] bg-white p-3 shadow-[0_10px_34px_rgba(17,24,32,0.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_20px_48px_rgba(17,24,32,0.14)] sm:rounded-2xl sm:p-4">
        {hasDiscount && (
          <span className="font-mono absolute left-2.5 top-2.5 z-10 rounded-md bg-[#ff6a13] px-2 py-1 text-[11px] font-bold text-white shadow-[0_5px_14px_rgba(255,106,19,0.28)] sm:left-3 sm:top-3 sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-xs">
            -{discountPercentage}%
          </span>
        )}
        {product.condition !== "novo" && (
          <span className="absolute right-2.5 top-2.5 z-10 rounded-md bg-[#111820] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_5px_14px_rgba(17,24,32,0.28)] sm:right-3 sm:top-3 sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-[11px]">
            {PRODUCT_CONDITION_LABELS[product.condition]}
          </span>
        )}

        <div
          className="relative flex h-[150px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-2 sm:h-[250px] sm:rounded-xl sm:px-4 sm:pt-4"
          onMouseMove={handleGalleryHover}
          onMouseLeave={() => setActiveImage(0)}
        >
          <img
            key={activeImage}
            src={activeSrc}
            alt={product.name}
            className="jurb-catalog-card-image h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.045] sm:h-[270px] sm:w-[270px] sm:max-w-none"
            onError={(event) => {
              if (activeImage === 0 && event.currentTarget.dataset.fallback !== "original") {
                event.currentTarget.dataset.fallback = "original";
                event.currentTarget.src = product.imageUrl;
                return;
              }
              event.currentTarget.src = "/images/keyboard.jpg";
            }}
            loading="lazy"
            decoding="async"
          />

          {gallery.length > 1 && (
            <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 gap-1 sm:bottom-2.5">
              {gallery.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full shadow-sm transition-all ${
                    i === activeImage ? "w-3.5 bg-primary" : "w-1.5 bg-[#111820]/25"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-1 flex flex-1 flex-col px-0.5 sm:px-1">
          <div className="mb-2 flex w-fit items-center gap-1 rounded bg-[#e8f5ec] px-1.5 py-0.5 text-[10px] font-bold text-[#267b4e] sm:mb-3 sm:gap-1.5 sm:rounded-md sm:px-2 sm:py-1 sm:text-[11px]">
            <Rocket className="h-3 w-3" />
            Frete grátis
          </div>

          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-[#242424] sm:min-h-[63px] sm:line-clamp-3 sm:text-[15px] sm:leading-[1.38]">
            {product.name}
          </h3>

          <div className="mt-1.5 flex items-center gap-1 sm:mt-2">
            <div
              className="flex text-[#f7c500]"
              aria-label={`Avaliação ${product.rating.toFixed(1)} de 5`}
            >
              {[0, 1, 2, 3, 4].map((star) => (
                <Star
                  key={star}
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                  fill={star < Math.round(product.rating) ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span className="text-[11px] text-[#555] sm:text-xs">({product.reviewCount})</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3 sm:gap-3">
            <div className="min-w-0">
              {hasDiscount && (
                <p className="text-[11px] text-[#8a8a8a] sm:text-xs">
                  De:{" "}
                  <span className="line-through">
                    {formatCurrency(product.compareAtPrice!)}
                  </span>
                </p>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 sm:mt-1 sm:gap-2">
                <strong className="text-[19px] font-bold leading-none text-[#2f7f57] sm:text-[25px]">
                  {formatCurrency(product.price)}
                </strong>
                <span className="hidden rounded bg-[#e6f2eb] px-2 py-1 text-[10px] font-bold text-[#2f7f57] sm:inline">
                  à vista no Pix
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-[#555] sm:mt-3 sm:text-xs">
                12x de <strong>{formatCurrency(installmentValue)}</strong> s/ juros
              </p>
            </div>

            <button
              type="button"
              aria-label={`Adicionar ${product.name} ao carrinho`}
              onClick={handleAdd}
              className="jurb-card-cart-button grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ff5a14] text-white shadow-[0_7px_18px_rgba(255,90,20,0.3)] transition-colors hover:bg-[#dc4100] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffc49f] sm:h-12 sm:w-12"
            >
              <ShoppingCart className="h-[18px] w-[18px] sm:h-[21px] sm:w-[21px]" strokeWidth={2.3} />
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
