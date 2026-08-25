import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/utils";
import { useGetShippingQuote, useCreateOrder, useGetProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { data: profile } = useGetProfile();
  
  const [postalCode, setPostalCode] = useState(profile?.postalCode || "");
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [orderComplete, setOrderComplete] = useState<number | null>(null);

  const getShippingQuote = useGetShippingQuote();
  const createOrder = useCreateOrder();

  const handleCalculateShipping = () => {
    if (postalCode.length < 8) {
      toast.error("CEP inválido");
      return;
    }
    
    getShippingQuote.mutate({
      data: {
        postalCode,
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity }))
      }
    });
  };

  const handleCheckout = () => {
    if (!name || !email || !selectedShipping) {
      toast.error("Preencha todos os campos e selecione o frete.");
      return;
    }

    createOrder.mutate({
      data: {
        customerName: name,
        customerEmail: email,
        postalCode,
        shippingOptionId: selectedShipping,
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity }))
      }
    }, {
      onSuccess: (order) => {
        setOrderComplete(order.id);
        clearCart();
      },
      onError: () => {
        toast.error("Erro ao processar pedido. Tente novamente.");
      }
    });
  };

  if (orderComplete) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-lg">
        <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-4">Pedido Confirmado!</h1>
        <p className="text-muted-foreground mb-2">
          Obrigado por comprar na Nexa. Seu pedido #{orderComplete} foi recebido.
        </p>
        <p className="text-muted-foreground mb-8">
          Enviamos um email de confirmação para {email}.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/conta">Acompanhar Pedido</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Seu carrinho está vazio</h2>
        <Button asChild>
          <Link href="/catalogo">Voltar à loja</Link>
        </Button>
      </div>
    );
  }

  const shippingOptions = getShippingQuote.data || [];
  const selectedOption = shippingOptions.find(o => o.id === selectedShipping);
  const total = subtotal + (selectedOption?.price || 0);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Finalizar Pedido</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-10">
          
          <section>
            <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> 
              Identificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border rounded-lg bg-card">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="joao@exemplo.com" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
              Entrega
            </h3>
            <div className="p-6 border rounded-lg bg-card space-y-6">
              <div className="flex gap-4 items-end">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">CEP</label>
                  <Input 
                    value={postalCode} 
                    onChange={e => setPostalCode(e.target.value)} 
                    placeholder="00000-000" 
                    maxLength={9}
                  />
                </div>
                <Button 
                  onClick={handleCalculateShipping} 
                  disabled={getShippingQuote.isPending}
                  variant="secondary"
                >
                  Calcular
                </Button>
              </div>

              {shippingOptions.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Opções de Frete</p>
                  {shippingOptions.map(option => (
                    <label 
                      key={option.id}
                      className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition-colors ${
                        selectedShipping === option.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="shipping" 
                          value={option.id}
                          checked={selectedShipping === option.id}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <div>
                          <div className="font-medium">{option.carrier} - {option.service}</div>
                          <div className="text-xs text-muted-foreground">{option.deliveryDays} dias úteis • {option.description}</div>
                        </div>
                      </div>
                      <div className="font-mono font-medium">
                        {option.price === 0 ? "Grátis" : formatCurrency(option.price)}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span> 
              Pagamento
            </h3>
            <div className="p-6 border rounded-lg bg-card flex items-center gap-4 text-muted-foreground">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">Ambiente de teste</p>
                <p className="text-sm">Nenhum pagamento real será processado. Clique em finalizar pedido.</p>
              </div>
            </div>
          </section>

        </div>

        <div className="lg:col-span-5">
          <div className="border rounded-lg bg-card sticky top-24 overflow-hidden">
            <div className="p-6 bg-secondary/30 border-b">
              <h3 className="font-display font-bold text-lg">Resumo do Pedido</h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.product.id} className="flex gap-4 text-sm">
                    <div className="w-16 h-16 rounded border bg-white overflow-hidden shrink-0">
                      <img src={item.product.imageUrl} className="w-full h-full object-contain p-1 mix-blend-multiply" alt=""/>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium line-clamp-2">{item.product.name}</div>
                      <div className="text-muted-foreground">Qtd: {item.quantity}</div>
                    </div>
                    <div className="font-mono font-medium">
                      {formatCurrency(item.product.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-mono">{selectedOption ? formatCurrency(selectedOption.price) : "---"}</span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-end">
                  <span className="font-bold">Total</span>
                  <span className="font-mono font-bold text-2xl text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
              
              <Button 
                size="lg" 
                className="w-full text-base h-12" 
                onClick={handleCheckout}
                disabled={createOrder.isPending || !selectedShipping}
              >
                {createOrder.isPending ? "Processando..." : "Confirmar Pedido"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
