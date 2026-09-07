import { useState, type FormEvent, type ReactNode } from "react";
import { Redirect, useSearchParams } from "wouter";
import {
  useProfile,
  useUpdateProfile,
  useMyOrders,
  useOrder,
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { formatCep, lookupCep, normalizeCep } from "@/lib/cep";
import type { Address, AddressInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, User, MapPin, X, Plus, Star, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function OrderDetailModal({ orderId, onClose }: { orderId: number, onClose: () => void }) {
  const { data: order, isLoading } = useOrder(orderId);

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

const EMPTY_ADDRESS: AddressInput = {
  label: "",
  recipient: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  isDefault: false,
};

function formatAddressLine(a: Address): string {
  const parts = [
    [a.street, a.number].filter(Boolean).join(", "),
    a.complement,
    a.district,
    [a.city, a.state].filter(Boolean).join(" - "),
    a.postalCode ? `CEP ${formatCep(a.postalCode)}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function AddressForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: AddressInput;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (data: AddressInput) => void;
}) {
  const [form, setForm] = useState<AddressInput>(initial);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (patch: Partial<AddressInput>) => setForm((f) => ({ ...f, ...patch }));

  const handleCepBlur = async () => {
    if (normalizeCep(form.postalCode).length !== 8) return;
    setCepLoading(true);
    const found = await lookupCep(form.postalCode);
    setCepLoading(false);
    if (found) {
      set({
        street: found.street || form.street,
        district: found.district || form.district,
        city: found.city || form.city,
        state: found.state || form.state,
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (normalizeCep(form.postalCode).length !== 8) {
      toast.error("Informe um CEP válido.");
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-5 md:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Identificação</label>
          <Input value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="Casa, Trabalho..." />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Destinatário</label>
          <Input value={form.recipient} onChange={(e) => set({ recipient: e.target.value })} placeholder="Quem recebe" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-2">
          <label className="text-sm font-medium">CEP</label>
          <div className="relative">
            <Input
              value={formatCep(form.postalCode)}
              onChange={(e) => set({ postalCode: e.target.value })}
              onBlur={handleCepBlur}
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
              required
            />
            {cepLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Rua / Logradouro</label>
          <Input value={form.street} onChange={(e) => set({ street: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Número</label>
          <Input value={form.number} onChange={(e) => set({ number: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Complemento</label>
          <Input value={form.complement} onChange={(e) => set({ complement: e.target.value })} placeholder="Apto, bloco..." />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Bairro</label>
          <Input value={form.district} onChange={(e) => set({ district: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_6rem]">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cidade</label>
          <Input value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">UF</label>
          <Input value={form.state} onChange={(e) => set({ state: e.target.value.toUpperCase() })} maxLength={2} />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set({ isDefault: e.target.checked })}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        Usar como endereço padrão
      </label>

      <div className="flex gap-3 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar endereço"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

function AddressesTab() {
  const { data: addresses, isLoading } = useAddresses(true);
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

  const [mode, setMode] = useState<"list" | "new" | { edit: Address }>("list");

  const handleCreate = (data: AddressInput) => {
    createAddress.mutate(data, {
      onSuccess: () => {
        toast.success("Endereço adicionado");
        setMode("list");
      },
      onError: () => toast.error("Não foi possível salvar o endereço."),
    });
  };

  const handleUpdate = (id: string, data: AddressInput) => {
    updateAddress.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Endereço atualizado");
          setMode("list");
        },
        onError: () => toast.error("Não foi possível salvar o endereço."),
      },
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover este endereço?")) return;
    deleteAddress.mutate(id, {
      onSuccess: () => toast.success("Endereço removido"),
      onError: () => toast.error("Não foi possível remover."),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Meus Endereços</h2>
        {mode === "list" && (
          <Button size="sm" onClick={() => setMode("new")}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo endereço
          </Button>
        )}
      </div>

      {mode === "new" && (
        <AddressForm
          key="new"
          initial={EMPTY_ADDRESS}
          saving={createAddress.isPending}
          onCancel={() => setMode("list")}
          onSubmit={handleCreate}
        />
      )}

      {typeof mode === "object" && "edit" in mode && (
        <AddressForm
          key={mode.edit.id}
          initial={{
            label: mode.edit.label,
            recipient: mode.edit.recipient,
            postalCode: mode.edit.postalCode,
            street: mode.edit.street,
            number: mode.edit.number,
            complement: mode.edit.complement ?? "",
            district: mode.edit.district,
            city: mode.edit.city,
            state: mode.edit.state,
            isDefault: mode.edit.isDefault,
          }}
          saving={updateAddress.isPending}
          onCancel={() => setMode("list")}
          onSubmit={(data) => handleUpdate(mode.edit.id, data)}
        />
      )}

      {mode === "list" && (
        isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-28 rounded-lg bg-secondary" />)}
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Você ainda não salvou nenhum endereço.
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((a) => (
              <div key={a.id} className="rounded-lg border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.label}</span>
                      {a.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Star className="h-3 w-3 fill-current" /> Padrão
                        </span>
                      )}
                    </div>
                    {a.recipient && <div className="mt-1 text-sm text-muted-foreground">{a.recipient}</div>}
                    <div className="mt-1 text-sm text-muted-foreground">{formatAddressLine(a)}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMode({ edit: a })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {!a.isDefault && (
                  <button
                    onClick={() =>
                      setDefault.mutate(a.id, {
                        onSuccess: () => toast.success("Endereço padrão atualizado"),
                        onError: () => toast.error("Não foi possível atualizar."),
                      })
                    }
                    className="mt-3 text-xs font-medium text-primary hover:underline"
                  >
                    Tornar padrão
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

type Tab = "orders" | "profile" | "addresses";

export default function Account() {
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: profile, isLoading: profileLoading } = useProfile(!!user);
  const { data: orders, isLoading: ordersLoading } = useMyOrders(!!user);

  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "profile" || initialTab === "addresses" ? initialTab : "orders",
  );
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
    setEmail(profile.email ?? user?.email ?? "");
    setPhone(profile.phone ?? "");
    setPostalCode(profile.postalCode ?? "");
    setCity(profile.city ?? "");
    setState(profile.state ?? "");
  }

  const handleSaveProfile = () => {
    updateProfile.mutate(
      { name, email, phone, postalCode, city, state },
      {
        onSuccess: () => {
          toast.success("Perfil atualizado com sucesso!");
          setIsEditing(false);
        },
        onError: () => toast.error("Não foi possível salvar."),
      },
    );
  };

  if (authLoading) {
    return <div className="container mx-auto px-4 py-24 text-center animate-pulse">Carregando...</div>;
  }

  if (!user) {
    return <Redirect to="/entrar?next=/conta" replace />;
  }

  if (profileLoading) {
    return <div className="container mx-auto px-4 py-24 text-center animate-pulse">Carregando...</div>;
  }

  const tabBtn = (tab: Tab, icon: ReactNode, label: string) => (
    <button
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors md:flex-none md:justify-start md:px-4 md:py-3 ${
        activeTab === tab
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-secondary/50"
      }`}
      onClick={() => setActiveTab(tab)}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="container mx-auto px-4 py-6 sm:py-12">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight sm:mb-8 sm:text-3xl">Minha Conta</h1>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4 md:gap-8">
        <div className="md:col-span-1">
          <div className="flex gap-2 rounded-lg border bg-card p-2 md:flex-col md:p-4">
            {tabBtn("orders", <Package className="h-5 w-5 shrink-0" />, "Pedidos")}
            {tabBtn("profile", <User className="h-5 w-5 shrink-0" />, "Dados")}
            {tabBtn("addresses", <MapPin className="h-5 w-5 shrink-0" />, "Endereços")}
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
                <MapPin className="h-4 w-4" /> Endereço principal
              </h3>
              <p className="-mt-4 text-xs text-muted-foreground">
                Endereço rápido para o checkout. Cadastre outros na aba <strong>Endereços</strong>.
              </p>

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

          {activeTab === 'addresses' && <AddressesTab />}
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
