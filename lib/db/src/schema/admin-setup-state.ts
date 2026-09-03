import { pgTable, smallint, timestamp } from "drizzle-orm/pg-core";

export const adminSetupStateTable = pgTable("admin_setup_state", {
  id: smallint("id").primaryKey(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminSetupState = typeof adminSetupStateTable.$inferSelect;