// Tipos de domínio — espelham as tabelas de supabase/migrations/0001_init.sql.
// (Substituem o antigo pacote @workspace/api-zod.)

/** Par de especificação técnica ({ label: "Tela", value: "6,7\" AMOLED 120Hz" }). */
export type ProductSpec = {
  label: string;
  value: string;
};

/** Condição do item — pedido do cliente pra sinalizar produtos usados/seminovos. */
export const PRODUCT_CONDITIONS = ["novo", "seminovo", "usado"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];
export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  usado: "Usado",
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory: string | null;
  sku: string | null;
  /** Produtos com o mesmo variantGroup são variações uns dos outros (ex: cores). */
  variantGroup: string | null;
  /** Rótulo desta variação dentro do grupo (ex: "Preto", "256GB"). */
  variantLabel: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
  /** Imagens adicionais da galeria (além de imageUrl). */
  images: string[];
  videoUrl: string | null;
  featured: boolean;
  condition: ProductCondition;
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
  subcategory: string;
  sku: string;
  variantGroup: string;
  variantLabel: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
  images: string[];
  videoUrl: string;
  featured: boolean;
  condition: ProductCondition;
  specs: ProductSpec[];
};

/** Avaliação de cliente (tabela public.product_reviews). */
export type Review = {
  id: number;
  productId: number;
  userId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ReviewInput = {
  productId: number;
  author: string;
  rating: number;
  comment: string;
};

/** Cupom de desconto (tabela public.coupons). */
export type Coupon = {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export type CouponInput = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxUses: number | null;
  expiresAt: string | null;
  active: boolean;
};

export type CouponPreview =
  | { valid: true; code: string; type: "percent" | "fixed"; value: number; discount: number }
  | { valid: false; reason: string };

/** Resumo de cliente para a aba Clientes do painel. */
export type CustomerSummary = {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
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
  discount: number;
  couponCode: string | null;
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
  visits7Days: number;
  visitsTotal: number;
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

/** Banner rotativo da home (tabela public.banners). */
export type Banner = {
  id: number;
  imageUrl: string;
  linkUrl: string | null;
  title: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

export type BannerInput = {
  imageUrl: string;
  linkUrl: string;
  title: string;
  sortOrder: number;
  active: boolean;
};

// Linhas cruas do Postgres (snake_case) — usadas nos mapeadores de lib/api.ts.
export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory: string | null;
  sku: string | null;
  variant_group: string | null;
  variant_label: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string;
  images: string[];
  video_url: string | null;
  featured: boolean;
  condition: string | null;
  specs: ProductSpec[];
  view_count: number;
  rating: number;
  review_count: number;
  created_at: string;
};
