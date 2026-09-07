// Tipos de domínio — espelham as tabelas de supabase/migrations/0001_init.sql.
// (Substituem o antigo pacote @workspace/api-zod.)

/** Par de especificação técnica ({ label: "Tela", value: "6,7\" AMOLED 120Hz" }). */
export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
  featured: boolean;
  specs: ProductSpec[];
  viewCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
};

export type ProductInput = {
  name: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
  featured: boolean;
  specs: ProductSpec[];
};

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
};

/** Endereço salvo do cliente (tabela public.addresses). */
export type Address = {
  id: string;
  label: string;
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
  createdAt: string;
};

export type AddressInput = {
  label: string;
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
};

export type Role = "admin" | "operator";

/** Estados possíveis de um pedido — espelham o CHECK em orders.status. */
export const ORDER_STATUSES = [
  "Pedido confirmado",
  "Em separação",
  "Enviado",
  "Entregue",
  "Cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ShippingOption = {
  id: string;
  carrier: string;
  service: string;
  price: number;
  deliveryDays: number;
  description: string;
};

export type OrderItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Order = {
  id: number;
  customerName: string;
  customerEmail: string;
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  shippingOption: ShippingOption;
  items: OrderItem[];
  createdAt: string;
};

export type DashboardSummary = {
  revenue: number;
  revenueChange: number;
  orders: number;
  ordersChange: number;
  customers: number;
  products: number;
  inventoryUnits: number;
  lowStock: number;
  salesByDay: { label: string; value: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  mostViewed: { id: number; name: string; views: number; imageUrl: string }[];
  recentOrders: {
    id: number;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
};

// Linhas cruas do Postgres (snake_case) — usadas nos mapeadores de lib/api.ts.
export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string;
  featured: boolean;
  specs: ProductSpec[];
  view_count: number;
  rating: number;
  review_count: number;
  created_at: string;
};
