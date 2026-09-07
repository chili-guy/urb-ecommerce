import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "./supabase";
import type {
  Address,
  AddressInput,
  DashboardSummary,
  Order,
  OrderStatus,
  Product,
  ProductInput,
  ProductSpec,
  Profile,
  Role,
  ShippingOption,
} from "./types";

// --------------------------------------------------------------- mapeadores ---
type Row = Record<string, unknown>;

function mapSpecs(value: unknown): ProductSpec[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => {
      const row = (s ?? {}) as Record<string, unknown>;
      return { label: String(row.label ?? ""), value: String(row.value ?? "") };
    })
    .filter((s) => s.label !== "" || s.value !== "");
}

function mapProduct(r: Row): Product {
  return {
    id: r.id as number,
    name: r.name as string,
    slug: r.slug as string,
    description: r.description as string,
    category: r.category as string,
    price: Number(r.price),
    compareAtPrice: r.compare_at_price == null ? null : Number(r.compare_at_price),
    stock: r.stock as number,
    imageUrl: r.image_url as string,
    featured: Boolean(r.featured),
    specs: mapSpecs(r.specs),
    viewCount: Number(r.view_count ?? 0),
    rating: Number(r.rating),
    reviewCount: r.review_count as number,
    createdAt: r.created_at as string,
  };
}

function mapOrder(r: Row): Order {
  const items = ((r.order_items as Row[]) ?? []).map((it) => ({
    productId: (it.product_id as number) ?? 0,
    productName: it.product_name as string,
    quantity: it.quantity as number,
    unitPrice: Number(it.unit_price),
    total: Number(it.total),
  }));
  return {
    id: r.id as number,
    customerName: r.customer_name as string,
    customerEmail: r.customer_email as string,
    status: r.status as string,
    subtotal: Number(r.subtotal),
    shipping: Number(r.shipping),
    total: Number(r.total),
    shippingOption: r.shipping_option as ShippingOption,
    items,
    createdAt: r.created_at as string,
  };
}

const ORDER_SELECT = "*, order_items(*)";

// ----------------------------------------------------------------- produtos ---
export type ProductQuery = {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
};

async function fetchProducts(params: ProductQuery): Promise<Product[]> {
  let q = supabase
    .from("products")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.featured !== undefined) q = q.eq("featured", params.featured);
  if (params.category) q = q.eq("category", params.category);
  if (params.search) {
    const term = params.search.replace(/[%,]/g, "");
    q = q.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (params.limit) q = q.limit(params.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export function useProducts(params: ProductQuery = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => fetchProducts(params),
  });
}

export function useProduct(id: number, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["product", id],
    enabled: opts.enabled ?? Number.isFinite(id),
    queryFn: async (): Promise<Product> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return mapProduct(data);
    },
  });
}

function toProductRow(data: Partial<ProductInput>) {
  const row: Row = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.description !== undefined) row.description = data.description;
  if (data.category !== undefined) row.category = data.category;
  if (data.price !== undefined) row.price = data.price;
  if (data.compareAtPrice !== undefined) row.compare_at_price = data.compareAtPrice;
  if (data.stock !== undefined) row.stock = data.stock;
  if (data.imageUrl !== undefined) row.image_url = data.imageUrl;
  if (data.featured !== undefined) row.featured = data.featured;
  if (data.specs !== undefined) {
    row.specs = data.specs
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label !== "" && s.value !== "");
  }
  return row;
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput): Promise<Product> => {
      const { data, error } = await supabase
        .from("products")
        .insert(toProductRow(input))
        .select("*")
        .single();
      if (error) throw error;
      return mapProduct(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<ProductInput>;
    }): Promise<Product> => {
      const { data: row, error } = await supabase
        .from("products")
        .update(toProductRow(data))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return mapProduct(row);
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", vars.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

/**
 * Registra uma visualização de produto (métrica "mais acessados" do painel).
 * Best-effort: qualquer erro é engolido para nunca quebrar a página.
 */
export async function incrementProductView(id: number): Promise<void> {
  try {
    await supabase.rpc("increment_product_views", { p_product_id: id });
  } catch {
    /* métrica não-crítica */
  }
}

// ------------------------------------------------------------------ perfil ---
function mapProfile(r: Row): Profile {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    postalCode: (r.postal_code as string) ?? null,
    city: (r.city as string) ?? null,
    state: (r.state as string) ?? null,
  };
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: ["profile"],
    enabled,
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .single();
      if (error) throw error;
      return mapProfile(data);
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Omit<Profile, "id">>): Promise<Profile> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const row: Row = {};
      if (data.name !== undefined) row.name = data.name;
      if (data.email !== undefined) row.email = data.email;
      if (data.phone !== undefined) row.phone = data.phone;
      if (data.postalCode !== undefined) row.postal_code = data.postalCode;
      if (data.city !== undefined) row.city = data.city;
      if (data.state !== undefined) row.state = data.state;
      const { data: updated, error } = await supabase
        .from("profiles")
        .update(row)
        .eq("id", auth.user.id)
        .select("*")
        .single();
      if (error) throw error;
      return mapProfile(updated);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// --------------------------------------------------------------- endereços ---
