import React, { useState, useMemo, useEffect } from "react";
import { 
  useGetDashboardSummary, 
  useListProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  getListProductsQueryKey,
  getGetDashboardSummaryQueryKey,
  useGetAdminSession,
  getGetAdminSessionQueryKey,
  useAdminLogin,
   useAdminSetup,
  useAdminLogout,
   useGetAdminSetupStatus,
  useListAdminOrders,
  useListAdminUsers,
  getListAdminUsersQueryKey,
  useCreateAdminUser,
  useUpdateAdminUser
} from "@workspace/api-client-react";
import type { Product, Order, AdminUser, AdminUserInput, AdminUserUpdate, AdminRole } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Eye,
  Lock,
  Mail,
  User as UserIcon,
  ShieldAlert,
  ShieldCheck,
  Ban
} from "lucide-react";
import { toast } from "sonner";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// --- MAIN COMPONENT ---
export default function Admin() {
  const { data: sessionData, isLoading: sessionLoading } = useGetAdminSession({
    query: { queryKey: getGetAdminSessionQueryKey(), retry: false },
  });
  const { data: setupStatus } = useGetAdminSetupStatus();
  
  if (sessionLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background jurb-grid">
         <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
         <p className="mt-4 text-muted-foreground font-mono text-sm animate-pulse">Carregando painel administrativo...</p>
      </div>
    );
  }

  const user = sessionData?.user;

  if (!user) {
    return <AdminLogin needsSetup={setupStatus?.needsSetup ?? false} />;
  }

  return <AdminDashboard user={user} />;
}

