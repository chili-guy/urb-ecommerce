import { useState } from "react";
import { 
  useGetDashboardSummary, 
  useListProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  getListProductsQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { formatCurrency, generateSlug } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  Users, 
  CreditCard, 
  PackageSearch, 
  Plus, 
  Pencil, 
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@workspace/api-client-react";

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: products, isLoading: loadingProducts } = useListProducts();
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [activeTab, setActiveTab] = useState<"dashboard" | "products">("dashboard");
  
  // Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Laptops");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("/images/smartphone.jpg");
  const [featured, setFeatured] = useState(false);

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
      setImageUrl("/images/keyboard.jpg");
      setFeatured(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
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
          toast.success("Produto atualizado");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          closeModal();
        }
      });
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => {
          toast.success("Produto criado");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          closeModal();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          toast.success("Produto excluído");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Painel Admin</h1>
        <div className="flex gap-2 bg-secondary/50 p-1 rounded-lg">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('products')}
          >
            Produtos
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {loadingSummary ? (
            <div className="animate-pulse space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-secondary rounded-lg"></div>)}
              </div>
            </div>
          ) : summary && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono">{formatCurrency(summary.revenue)}</div>
                    <p className={`text-xs mt-1 ${summary.revenueChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.revenueChange > 0 ? '+' : ''}{summary.revenueChange}% vs. último mês
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
                    <PackageSearch className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.orders}</div>
                    <p className={`text-xs mt-1 ${summary.ordersChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.ordersChange > 0 ? '+' : ''}{summary.ordersChange}% vs. último mês
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.customers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Produtos Ativos</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.products}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {summary.topProducts.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                          <span className="font-medium">{p.name}</span>
                          <div className="text-right">
                            <div className="font-mono text-primary">{formatCurrency(p.revenue)}</div>
                            <div className="text-muted-foreground text-xs">{p.sales} vendas</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pedidos Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {summary.recentOrders.map((o) => (
                        <div key={o.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                          <div>
                            <div className="font-medium">{o.customerName}</div>
                            <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-medium">{formatCurrency(o.total)}</div>
                            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-bold">Gestão de Catálogo</h2>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" /> Novo Produto
            </Button>
          </div>

          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Preço</th>
                    <th className="px-4 py-3">Estoque</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingProducts ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
                  ) : (
                    products?.map(product => (
                      <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded border bg-white overflow-hidden shrink-0">
                              <img src={product.imageUrl} className="w-full h-full object-contain p-1 mix-blend-multiply" alt=""/>
                            </div>
                            <div>
                              <div className="font-medium line-clamp-1">{product.name}</div>
                              {product.featured && <span className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded font-medium">Destaque</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                        <td className="px-4 py-3 font-mono font-medium">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-3">{product.stock} un.</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openModal(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(product.id)}>
                              <Trash2 className="h-4 w-4" />
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
        </div>
      )}

      {/* Basic Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border shadow-xl rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-card z-10">
              <h2 className="text-xl font-display font-bold">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input required value={name} onChange={e => setName(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <textarea 
                  required
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoria</label>
                  <select 
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <label className="text-sm font-medium">Estoque</label>
                  <Input required type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preço (R$)</label>
                  <Input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preço Comparação (R$)</label>
                  <Input type="number" min="0" step="0.01" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">URL da Imagem</label>
                <Input required value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                <p className="text-xs text-muted-foreground">Ex: /images/smartphone.jpg</p>
              </div>

              <label className="flex items-center gap-3 p-4 border rounded-md cursor-pointer hover:bg-secondary/20">
                <input 
                  type="checkbox" 
                  checked={featured} 
                  onChange={e => setFeatured(e.target.checked)} 
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <div className="font-medium text-sm">Produto Destaque</div>
                  <div className="text-xs text-muted-foreground">Exibir na página inicial</div>
                </div>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {editingProduct ? "Salvar Alterações" : "Criar Produto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