function mapAddress(r: Row): Address {
  return {
    id: r.id as string,
    label: (r.label as string) ?? "Endereço",
    recipient: (r.recipient as string) ?? "",
    postalCode: (r.postal_code as string) ?? "",
    street: (r.street as string) ?? "",
    number: (r.number as string) ?? "",
    complement: (r.complement as string) ?? null,
    district: (r.district as string) ?? "",
    city: (r.city as string) ?? "",
    state: (r.state as string) ?? "",
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at as string,
  };
}

function toAddressRow(data: Partial<AddressInput>) {
  const row: Row = {};
  if (data.label !== undefined) row.label = data.label.trim() || "Endereço";
  if (data.recipient !== undefined) row.recipient = data.recipient.trim();
  if (data.postalCode !== undefined)
    row.postal_code = data.postalCode.replace(/\D/g, "");
  if (data.street !== undefined) row.street = data.street.trim();
  if (data.number !== undefined) row.number = data.number.trim();
  if (data.complement !== undefined) row.complement = data.complement.trim();
  if (data.district !== undefined) row.district = data.district.trim();
  if (data.city !== undefined) row.city = data.city.trim();
  if (data.state !== undefined) row.state = data.state.trim().toUpperCase();
  if (data.isDefault !== undefined) row.is_default = data.isDefault;
  return row;
}

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ["addresses"],
    enabled,
    queryFn: async (): Promise<Address[]> => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapAddress);
    },
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddressInput): Promise<Address> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("addresses")
        .insert({ ...toAddressRow(input), user_id: auth.user.id })
        .select("*")
        .single();
      if (error) throw error;
      return mapAddress(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AddressInput>;
    }): Promise<Address> => {
      const { data: row, error } = await supabase
        .from("addresses")
        .update(toAddressRow(data))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return mapAddress(row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

// ----------------------------------------------------------------- pedidos ---
export function useMyOrders(enabled = true) {
  return useQuery({
    queryKey: ["orders", "mine"],
    enabled,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapOrder);
    },
  });
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: ["order", id],
    enabled: id != null,
    queryFn: async (): Promise<Order> => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return mapOrder(data);
    },
  });
}

export function useAdminOrders(enabled = true) {
  return useQuery({
    queryKey: ["orders", "all"],
    enabled,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapOrder);
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: OrderStatus;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", vars.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export type CreateOrderInput = {
  items: { productId: number; quantity: number }[];
  shippingOption: ShippingOption;
  customerName: string;
  customerEmail: string;
  postalCode: string;
};

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<Order> => {
      const { data: orderId, error } = await supabase.rpc("create_order", {
        p_items: input.items,
        p_shipping_option: input.shippingOption,
        p_customer_name: input.customerName,
        p_customer_email: input.customerEmail,
        p_postal_code: input.postalCode,
      });
      if (error) throw error;
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", orderId as number)
        .single();
      if (fetchError) throw fetchError;
      return mapOrder(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

// --------------------------------------------------------------- dashboard ---
export function useDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: ["dashboard-summary"],
    enabled,
    queryFn: async (): Promise<DashboardSummary> => {
      const { data, error } = await supabase.rpc("admin_dashboard_summary");
      if (error) throw error;
      const summary = data as DashboardSummary;
      // Tolera um banco ainda sem a migração 0004 (função antiga sem mostViewed).
      return { ...summary, mostViewed: summary.mostViewed ?? [] };
    },
  });
}

// ------------------------------------------------------------------ equipe ---
export type TeamMember = {
  userId: string;
  name: string;
  email: string | null;
  roles: Role[];
};

export function useTeam(enabled = true) {
  return useQuery({
    queryKey: ["team"],
    enabled,
    queryFn: async (): Promise<TeamMember[]> => {
      // user_roles.user_id referencia auth.users, não public.profiles — então
      // o PostgREST não faz o join embutido. Buscamos os perfis à parte.
      const { data: roleRows, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = [...new Set((roleRows ?? []).map((r) => r.user_id as string))];
      const profiles = new Map<string, { name: string; email: string | null }>();
      if (ids.length) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", ids);
        if (pErr) throw pErr;
        for (const p of (profs ?? []) as Row[]) {
          profiles.set(p.id as string, {
            name: (p.name as string) ?? "",
            email: (p.email as string) ?? null,
          });
        }
      }

      const byUser = new Map<string, TeamMember>();
      for (const r of (roleRows ?? []) as Row[]) {
        const uid = r.user_id as string;
        const prof = profiles.get(uid) ?? { name: "", email: null };
        const entry = byUser.get(uid) ?? {
          userId: uid,
          name: prof.name,
          email: prof.email,
          roles: [],
        };
        entry.roles.push(r.role as Role);
        byUser.set(uid, entry);
      }
      return [...byUser.values()];
    },
  });
}

export function useGrantRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }) => {
      const { data: profile, error: lookupError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email.trim())
        .single();
      if (lookupError || !profile) {
        throw new Error("Nenhuma conta com este e-mail. Peça para a pessoa se cadastrar primeiro.");
      }
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.id, role });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useRevokeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}
