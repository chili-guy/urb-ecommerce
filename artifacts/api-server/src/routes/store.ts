import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateOrderBody,
  CreateOrderResponse,
  CreateProductBody,
  CreateProductResponse,
  DeleteProductParams,
  GetDashboardSummaryResponse,
  GetOrderParams,
  GetOrderResponse,
  GetProductParams,
  GetProductResponse,
  GetProfileResponse,
  GetShippingQuoteBody,
  GetShippingQuoteResponse,
  ListOrdersQueryParams,
  ListOrdersResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import {
  db,
  orderItemsTable,
  ordersTable,
  productsTable,
  profilesTable,
} from "@workspace/db";
import { requireRole } from "../middlewares/admin-auth";

const router: IRouter = Router();

type ShippingOption = {
  id: string;
  carrier: string;
  service: string;
  price: number;
  deliveryDays: number;
  description: string;
};

const toSlug = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getShippingOptions = (
  itemCount: number,
  postalCode: string,
): ShippingOption[] => {
  const regionFactor = postalCode.replace(/\D/g, "").startsWith("0") ? 1.15 : 1;
  const standard = Number(((12.9 + itemCount * 3.4) * regionFactor).toFixed(2));

  return [
    {
      id: "correios-pac",
      carrier: "Correios",
      service: "PAC",
      price: standard,
      deliveryDays: 6,
      description: "Entrega econômica com rastreio",
    },
    {
      id: "correios-sedex",
      carrier: "Correios",
      service: "SEDEX",
      price: Number((standard * 1.68).toFixed(2)),
      deliveryDays: 3,
      description: "Entrega expressa com rastreio",
    },
    {
      id: "nexa-express",
      carrier: "Nexa Entregas",
      service: "Express",
      price: Number((standard * 2.12).toFixed(2)),
      deliveryDays: 1,
      description: "Prioridade máxima para capitais",
    },
  ];
};

const getOrderWithItems = async (id: number) => {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    return undefined;
  }

  const items = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      total: orderItemsTable.total,
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  return {
    ...order,
    shippingOption: order.shippingOption as ShippingOption,
    items,
  };
};

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, category, featured, limit } = parsed.data;
  const filters = [];

  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(ilike(productsTable.name, pattern), ilike(productsTable.description, pattern)));
  }
  if (category) {
    filters.push(eq(productsTable.category, category));
  }
  if (featured !== undefined) {
    filters.push(eq(productsTable.featured, featured));
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(productsTable.featured), desc(productsTable.createdAt))
    .limit(limit);

  res.json(ListProductsResponse.parse(products));
});

router.post("/products", requireRole("admin", "operator"), async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slugBase = toSlug(parsed.data.name);
  const slug = `${slugBase}-${Date.now().toString().slice(-5)}`;
  const [product] = await db
    .insert(productsTable)
    .values({ ...parsed.data, slug, rating: 4.8, reviewCount: 0 })
    .returning();

  req.log.info({ productId: product.id }, "Product created");
  res.status(201).json(CreateProductResponse.parse(product));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }

  res.json(GetProductResponse.parse(product));
});

router.patch("/products/:id", requireRole("admin", "operator"), async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set(body.data)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }

  req.log.info({ productId: product.id }, "Product updated");
  res.json(UpdateProductResponse.parse(product));
});

router.delete("/products/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }

  req.log.info({ productId: product.id }, "Product deleted");
  res.sendStatus(204);
});

router.post("/shipping/quote", async (req, res): Promise<void> => {
  const parsed = GetShippingQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const itemCount = parsed.data.items.reduce((total, item) => total + item.quantity, 0);
  res.json(GetShippingQuoteResponse.parse(getShippingOptions(itemCount, parsed.data.postalCode)));
});

