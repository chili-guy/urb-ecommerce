import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  compareAtPrice: real("compare_at_price"),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url").notNull(),
  featured: boolean("featured").notNull().default(false),
  rating: real("rating").notNull().default(4.8),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;