// --- LOGIN COMPONENT ---
function AdminLogin({ needsSetup }: { needsSetup: boolean }) {
  const login = useAdminLogin();
  const setup = useAdminSetup();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const settingUp = mode === "setup";

  const refreshSession = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
    queryClient.invalidateQueries();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { email, password } }, {
      onSuccess: () => {
        refreshSession();
        toast.success("Acesso autorizado", { description: "Bem-vindo ao painel de controle." });
      },
      onError: () => {
        toast.error("Não foi possível entrar", { description: "Confira as credenciais ou aguarde antes de tentar novamente." });
      },
    });
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setup.mutate(
      { data: { name, email, password, setupSecret } },
      {
        onSuccess: () => {
          refreshSession();
          toast.success("Administrador configurado", { description: "O painel está pronto para uso." });
        },
        onError: () => {
          toast.error("Não foi possível concluir a configuração", {
            description: "Confira a chave de inicialização e os dados informados.",
          });
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background jurb-grid relative px-4">
      <div className="jurb-scanline absolute inset-0 pointer-events-none opacity-20"></div>
      <Card className="w-full max-w-md z-10 border-primary/20 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        <CardHeader className="space-y-2 text-center pt-10">
          <div className="mx-auto w-14 h-14 bg-primary/10 flex items-center justify-center rounded-xl mb-4 border border-primary/20">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-3xl font-display font-bold tracking-tight">Nexa Admin</CardTitle>
          <CardDescription>{settingUp ? "Configure o primeiro administrador" : "Painel de Controle Operacional"}</CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form onSubmit={settingUp ? handleSetup : handleLogin} className="space-y-5">
            {settingUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome do administrador</label>
                <Input required minLength={2} autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">E-mail corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-background"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha de acesso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  minLength={settingUp ? 12 : 8}
                  autoComplete={settingUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-background"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {settingUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Chave de inicialização</label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="off"
                  value={setupSecret}
                  onChange={e => setSetupSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Solicite a chave ao administrador do ambiente. Ela não é exibida nesta tela.</p>
              </div>
            )}
            <Button type="submit" className="w-full h-11 jurb-cta mt-4 text-base font-medium" disabled={login.isPending || setup.isPending}>
              {settingUp ? (setup.isPending ? "Configurando acesso..." : "Configurar Administrador") : (login.isPending ? "Verificando credenciais..." : "Entrar no Sistema")}
            </Button>
          </form>
          <div className="mt-8 text-xs text-muted-foreground bg-secondary/30 border border-border/50 p-4 rounded-lg text-center">
            <p className="font-medium text-foreground mb-1 flex items-center justify-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Acesso protegido
            </p>
            <p>As tentativas são limitadas e a sessão é mantida somente em cookie seguro.</p>
            {needsSetup && !settingUp && (
              <Button type="button" variant="link" className="mt-2 h-auto p-0 text-xs text-primary" onClick={() => setMode("setup")}>
                Configurar o primeiro administrador
              </Button>
            )}
            {settingUp && (
              <Button type="button" variant="link" className="mt-2 h-auto p-0 text-xs text-primary" onClick={() => setMode("login")}>
                Voltar para o login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- DASHBOARD LAYOUT ---
function AdminDashboard({ user }: { user: AdminUser }) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "orders" | "team">("dashboard");
  const logout = useAdminLogout();
  const queryClient = useQueryClient();
  const isAdmin = user.role === "admin";

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
         queryClient.setQueryData(getGetAdminSessionQueryKey(), null);
         toast.info("Sessão encerrada com sucesso");
      }
    });
  }

  const NavItem = ({ icon: Icon, label, active, onClick, disabled = false }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' :
        active 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {disabled && <Lock className="h-3 w-3 ml-auto opacity-50" />}
    </button>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="w-64 border-r bg-card flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] hidden md:flex">
         <div className="p-6 border-b border-border/50">
           <h2 className="font-display font-black text-2xl tracking-tight text-foreground flex items-center gap-2">
             <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
               <Box className="h-5 w-5" />
             </div>
             NEXA
           </h2>
           <div className="flex items-center gap-2 mt-3 text-xs font-mono text-muted-foreground">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             Sistema Operacional
           </div>
         </div>
         
         <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
           <NavItem icon={LayoutDashboard} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
           <NavItem icon={Package} label="Catálogo" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
           <NavItem icon={ShoppingCart} label="Pedidos" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
           <div className="pt-4 pb-2">
             <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">Administração</div>
           </div>
           <NavItem icon={Users} label="Equipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} disabled={!isAdmin} />
         </nav>
         
         <div className="p-4 border-t border-border/50 bg-secondary/10">
           <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg border border-primary/30 shrink-0">
               {user.name.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-semibold truncate text-foreground leading-tight">{user.name}</p>
               <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider mt-0.5 flex items-center gap-1">
                 {isAdmin ? <ShieldCheck className="h-3 w-3 text-primary" /> : <UserIcon className="h-3 w-3" />}
                 {user.role}
               </p>
             </div>
           </div>
           <Button variant="outline" className="w-full text-xs font-medium hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors" onClick={handleLogout} disabled={logout.isPending}>
             <LogOut className="h-3.5 w-3.5 mr-2" /> Encerrar Sessão
           </Button>
         </div>
      </aside>
      
      {/* Mobile Nav - very simple top bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50 flex justify-around p-2">
        <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-lg ${activeTab==='dashboard'?'bg-primary/10 text-primary':''}`}><LayoutDashboard className="h-5 w-5"/></button>
        <button onClick={() => setActiveTab('products')} className={`p-3 rounded-lg ${activeTab==='products'?'bg-primary/10 text-primary':''}`}><Package className="h-5 w-5"/></button>
        <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-lg ${activeTab==='orders'?'bg-primary/10 text-primary':''}`}><ShoppingCart className="h-5 w-5"/></button>
        {isAdmin && <button onClick={() => setActiveTab('team')} className={`p-3 rounded-lg ${activeTab==='team'?'bg-primary/10 text-primary':''}`}><Users className="h-5 w-5"/></button>}
        <button onClick={handleLogout} className="p-3 text-muted-foreground"><LogOut className="h-5 w-5"/></button>
      </div>

      <main className="flex-1 overflow-y-auto relative bg-background pb-20 md:pb-0">
         <div className="noise-bg absolute inset-0 pointer-events-none"></div>
         <div className="relative z-10 p-4 md:p-8 lg:p-10 min-h-full max-w-7xl mx-auto">
           {activeTab === 'dashboard' && <DashboardTab />}
           {activeTab === 'products' && <ProductsTab user={user} />}
           {activeTab === 'orders' && <OrdersTab />}
           {activeTab === 'team' && isAdmin && <TeamTab user={user} />}
         </div>
      </main>
    </div>
  );
}

// --- TABS ---

function DashboardTab() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-10 bg-secondary rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-secondary rounded-xl"></div>)}
        </div>
        <div className="h-[400px] bg-secondary rounded-xl"></div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">Acompanhamento de vendas e métricas da loja.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(summary.revenue)}</div>
            <div className="flex items-center mt-1 space-x-1">
              {summary.revenueChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <p className={`text-xs font-medium ${summary.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {summary.revenueChange > 0 ? '+' : ''}{summary.revenueChange}% <span className="text-muted-foreground font-normal">vs. mês anterior</span>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
            <PackageSearch className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.orders}</div>
            <div className="flex items-center mt-1 space-x-1">
              {summary.ordersChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <p className={`text-xs font-medium ${summary.ordersChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {summary.ordersChange > 0 ? '+' : ''}{summary.ordersChange}% <span className="text-muted-foreground font-normal">vs. mês anterior</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Crítico</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.lowStock > 0 ? 'text-destructive' : 'text-primary'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos precisando de reposição</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
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
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v/1000}k`} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--secondary))', opacity: 0.3}} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
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
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden pr-2">
                    <div className="w-8 h-8 rounded bg-secondary/60 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {i + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.sales} un. vendidas</p>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-medium text-foreground shrink-0">
                    {formatCurrency(p.revenue)}
                  </div>
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
                    <td className="px-6 py-4 font-mono font-medium text-primary">#{o.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{o.customerName}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground border border-border/50">
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-foreground">{formatCurrency(o.total)}</td>
                  </tr>
                ))}
                {summary.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhum pedido recente encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsTab({ user }: { user: AdminUser }) {
  const { data: products, isLoading } = useListProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  
  const isAdmin = user.role === "admin";
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Laptops");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower));
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
      setCategory("Laptops");
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
    const data = {
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
      updateProduct.mutate({ id: editingProduct.id, data }, {
        onSuccess: () => {
          toast.success("Produto atualizado com sucesso");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          closeModal();
        },
        onError: () => toast.error("Falha ao atualizar produto")
      });
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => {
          toast.success("Produto criado com sucesso");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          closeModal();
        },
        onError: () => toast.error("Falha ao criar produto")
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("ATENÇÃO: Deseja realmente excluir este produto? A ação não pode ser desfeita.")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          toast.success("Produto excluído permanentemente");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
        onError: () => toast.error("Falha ao excluir produto")
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            onChange={e => setSearchTerm(e.target.value)}
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
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md border border-border/50 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} className="w-full h-full object-contain p-1 mix-blend-multiply" alt=""/>
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
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.stock <= 5 ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary text-foreground border border-border/50'}`}>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border/50 shrink-0">
              <h2 className="text-xl font-display font-bold text-foreground">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 p-2 rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              <form id="product-form" onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Nome do Produto</label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Notebook Gamer RTX 4060" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Descrição</label>
                  <textarea 
                    required
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary resize-y"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descreva as especificações detalhadas..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Categoria</label>
                    <select 
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      <option value="Laptops">Laptops</option>
                      <option value="Smartphones">Smartphones</option>
                      <option value="Audio">Audio</option>
                      <option value="Monitores">Monitores</option>
                      <option value="Acessórios">Acessórios</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Estoque Inicial (un.)</label>
                    <Input required type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Preço de Venda (R$)</label>
                    <Input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Preço Comparação <span className="text-muted-foreground font-normal">(Opcional)</span></label>
                    <Input type="number" min="0" step="0.01" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="Preço riscado" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">URL da Imagem</label>
                  <Input required value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="/images/produto.jpg" />
                </div>

                <label className="flex items-center gap-4 p-4 border border-border/60 rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={featured} 
                      onChange={e => setFeatured(e.target.checked)} 
                      className="peer h-5 w-5 rounded-md border-input bg-background text-primary focus:ring-primary focus:ring-offset-background transition-all"
                    />
                    {featured && <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary-foreground pointer-events-none" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">Destacar na Página Inicial</div>
                    <div className="text-xs text-muted-foreground mt-0.5">O produto aparecerá na seção principal da loja</div>
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
  const { data: orders, isLoading } = useListAdminOrders();
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchTerm) return orders;
    const lower = searchTerm.toLowerCase();
    return orders.filter(o => 
      o.customerName.toLowerCase().includes(lower) || 
      o.customerEmail.toLowerCase().includes(lower) ||
      o.id.toString().includes(lower)
    );
  }, [orders, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Pedidos</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhamento e gestão de todas as vendas.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente, e-mail ou número do pedido..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
          />
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
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-primary">#{order.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground border border-border/50">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-foreground">
                      {formatCurrency(order.total)}
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

function TeamTab({ user }: { user: AdminUser }) {
  const { data: users, isLoading } = useListAdminUsers();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("operator");
  const [active, setActive] = useState(true);

  const openModal = (targetUser?: AdminUser) => {
    if (targetUser) {
      setEditingUser(targetUser);
      setName(targetUser.name);
      setEmail(targetUser.email);
      setPassword(""); 
      setRole(targetUser.role);
      setActive(targetUser.active);
    } else {
      setEditingUser(null);
      setName("");
      setEmail("");
      setPassword("");
      setRole("operator");
      setActive(true);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const data: AdminUserUpdate = { name, email, role, active };
      if (password) data.password = password;
      
      updateUser.mutate({ id: editingUser.id, data }, {
        onSuccess: () => {
          toast.success("Usuário atualizado com sucesso");
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
          closeModal();
        },
        onError: () => toast.error("Falha ao atualizar usuário")
      });
    } else {
      createUser.mutate({ data: { name, email, password, role } }, {
        onSuccess: () => {
          toast.success("Usuário criado com sucesso");
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
          closeModal();
        },
        onError: () => toast.error("Falha ao criar usuário. Verifique os dados.")
      });
    }
  };

  const toggleStatus = (targetUser: AdminUser) => {
    if (targetUser.id === user.id) {
      toast.error("Você não pode desativar sua própria conta");
      return;
    }
    updateUser.mutate({ id: targetUser.id, data: { active: !targetUser.active } }, {
      onSuccess: () => {
        toast.success(`Usuário ${!targetUser.active ? 'ativado' : 'desativado'} com sucesso`);
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      },
      onError: () => toast.error("Falha ao alterar status do usuário")
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Equipe</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os acessos ao painel administrativo.</p>
        </div>
        <Button onClick={() => openModal()} className="jurb-cta shadow-md">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Integrante
        </Button>
      </div>

      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Papel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Login</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Carregando equipe...</td></tr>
              ) : users?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Nenhum integrante encontrado.</td></tr>
              ) : (
                users?.map(u => (
                  <tr key={u.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${u.active ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {u.name} {u.id === user.id && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase">Você</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border border-border/60 px-2 py-1 rounded bg-background">
                        {u.role === 'admin' ? 'Administrador' : 'Operador'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${u.active ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                        {u.active ? <ShieldCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : 'Nunca acessou'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-foreground hover:text-primary hover:border-primary/50" onClick={() => openModal(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className={`h-8 w-8 ${u.active ? 'text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive' : 'text-foreground hover:bg-green-600 hover:text-white hover:border-green-600'}`} 
                          onClick={() => toggleStatus(u)}
                          disabled={u.id === user.id}
                        >
                          {u.active ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border/50 shrink-0">
              <h2 className="text-xl font-display font-bold text-foreground">
                {editingUser ? "Editar Integrante" : "Novo Integrante"}
              </h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 p-2 rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6">
              <form id="team-form" onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Nome Completo</label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">E-mail Corporativo</label>
                  <Input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@nexa.local" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Senha {editingUser && <span className="text-muted-foreground font-normal">(Deixe em branco para manter)</span>}
                  </label>
                  <Input type="password" autoComplete="new-password" required={!editingUser} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Papel de Acesso</label>
                  <select 
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                    value={role}
                    onChange={e => setRole(e.target.value as AdminRole)}
                    disabled={editingUser?.id === user.id}
                  >
                    <option value="operator">Operador (Catálogo e Pedidos)</option>
                    <option value="admin">Administrador (Acesso Total)</option>
                  </select>
                </div>
                
                {editingUser && editingUser.id !== user.id && (
                  <label className="flex items-center gap-4 p-4 mt-2 border border-border/60 rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={active} 
                        onChange={e => setActive(e.target.checked)} 
                        className="peer h-5 w-5 rounded-md border-input bg-background text-primary focus:ring-primary focus:ring-offset-background transition-all"
                      />
                      {active && <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary-foreground pointer-events-none" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">Conta Ativa</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Permite o acesso deste usuário ao painel</div>
                    </div>
                  </label>
                )}
              </form>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-border/50 shrink-0 bg-secondary/10 rounded-b-xl">
              <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
              <Button type="submit" form="team-form" className="jurb-cta" disabled={createUser.isPending || updateUser.isPending}>
                {editingUser ? "Salvar Alterações" : "Criar Integrante"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