router.get("/orders", async (req, res): Promise<void> => {
  const params = ListOrdersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(params.data.email ? eq(ordersTable.customerEmail, params.data.email) : undefined)
    .orderBy(desc(ordersTable.createdAt));

  const orders = await Promise.all(rows.map((order) => getOrderWithItems(order.id)));
  res.json(ListOrdersResponse.parse(orders.filter(Boolean)));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const productIds = parsed.data.items.map((item) => item.productId);
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  if (products.length !== productIds.length) {
    res.status(400).json({ error: "Um ou mais produtos não estão disponíveis" });
    return;
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const requestedQuantity = parsed.data.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const shippingOption = getShippingOptions(requestedQuantity, parsed.data.postalCode).find(
    (option) => option.id === parsed.data.shippingOptionId,
  );

  if (!shippingOption) {
    res.status(400).json({ error: "Opção de entrega inválida" });
    return;
  }

  const orderItems = parsed.data.items.map((item) => {
    const product = productsById.get(item.productId)!;
    if (product.stock < item.quantity) {
      throw new Error(`Estoque indisponível para ${product.name}`);
    }

    const unitPrice = Number(product.price);
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      total: Number((unitPrice * item.quantity).toFixed(2)),
    };
  });

  const subtotal = Number(orderItems.reduce((total, item) => total + item.total, 0).toFixed(2));
  const profile = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.email, parsed.data.customerEmail));

  try {
    const orderId = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(ordersTable)
        .values({
          profileId: profile[0]?.id,
          customerName: parsed.data.customerName,
          customerEmail: parsed.data.customerEmail,
          postalCode: parsed.data.postalCode,
          subtotal,
          shipping: shippingOption.price,
          total: Number((subtotal + shippingOption.price).toFixed(2)),
          shippingOption,
        })
        .returning({ id: ordersTable.id });

      await tx.insert(orderItemsTable).values(
        orderItems.map((item) => ({ ...item, orderId: order.id })),
      );

      for (const item of orderItems) {
        await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }
      return order.id;
    });

    const order = await getOrderWithItems(orderId);
    req.log.info({ orderId }, "Order created");
    res.status(201).json(CreateOrderResponse.parse(order));
  } catch (error) {
    req.log.warn({ error }, "Order could not be created");
    res.status(400).json({
      error: error instanceof Error ? error.message : "Não foi possível criar o pedido",
    });
  }
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const order = await getOrderWithItems(params.data.id);
  if (!order) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }

  res.json(GetOrderResponse.parse(order));
});

router.get("/profile", async (_req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .orderBy(profilesTable.id)
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "Perfil não encontrado" });
    return;
  }

  res.json(GetProfileResponse.parse(profile));
});

router.patch("/profile", async (req, res): Promise<void> => {
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [currentProfile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .orderBy(profilesTable.id)
    .limit(1);

  if (!currentProfile) {
    res.status(404).json({ error: "Perfil não encontrado" });
    return;
  }

  const [profile] = await db
    .update(profilesTable)
    .set(body.data)
    .where(eq(profilesTable.id, currentProfile.id))
    .returning();

  req.log.info({ profileId: profile.id }, "Profile updated");
  res.json(UpdateProfileResponse.parse(profile));
});

router.get("/dashboard/summary", requireRole("admin", "operator"), async (_req, res): Promise<void> => {
  const [{ orders }] = await db
    .select({ orders: count() })
    .from(ordersTable);
  const [{ products }] = await db
    .select({ products: count() })
    .from(productsTable);
  const [{ customers }] = await db
    .select({ customers: count() })
    .from(profilesTable);
  const [{ revenue }] = await db
    .select({ revenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)` })
    .from(ordersTable);
  const [{ inventoryUnits, lowStock }] = await db
    .select({
      inventoryUnits: sql<number>`coalesce(sum(${productsTable.stock}), 0)`,
      lowStock: sql<number>`coalesce(sum(case when ${productsTable.stock} <= 5 then 1 else 0 end), 0)`,
    })
    .from(productsTable);

  const recentOrderRows = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);
  const topProductRows = await db
    .select({
      name: orderItemsTable.productName,
      sales: sql<number>`sum(${orderItemsTable.quantity})`,
      revenue: sql<number>`sum(${orderItemsTable.total})`,
    })
    .from(orderItemsTable)
    .groupBy(orderItemsTable.productName)
    .orderBy(desc(sql`sum(${orderItemsTable.total})`))
    .limit(4);

  const now = new Date();
  const salesByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const value = recentOrderRows
      .filter((order) => order.createdAt >= dayStart && order.createdAt < dayEnd)
      .reduce((sum, order) => sum + Number(order.total), 0);
    return {
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
      value: Number(value.toFixed(2)),
    };
  });

  res.json(
    GetDashboardSummaryResponse.parse({
      revenue: Number(revenue),
      revenueChange: 0,
      orders,
      ordersChange: 0,
      customers,
      products,
      inventoryUnits: Number(inventoryUnits),
      lowStock: Number(lowStock),
      salesByDay,
      topProducts: topProductRows.map((product) => ({
        name: product.name,
        sales: Number(product.sales),
        revenue: Number(product.revenue),
      })),
      recentOrders: recentOrderRows.map((order) => ({
        id: order.id,
        customerName: order.customerName,
        total: Number(order.total),
        status: order.status,
        createdAt: order.createdAt,
      })),
    }),
  );
});

export default router;