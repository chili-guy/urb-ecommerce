import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Em ambiente serverless (Vercel) cada instância deve segurar poucas conexões —
// aponte o DATABASE_URL para um endpoint com pooling (Neon/Supabase/PgBouncer).
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX) || (isServerless ? 1 : 10),
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  allowExitOnIdle: isServerless,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
