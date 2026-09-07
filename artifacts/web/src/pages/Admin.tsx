import React, { useMemo, useState } from "react";
import { Redirect } from "wouter";
import {
  useAdminOrders,
  useCreateProduct,
  useDashboardSummary,
  useDeleteProduct,
  useGrantRole,
  useProducts,
  useRevokeRole,
  useTeam,
  useUpdateProduct,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Product, ProductInput, Role } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  TrendingUp,
  TrendingDown,
  Box,
  AlertTriangle,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  CreditCard,
  PackageSearch,
  Check,
  Lock,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CATEGORIES = [
  "Laptops",
  "Tablets",
  "Smartphones",
  "Câmeras",
  "Áudio",
  "Monitores",
  "Gaming",
  "Wearables",
  "Periféricos",
  "Acessórios",
];

type Admin = { name: string; email: string | null; isAdmin: boolean };

export default function Admin() {
  const { user, isLoading, isStaff, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background jurb-grid">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted-foreground font-mono text-sm animate-pulse">
          Carregando painel...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/entrar?next=/admin" replace />;
  }

  if (!isStaff) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta área é da equipe da loja. Se você deveria ter acesso, peça a um
          administrador para liberar seu e-mail.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <a href="/">Voltar para a loja</a>
        </Button>
      </div>
    );
  }

  return (
    <AdminDashboard
      admin={{ name: user.name, email: user.email, isAdmin }}
    />
  );
}

