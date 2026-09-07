// Tipos de domínio — espelham as tabelas de supabase/migrations/0001_init.sql.
// (Substituem o antigo pacote @workspace/api-zod.)

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

export type Role = "admin" | "operator";

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
  rating: number;
  review_count: number;
  created_at: string;
};
