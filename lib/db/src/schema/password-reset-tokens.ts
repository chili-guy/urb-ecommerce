import {
  foreignKey,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";

/**
 * Tokens de redefinição de senha do cliente. Guardamos apenas o hash do token
 * (o valor cru vai no link enviado por e-mail).
 */
export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId],
      foreignColumns: [profilesTable.id],
      name: "password_reset_tokens_profile_id_profiles_id_fk",
    }),
  ],
);

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