function AdminDashboard({ admin }: { admin: Admin }) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "products" | "orders" | "team"
  >("dashboard");

  const handleLogout = async () => {
    await signOut();
    toast.info("Sessão encerrada");
    window.location.href = "/";
  };

  const NavItem = ({
    icon: Icon,
    label,
    active,
    onClick,
    disabled = false,
  }: {
    icon: typeof LayoutDashboard;
    label: string;
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : active
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {disabled && <Lock className="h-3 w-3 ml-auto opacity-50" />}
    </button>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="w-64 border-r bg-card flex-col z-20 hidden md:flex">
        <div className="p-6 border-b border-border/50">
          <h2 className="font-display font-black text-2xl tracking-tight text-foreground flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Box className="h-5 w-5" />
            </div>
            UR3
          </h2>
          <div className="flex items-center gap-2 mt-3 text-xs font-mono text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Painel operacional
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <NavItem icon={LayoutDashboard} label="Visão Geral" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavItem icon={Package} label="Catálogo" active={activeTab === "products"} onClick={() => setActiveTab("products")} />
          <NavItem icon={ShoppingCart} label="Pedidos" active={activeTab === "orders"} onClick={() => setActiveTab("orders")} />
          <div className="pt-4 pb-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Administração
            </div>
          </div>
          <NavItem icon={Users} label="Equipe" active={activeTab === "team"} onClick={() => setActiveTab("team")} disabled={!admin.isAdmin} />
        </nav>

        <div className="p-4 border-t border-border/50 bg-secondary/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg border border-primary/30 shrink-0">
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-foreground leading-tight">{admin.name}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider mt-0.5 flex items-center gap-1">
                {admin.isAdmin ? <ShieldCheck className="h-3 w-3 text-primary" /> : <UserIcon className="h-3 w-3" />}
                {admin.isAdmin ? "administrador" : "operador"}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full text-xs font-medium hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5 mr-2" /> Encerrar Sessão
          </Button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50 flex justify-around p-2">
        <button onClick={() => setActiveTab("dashboard")} className={`p-3 rounded-lg ${activeTab === "dashboard" ? "bg-primary/10 text-primary" : ""}`}><LayoutDashboard className="h-5 w-5" /></button>
        <button onClick={() => setActiveTab("products")} className={`p-3 rounded-lg ${activeTab === "products" ? "bg-primary/10 text-primary" : ""}`}><Package className="h-5 w-5" /></button>
        <button onClick={() => setActiveTab("orders")} className={`p-3 rounded-lg ${activeTab === "orders" ? "bg-primary/10 text-primary" : ""}`}><ShoppingCart className="h-5 w-5" /></button>
        {admin.isAdmin && <button onClick={() => setActiveTab("team")} className={`p-3 rounded-lg ${activeTab === "team" ? "bg-primary/10 text-primary" : ""}`}><Users className="h-5 w-5" /></button>}
        <button onClick={handleLogout} className="p-3 text-muted-foreground"><LogOut className="h-5 w-5" /></button>
      </div>

      <main className="flex-1 overflow-y-auto relative bg-background pb-20 md:pb-0">
        <div className="noise-bg absolute inset-0 pointer-events-none" />
        <div className="relative z-10 p-4 md:p-8 lg:p-10 min-h-full max-w-7xl mx-auto">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "products" && <ProductsTab isAdmin={admin.isAdmin} />}
          {activeTab === "orders" && <OrdersTab />}
          {activeTab === "team" && admin.isAdmin && <TeamTab />}
        </div>
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: summary, isLoading } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-10 bg-secondary rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-secondary rounded-xl" />)}
        </div>
        <div className="h-[400px] bg-secondary rounded-xl" />
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">Acompanhamento de vendas e métricas da loja.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(summary.revenue)}</div>
            <div className="flex items-center mt-1 space-x-1">
              {summary.revenueChange >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
              <p className="text-xs font-medium text-muted-foreground">acumulado</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
            <PackageSearch className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.orders}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.customers} clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Crítico</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.lowStock > 0 ? "text-destructive" : "text-primary"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos precisando de reposição</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em Estoque</CardTitle>
            <Box className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.inventoryUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">Unidades físicas armazenadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="border-b border-border/30 pb-4 mb-4">
            <CardTitle className="text-lg">Vendas nos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.salesByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} dy={10} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--secondary))", opacity: 0.3 }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/30 pb-4 mb-4">
            <CardTitle className="text-lg">Produtos Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden pr-2">
                    <div className="w-8 h-8 rounded bg-secondary/60 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</div>
                    <div className="truncate">
                      <p className="text-sm font-medium truncate text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.sales} un. vendidas</p>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-medium text-foreground shrink-0">{formatCurrency(p.revenue)}</div>
                </div>
              ))}
              {summary.topProducts.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">Nenhum dado disponível</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                <tr>
                  <th className="px-6 py-3 font-medium">Pedido</th>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {summary.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-primary">#{o.id.toString().padStart(4, "0")}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{o.customerName}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground border border-border/50">{o.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-foreground">{formatCurrency(o.total)}</td>
                  </tr>
                ))}
                {summary.recentOrders.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhum pedido recente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower),
    );
  }, [products, searchTerm]);

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setDescription(product.description);
      setCategory(product.category);
      setPrice(product.price.toString());
      setComparePrice(product.compareAtPrice?.toString() || "");
      setStock(product.stock.toString());
      setImageUrl(product.imageUrl);
      setFeatured(product.featured);
    } else {
      setEditingProduct(null);
      setName("");
      setDescription("");
      setCategory(CATEGORIES[0]);
      setPrice("");
      setComparePrice("");
      setStock("");
      setImageUrl("");
      setFeatured(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ProductInput = {
      name,
      description,
      category,
      price: Number(price),
      compareAtPrice: comparePrice ? Number(comparePrice) : null,
      stock: Number(stock),
      imageUrl,
      featured,
    };

    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, data },
        {
          onSuccess: () => {
            toast.success("Produto atualizado");
            closeModal();
          },
          onError: () => toast.error("Falha ao atualizar produto"),
        },
      );
    } else {
      createProduct.mutate(data, {
        onSuccess: () => {
          toast.success("Produto criado");
          closeModal();
        },
        onError: () => toast.error("Falha ao criar produto"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Excluir este produto? A ação não pode ser desfeita.")) {
      deleteProduct.mutate(id, {
        onSuccess: () => toast.success("Produto excluído"),
        onError: () => toast.error("Falha ao excluir produto"),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Catálogo</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os produtos, preços e estoque.</p>
        </div>
        <Button onClick={() => openModal()} className="jurb-cta shadow-md">
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
          />
        </div>
      </div>

      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4">Estoque</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Carregando catálogo...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md border border-border/50 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} className="w-full h-full object-contain p-1 mix-blend-multiply" alt="" />
                          ) : (
                            <Box className="h-5 w-5 text-muted/50" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground line-clamp-1">{product.name}</div>
                          {product.featured && <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Destaque</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{product.category}</td>
                    <td className="px-6 py-4 font-mono font-medium text-foreground">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.stock <= 5 ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary text-foreground border border-border/50"}`}>
                        {product.stock} un.
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-foreground hover:text-primary hover:border-primary/50" onClick={() => openModal(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border/50 shrink-0">
              <h2 className="text-xl font-display font-bold text-foreground">{editingProduct ? "Editar Produto" : "Novo Produto"}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 p-2 rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <form id="product-form" onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Nome do Produto</label>
                  <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Notebook Gamer RTX 4060" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Descrição</label>
                  <textarea required className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Especificações detalhadas..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Categoria</label>
                    <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Estoque (un.)</label>
                    <Input required type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Preço de Venda (R$)</label>
                    <Input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Preço Comparação <span className="text-muted-foreground font-normal">(Opcional)</span></label>
                    <Input type="number" min="0" step="0.01" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="Preço riscado" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">URL da Imagem</label>
                  <Input required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/images/produto.jpg" />
                </div>
                <label className="flex items-center gap-4 p-4 border border-border/60 rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-5 w-5 rounded-md border-input bg-background text-primary focus:ring-primary" />
                  <div>
                    <div className="font-semibold text-sm text-foreground">Destacar na Página Inicial</div>
                    <div className="text-xs text-muted-foreground mt-0.5">O produto aparece na seção principal da loja</div>
                  </div>
                </label>
              </form>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border/50 shrink-0 bg-secondary/10">
              <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
              <Button type="submit" form="product-form" className="jurb-cta" disabled={createProduct.isPending || updateProduct.isPending}>
                {editingProduct ? "Salvar Alterações" : "Criar Produto"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const { data: orders, isLoading } = useAdminOrders();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchTerm) return orders;
    const lower = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(lower) ||
        o.customerEmail.toLowerCase().includes(lower) ||
        o.id.toString().includes(lower),
    );
  }, [orders, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Pedidos</h2>
        <p className="text-sm text-muted-foreground mt-1">Acompanhamento de todas as vendas.</p>
      </div>

      <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, e-mail ou número do pedido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10" />
        </div>
      </div>

      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border/50">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Carregando pedidos...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Nenhum pedido encontrado.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-primary">#{order.id.toString().padStart(4, "0")}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground border border-border/50">{order.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-foreground">{formatCurrency(order.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeamTab() {
  const { user } = useAuth();
  const { data: team, isLoading } = useTeam();
  const grant = useGrantRole();
  const revoke = useRevokeRole();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operator");

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    grant.mutate(
      { email, role },
      {
        onSuccess: () => {
          toast.success("Acesso concedido");
          setEmail("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao conceder acesso"),
      },
    );
  };

  const handleRevoke = (userId: string, r: Role) => {
    if (userId === user?.id && r === "admin") {
      toast.error("Você não pode remover o próprio acesso de administrador");
      return;
    }
    revoke.mutate(
      { userId, role: r },
      {
        onSuccess: () => toast.success("Acesso removido"),
        onError: () => toast.error("Falha ao remover acesso"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Equipe</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conceda acesso ao painel para pessoas que já criaram uma conta na loja.
        </p>
      </div>

      <form onSubmit={handleGrant} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-semibold text-foreground">E-mail da pessoa</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Papel</label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-52" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="operator">Operador (catálogo e pedidos)</option>
            <option value="admin">Administrador (acesso total)</option>
          </select>
        </div>
        <Button type="submit" className="jurb-cta" disabled={grant.isPending}>
          <Plus className="h-4 w-4 mr-2" /> Conceder
        </Button>
      </form>

      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Pessoa</th>
                <th className="px-6 py-4">Papéis</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">Carregando equipe...</td></tr>
              ) : !team || team.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">Ninguém com acesso ainda.</td></tr>
              ) : (
                team.map((m) => (
                  <tr key={m.userId} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/30">
                          {(m.name || m.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {m.name || "—"}
                            {m.userId === user?.id && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase">Você</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {m.roles.map((r) => (
                          <span key={r} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-xs font-medium">
                            {r === "admin" ? <ShieldCheck className="h-3 w-3 text-primary" /> : <UserIcon className="h-3 w-3" />}
                            {r === "admin" ? "Administrador" : "Operador"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.roles.map((r) => (
                          <Button key={r} variant="outline" size="sm" className="h-8 text-xs text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" onClick={() => handleRevoke(m.userId, r)}>
                            Remover {r === "admin" ? "admin" : "operador"}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
