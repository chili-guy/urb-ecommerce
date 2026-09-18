import { useParams, Link } from "wouter";
import {
  incrementProductView,
  useCreateReview,
  useProduct,
  useProductReviews,
  useProductVariants,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, youtubeEmbedUrl } from "@/lib/utils";
import { getShippingOptions } from "@/lib/shipping";
import { useCart } from "@/lib/cart-context";
import { trackAddToCart, trackViewItem } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_CONDITION_LABELS, type ShippingOption } from "@/lib/types";
import {
  ShoppingCart,
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  Check,
  ListChecks,
  PlayCircle,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

function ShippingEstimator({ productId }: { productId: number }) {
  const [cep, setCep] = useState("");
  const [options, setOptions] = useState<ShippingOption[] | null>(null);

  const handleCalculate = () => {
    if (cep.replace(/\D/g, "").length < 8) {
      toast.error("CEP inválido");
      return;
    }
    setOptions(getShippingOptions(1, cep));
  };

  return (
    <div className="rounded-lg border bg-secondary/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Truck className="h-4 w-4 text-primary" /> Calcule o frete
      </div>
      <div className="flex gap-2">
        <Input
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          className="h-10 bg-background"
        />
        <Button variant="secondary" className="shrink-0" onClick={handleCalculate}>
          Calcular
        </Button>
      </div>
      {options && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {options.map((o) => (
            <li key={o.id} className="flex justify-between">
              <span className="text-muted-foreground">
                {o.carrier} · {o.service} ({o.deliveryDays} dias úteis)
              </span>
              <span className="font-mono font-medium">
                {o.price === 0 ? "Grátis" : formatCurrency(o.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground" data-product={productId}>
        Estimativa. O valor final é confirmado no checkout.
      </p>
    </div>
  );
}

function VariantPicker({ productId, variantGroup }: { productId: number; variantGroup: string }) {
  const { data: variants } = useProductVariants(variantGroup);
  if (!variants || variants.length < 2) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium">Variações disponíveis</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const active = v.id === productId;
          return (
            <Link
              key={v.id}
              href={`/produto/${v.id}`}
              className={`rounded-md border px-3.5 py-2 text-sm transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : v.stock > 0
                    ? "border-border hover:border-primary/50"
                    : "border-border text-muted-foreground opacity-50"
              }`}
            >
              {v.variantLabel || v.name}
              {v.stock <= 0 && " (esgotado)"}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          className="text-amber-500"
        >
          <Star className={`h-6 w-6 ${n <= value ? "fill-current" : ""}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ productId }: { productId: number }) {
  const { user } = useAuth();
  const { data: reviews, isLoading } = useProductReviews(productId);
  const createReview = useCreateReview();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const myReview = reviews?.find((r) => r.userId === user?.id);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Escreva um comentário antes de enviar.");
      return;
    }
    createReview.mutate(
      { productId, author: user?.name ?? "", rating, comment },
      {
        onSuccess: () => {
          toast.success(myReview ? "Avaliação atualizada" : "Avaliação enviada, obrigado!");
          setComment("");
        },
        onError: () => toast.error("Não foi possível enviar sua avaliação."),
      },
    );
  };

  return (
    <section className="border-t pt-10">
      <h2 className="mb-6 flex items-center gap-2 font-display text-xl font-bold sm:text-2xl">
        <MessageSquare className="h-5 w-5" /> Avaliações de clientes
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 space-y-3 rounded-lg border bg-card p-4 sm:p-6">
          <p className="text-sm font-medium">
            {myReview ? "Atualize sua avaliação" : "Deixe sua avaliação"}
          </p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={comment || myReview?.comment || ""}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte como foi sua experiência com o produto..."
            className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button type="submit" size="sm" disabled={createReview.isPending}>
            {createReview.isPending ? "Enviando..." : myReview ? "Atualizar avaliação" : "Enviar avaliação"}
          </Button>
        </form>
      ) : (
        <div className="mb-8 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <Link href={`/entrar?next=/produto/${productId}`} className="font-medium text-primary hover:underline">
            Entre na sua conta
          </Link>{" "}
          para avaliar este produto.
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-secondary" />)}
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda. Seja o primeiro a avaliar.</p>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <div key={r.id} className="border-b pb-5 last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5" fill={i < r.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.author || "Cliente UR3"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProduct(Number(id), { enabled: !!id });
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Conta 1 acesso por produto por sessão do navegador (métrica do painel).
  useEffect(() => {
    if (!product) return;
    setActiveImage(0);
    const key = `ur3:viewed:${product.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* modo privado / storage bloqueado — conta mesmo assim */
    }
    void incrementProductView(product.id);
    trackViewItem({ id: product.id, name: product.name, price: product.price, category: product.category });
  }, [product]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 w-32 bg-secondary rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-secondary rounded-lg" />
          <div className="space-y-6">
            <div className="h-10 bg-secondary rounded w-3/4" />
            <div className="h-6 bg-secondary rounded w-1/4" />
            <div className="h-8 bg-secondary rounded w-1/3" />
            <div className="space-y-2 pt-8">
              <div className="h-4 bg-secondary rounded w-full" />
              <div className="h-4 bg-secondary rounded w-full" />
              <div className="h-4 bg-secondary rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Produto não encontrado</h2>
        <Button asChild>
          <Link href="/catalogo">Voltar ao catálogo</Link>
        </Button>
      </div>
    );
  }

  const gallery = [product.imageUrl, ...product.images];
  const videoEmbed = product.videoUrl ? youtubeEmbedUrl(product.videoUrl) : null;

  const handleAdd = () => {
    addItem(product, quantity);
    trackAddToCart({ id: product.id, name: product.name, price: product.price, quantity, category: product.category });
    toast.success("Adicionado ao carrinho", {
      description: `${quantity}x ${product.name}`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <Link href="/catalogo" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:mb-8">
        <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
      </Link>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12 lg:gap-16">
        <div>
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-secondary/30 p-6 sm:p-8">
            {product.featured && (
              <Badge className="absolute top-4 left-4 z-10 bg-accent hover:bg-accent border-none text-accent-foreground">
                Destaque
              </Badge>
            )}
            {product.condition !== "novo" && (
              <Badge className="absolute top-4 right-4 z-10 border-none bg-foreground text-background hover:bg-foreground">
                {PRODUCT_CONDITION_LABELS[product.condition]}
              </Badge>
            )}
            <img
              src={gallery[activeImage] ?? product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/800x800/e2e8f0/1e293b?text=Produto';
              }}
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white p-1 transition-colors ${
                    activeImage === i ? "border-primary ring-1 ring-primary" : "border-border/60"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">
            {product.category}
            {product.subcategory ? ` · ${product.subcategory}` : ""}
            {product.sku ? ` · SKU ${product.sku}` : ""}
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold tracking-tight sm:text-3xl md:mb-4 md:text-4xl">
            {product.name}
          </h1>

          {product.variantGroup && (
            <VariantPicker productId={product.id} variantGroup={product.variantGroup} />
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-amber-500">
              <Star className="h-5 w-5 fill-current" />
              <span className="ml-1 font-medium">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              ({product.reviewCount} avaliações)
            </span>
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" /> Em estoque
            </span>
          </div>

          <div className="mb-8">
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div className="text-lg text-muted-foreground line-through mb-1">
                {formatCurrency(product.compareAtPrice)}
              </div>
            )}
            <div className="text-4xl font-mono font-bold text-primary">
              {formatCurrency(product.price)}
            </div>
          </div>

          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            {product.description}
          </p>

          {product.specs.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <ListChecks className="h-4 w-4" /> Especificações técnicas
              </h2>
              <dl className="divide-y divide-border overflow-hidden rounded-lg border">
                {product.specs.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4"
                  >
                    <dt className="font-medium text-muted-foreground">{s.label}</dt>
                    <dd className="text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mb-8">
            <ShippingEstimator productId={product.id} />
          </div>

          <div className="mt-auto space-y-6 pt-8 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <button
                  className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-12 text-center font-medium font-mono">{quantity}</span>
                <button
                  className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
              <Button size="lg" className="flex-1 text-base h-12 px-3 sm:px-6" onClick={handleAdd}>
                <ShoppingCart className="mr-2 h-5 w-5 shrink-0" />
                <span className="sm:hidden">Adicionar</span>
                <span className="hidden sm:inline">Adicionar ao Carrinho</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 sm:gap-4">
              <div className="flex gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <span>Garantia de 12 meses direto com a UR3.</span>
              </div>
              <div className="flex gap-3 text-sm text-muted-foreground">
                <Truck className="h-5 w-5 shrink-0 text-primary" />
                <span>Frete expresso disponível para todo Brasil.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {videoEmbed && (
        <section className="mt-12 border-t pt-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold sm:text-2xl">
            <PlayCircle className="h-5 w-5" /> Vídeo do produto
          </h2>
          <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl border bg-black">
            <iframe
              src={videoEmbed}
              title={`Vídeo — ${product.name}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <div className="mt-12">
        <ReviewsSection productId={product.id} />
      </div>
    </div>
  );
}
