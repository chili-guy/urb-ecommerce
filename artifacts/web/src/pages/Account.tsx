import { useState } from "react";
import { useGetProfile, useUpdateProfile, useListOrders, useGetOrder } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, User, MapPin, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function OrderDetailModal({ orderId, onClose }: { orderId: number, onClose: () => void }) {
  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: ['order', orderId] } });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <div className="bg-card border shadow-xl rounded-xl p-8 w-full max-w-lg text-center text-muted-foreground">
          Carregando detalhes do pedido...
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border shadow-xl rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-card z-10">
          <h2 className="text-xl font-display font-bold">Detalhes do Pedido #{order.id}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Data da compra</div>
              <div className="font-medium">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium">
                {order.status}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold mb-4 border-b pb-2">Itens</h3>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item.productId} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium">{item.quantity}x</span> {item.productName}
                  </div>
                  <div className="font-mono text-muted-foreground">{formatCurrency(item.total)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary/30 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete ({order.shippingOption.carrier})</span>
              <span className="font-mono">{formatCurrency(order.shipping)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold text-base">
              <span>Total</span>
              <span className="font-mono text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const { data: profile, isLoading: profileLoading } = useGetProfile();
  const { data: orders, isLoading: ordersLoading } = useListOrders();
  
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Initialize form when profile loads
  if (profile && !name && !isEditing) {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setPostalCode(profile.postalCode);
    setCity(profile.city);
    setState(profile.state);
  }

  const handleSaveProfile = () => {
    updateProfile.mutate({
      data: { name, email, phone, postalCode, city, state }
    }, {
      onSuccess: () => {
        toast.success("Perfil atualizado com sucesso!");
        setIsEditing(false);
      }
    });
  };

  if (profileLoading) {
    return <div className="container mx-auto px-4 py-24 text-center animate-pulse">Carregando...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Minha Conta</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-card">
            <button 
              className={`flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${activeTab === 'orders' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/50 text-muted-foreground'}`}
              onClick={() => setActiveTab('orders')}
            >
              <Package className="h-5 w-5" /> Meus Pedidos
            </button>
            <button 
              className={`flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${activeTab === 'profile' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/50 text-muted-foreground'}`}
              onClick={() => setActiveTab('profile')}
            >
              <User className="h-5 w-5" /> Dados Pessoais
            </button>
          </div>
        </div>

        <div className="md:col-span-3">
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-xl font-display font-bold">Histórico de Pedidos</h2>
              
              {ordersLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-32 bg-secondary rounded-lg" />)}
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="border rounded-lg border-dashed p-12 text-center text-muted-foreground">
                  Nenhum pedido encontrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border rounded-lg bg-card overflow-hidden">
                      <div className="p-4 border-b bg-secondary/20 flex flex-wrap justify-between gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block mb-1">Pedido</span>
                          <span className="font-mono font-medium">#{order.id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Data</span>
                          <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Total</span>
                          <span className="font-mono font-medium text-primary">{formatCurrency(order.total)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Status</span>
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium">
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(order.id)}>
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="border rounded-lg bg-card p-6 md:p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-bold">Informações Pessoais</h2>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>Editar</Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo</label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-secondary/30" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    disabled={!isEditing}
                    type="email"
                    className={!isEditing ? "bg-secondary/30" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-secondary/30" : ""}
                  />
                </div>
              </div>

              <h3 className="font-display font-bold border-b pb-2 pt-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Endereço
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CEP</label>
                  <Input 
                    value={postalCode} 
                    onChange={e => setPostalCode(e.target.value)} 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-secondary/30" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cidade</label>
                  <Input 
                    value={city} 
                    onChange={e => setCity(e.target.value)} 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-secondary/30" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input 
                    value={state} 
                    onChange={e => setState(e.target.value)} 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-secondary/30" : ""}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-4 pt-4 border-t">
                  <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {selectedOrderId && (
        <OrderDetailModal 
          orderId={selectedOrderId} 
          onClose={() => setSelectedOrderId(null)} 
        />
      )}
    </div>
  );
}
