import { createInsertSchema } from "drizzle-zod";
import {
  foreignKey,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { profilesTable } from "./profiles";

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    postalCode: text("postal_code").notNull(),
    status: text("status").notNull().default("Pedido confirmado"),
    subtotal: real("subtotal").notNull(),
    shipping: real("shipping").notNull(),
    total: real("total").notNull(),
    shippingOption: jsonb("shipping_option").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId],
      foreignColumns: [profilesTable.id],
      name: "orders_profile_id_profiles_id_fk",
    }),
  ],
);

export const orderItemsTable = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id").notNull(),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    total: real("total").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [ordersTable.id],
      name: "order_items_order_id_orders_id_fk",
    }),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [productsTable.id],
      name: "order_items_product_id_products_id_fk",
    }),
  ],
);

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({
  id: true,
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;