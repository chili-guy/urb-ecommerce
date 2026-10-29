import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { formatCep } from "@/lib/cep";
import { trackPurchase } from "@/lib/analytics";
import { PAYMENT_METHOD_LABELS, type Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Copy, Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

function useCountdown(until: string | null): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!until) return setLeft(null);
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return left;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Avisa o Analytics da compra UMA vez, e só se o pagamento caiu agora há pouco (não ao reabrir pedido antigo). */
function useTrackPurchaseOnce(order: Order | undefined) {
  useEffect(() => {
    if (!order || order.paymentStatus !== "paid" || !order.paidAt) return;
    if (Date.now() - new Date(order.paidAt).getTime() > 15 * 60 * 1000) return;
    const key = `ur3:purchase-tracked:${order.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* storage bloqueado: segue e conta mesmo assim */
    }
    trackPurchase(
      order.id,
      order.total,
      order.items.map((i) => ({ id: i.productId, name: i.productName, price: i.unitPrice, quantity: i.quantity })),
    );
  }, [order]);
}

function PixBox({ order }: { order: Order }) {
  const left = useCountdown(order.paymentExpiresAt);
  const pix = order.pix;
  if (!pix) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pix.payload);
      toast.success("Código Pix copiado");
    } catch {
      toast.error("Não consegui copiar. Selecione o código e copie manualmente.");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-lg border bg-card p-5 text-center sm:p-6">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
        <Clock className="h-4 w-4" />
        {left === null ? "Aguardando pagamento" : left > 0 ? `Pague em até ${mmss(left)}` : "Prazo terminando — atualizando..."}
      </div>
      <img
        src={`data:image/png;base64,${pix.encodedImage}`}
        alt="QR Code do Pix"
        className="mx-auto h-56 w-56 rounded-md border bg-white p-2"
      />
      <div className="space-y-2 text-left">
        <p className="text-sm font-medium">Ou use o Pix copia e cola:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={pix.payload}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 font-mono text-xs"
          />
          <Button type="button" variant="secondary" onClick={copy} className="shrink-0">
            <Copy className="mr-2 h-4 w-4" /> Copiar
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código. Esta página confirma sozinha assim que o
        pagamento cair — não precisa atualizar. O estoque fica reservado até o fim do prazo.
      </p>
    </div>
  );
}

function StatusHeader({ order }: { order: Order }) {
  const status = order.paymentStatus;
  if (status === "paid") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold">Pagamento confirmado!</h1>
        <p className="text-muted-foreground">Obrigado por comprar na UR3. Seu pedido #{order.id} foi confirmado.</p>
        {order.paymentNote && (
          <p className="mx-auto mt-3 flex max-w-md items-start justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {order.paymentNote}
          </p>
        )}
      </div>
    );
  }
  if (status === "pending") {
    const isCard = order.paymentMethod === "credit_card";
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          {isCard ? <Loader2 className="h-10 w-10 animate-spin" /> : <Clock className="h-10 w-10" />}
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold">
          {isCard ? "Estamos confirmando seu pagamento" : "Pedido #" + order.id + " aguardando o Pix"}
        </h1>
        <p className="text-muted-foreground">
          {isCard
            ? "O cartão está em análise. Isso costuma levar poucos minutos e esta página atualiza sozinha."
            : "Falta só pagar. O pedido é confirmado automaticamente quando o pagamento cair."}
        </p>
      </div>
    );
  }
  if (status === "failed" || status === "expired") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
          <XCircle className="h-10 w-10" />
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold">
          {status === "expired" ? "O prazo para pagar terminou" : "Pagamento não concluído"}
        </h1>
        <p className="text-muted-foreground">
          O pedido #{order.id} foi cancelado e os produtos voltaram para a loja. Você não foi cobrado. Se ainda quiser, é só
          fazer um novo pedido.
        </p>
      </div>
    );
  }
  if (status === "refunded") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <RotateCcw className="h-10 w-10" />
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold">Pagamento reembolsado</h1>
        <p className="text-muted-foreground">O valor do pedido #{order.id} foi devolvido a você.</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <h1 className="mb-2 font-display text-3xl font-bold">Pedido #{order.id}</h1>
      <p className="text-muted-foreground">{order.status}</p>
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { user, isLoading: authLoading } = useAuth();
  const { data: order, isLoading, isError } = useOrder(Number.isInteger(orderId) ? orderId : null, { poll: true });
  useTrackPurchaseOnce(order);

  if (authLoading || (isLoading && user)) {
    return (
      <div className="container mx-auto flex justify-center px-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-4 font-display text-2xl font-bold">Entre para ver o pedido</h1>
        <Button asChild>
          <Link href={`/entrar?next=/pedido/${id}`}>Entrar</Link>
        </Button>
      </div>
    );
  }
  if (isError || !order) {
    return (
      <div className="container mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 font-display text-2xl font-bold">Pedido não encontrado</h1>
        <p className="mb-6 text-muted-foreground">Confira o endereço ou veja seus pedidos na sua conta.</p>
        <Button asChild>
          <Link href="/conta">Meus pedidos</Link>
        </Button>
      </div>
    );
  }

  const addr = order.shippingAddress;
  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
      <StatusHeader order={order} />

      {order.paymentStatus === "pending" && order.paymentMethod === "pix" && <PixBox order={order} />}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b bg-secondary/30 px-5 py-4 font-display text-lg font-bold">Resumo do pedido #{order.id}</div>
        <div className="space-y-4 p-5 text-sm">
          {order.items.map((it, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span>
                {it.quantity}x {it.productName}
              </span>
              <span className="shrink-0 font-mono">{formatCurrency(it.total)}</span>
            </div>
          ))}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Desconto{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span className="font-mono">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Frete ({order.shippingOption.carrier} — {order.shippingOption.service})</span>
              <span className="font-mono">{formatCurrency(order.shipping)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Total</span>
              <span className="font-mono text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            {addr && (
              <div>
                <p className="mb-1 font-medium">Entrega</p>
                <p className="text-muted-foreground">
                  {addr.street}, {addr.number}
                  {addr.complement ? ` — ${addr.complement}` : ""}
                  <br />
                  {addr.district} · {addr.city}/{addr.state}
                  <br />
                  CEP {formatCep(addr.postalCode)}
                </p>
              </div>
            )}
            {order.paymentMethod && (
              <div>
                <p className="mb-1 font-medium">Pagamento</p>
                <p className="text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                  {order.paymentMethod === "credit_card" && order.installments && order.installments > 1
                    ? ` em ${order.installments}x`
                    : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href="/conta">Meus pedidos</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/catalogo">Continuar comprando</Link>
        </Button>
      </div>
    </div>
  );
}
