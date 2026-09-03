import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@workspace/api-client-react";
import { Rocket, ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const transparentImageUrl = product.imageUrl.replace(
    /\.(jpe?g|webp)$/i,
    "-transparent.png",
  );
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

  const handleAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addItem(product, 1);
  };

  return (
    <Link href={`/produto/${product.id}`} className="block h-full">
      <article className="jurb-catalog-card group relative flex h-full min-h-[560px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#e4dfd7] bg-white p-4 shadow-[0_10px_34px_rgba(17,24,32,0.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_20px_48px_rgba(17,24,32,0.14)]">
        {hasDiscount && (
          <span className="font-mono absolute left-3 top-3 z-10 rounded-lg bg-[#ff6a13] px-2.5 py-1.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(255,106,19,0.28)]">
            -{discountPercentage}%
          </span>
        )}

        <div className="flex h-[250px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white px-4 pt-4">
          <img
            src={transparentImageUrl}
            alt={product.name}
            className="jurb-catalog-card-image h-[270px] w-[270px] max-w-none object-contain transition-transform duration-300 group-hover:scale-[1.045]"
            onError={(event) => {
              if (event.currentTarget.dataset.fallback !== "original") {
                event.currentTarget.dataset.fallback = "original";
                event.currentTarget.src = product.imageUrl;
                return;
              }
              event.currentTarget.src = "/images/keyboard.jpg";
            }}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="mt-1 flex flex-1 flex-col px-1">
          <div className="mb-3 flex w-fit items-center gap-1.5 rounded-md bg-[#e8f5ec] px-2 py-1 text-[11px] font-bold text-[#267b4e]">
            <Rocket className="h-3 w-3" />
            Frete grátis
          </div>

          <h3 className="line-clamp-3 min-h-[63px] text-[15px] font-medium leading-[1.38] text-[#242424]">
            {product.name}
          </h3>

          <div className="mt-2 flex items-center gap-1">
            <div
              className="flex text-[#f7c500]"
              aria-label={`Avaliação ${product.rating.toFixed(1)} de 5`}
            >
              {[0, 1, 2, 3, 4].map((star) => (
                <Star
                  key={star}
                  className="h-3.5 w-3.5"
                  fill={star < Math.round(product.rating) ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span className="text-xs text-[#555]">({product.reviewCount})</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="min-w-0">
              {hasDiscount && (
                <p className="text-xs text-[#8a8a8a]">
                  De:{" "}
                  <span className="line-through">
                    {formatCurrency(product.compareAtPrice!)}
                  </span>{" "}
                  por:
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <strong className="text-[25px] font-bold leading-none text-[#2f7f57]">
                  {formatCurrency(product.price)}
                </strong>
                <span className="rounded bg-[#e6f2eb] px-2 py-1 text-[10px] font-bold text-[#2f7f57]">
                  à vista no Pix
                </span>
              </div>
              <p className="mt-3 text-xs text-[#555]">
                12x de <strong>{formatCurrency(installmentValue)}</strong> sem
                juros
              </p>
            </div>

            <button
              type="button"
              aria-label={`Adicionar ${product.name} ao carrinho`}
              onClick={handleAdd}
              className="jurb-card-cart-button grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ff5a14] text-white shadow-[0_7px_18px_rgba(255,90,20,0.3)] transition-colors hover:bg-[#dc4100] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffc49f]"
            >
              <ShoppingCart className="h-[21px] w-[21px]" strokeWidth={2.3} />
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}