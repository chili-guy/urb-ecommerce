import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { adminUsersTable, db } from "@workspace/db";

export type AdminRole = "admin" | "operator";

export type AdminSessionUser = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminSessionUser;
    }
  }
}

const cookieName = "nexa_admin_session";
const sessionDurationMs = 1000 * 60 * 60 * 12;
const authWindowMs = 1000 * 60 * 15;
const maxAuthAttempts = 5;
const authAttempts = new Map<string, { count: number; resetAt: number }>();

const getSessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured for administration access");
  }
  return secret;
};

const sign = (value: string): string =>
  createHmac("sha256", getSessionSecret()).update(value).digest("base64url");

const toSessionUser = (user: typeof adminUsersTable.$inferSelect): AdminSessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role === "admin" ? "admin" : "operator",
  active: user.active,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const parseCookies = (header?: string): Record<string, string> =>
  Object.fromEntries(
    (header ?? "")
      .split(";")
      .map((entry) => entry.trim().split(/=(.*)/s, 2))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );

const getSessionUserId = (cookie?: string): number | null => {
  if (!cookie) return null;
  const [id, expiresAt, signature] = cookie.split(".");
  if (!id || !expiresAt || !signature) return null;

  const payload = `${id}.${expiresAt}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  if (Number(expiresAt) < Date.now()) return null;

  const parsedId = Number(id);
  return Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
};

const hashPassword = (password: string, salt = randomBytes(16).toString("hex")): string => {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, hashValue: string): boolean => {
  const [salt, hash] = hashValue.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  return derived.length === hash.length && timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
};

export const createPasswordHash = (password: string): string => hashPassword(password);

export const verifyBootstrapSecret = (candidate: string): boolean => {
  const configured = process.env.ADMIN_BOOTSTRAP_SECRET ?? process.env.SESSION_SECRET;
  if (!configured || candidate.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(configured));
};

export const consumeAuthAttempt = (key: string): boolean => {
  const now = Date.now();
  const current = authAttempts.get(key);
  if (!current || current.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + authWindowMs });
    return true;
  }
  if (current.count >= maxAuthAttempts) return false;
  current.count += 1;
  return true;
};

export const clearAuthAttempts = (key: string): void => {
  authAttempts.delete(key);
};

export const setAdminSessionCookie = (
  res: Parameters<RequestHandler>[1],
  userId: number,
): void => {
  const expiresAt = Date.now() + sessionDurationMs;
  const payload = `${userId}.${expiresAt}`;
  res.cookie(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionDurationMs,
    path: "/",
  });
};

export const clearAdminSessionCookie = (res: Parameters<RequestHandler>[1]): void => {
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
};

export const getCurrentAdminUser = async (cookieHeader?: string): Promise<AdminSessionUser | null> => {
  const userId = getSessionUserId(parseCookies(cookieHeader)[cookieName]);
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(and(eq(adminUsersTable.id, userId), eq(adminUsersTable.active, true)));

  return user ? toSessionUser(user) : null;
};

export const requireRole = (...roles: AdminRole[]): RequestHandler =>
  async (req, res, next): Promise<void> => {
    try {
      const user = await getCurrentAdminUser(req.headers.cookie);
      if (!user) {
        res.status(401).json({ error: "Acesso administrativo não autenticado" });
        return;
      }
      if (!roles.includes(user.role)) {
        res.status(403).json({ error: "Você não tem permissão para esta ação" });
        return;
      }
      req.adminUser = user;
      next();
    } catch (error) {
      req.log.error({ error }, "Failed to validate admin session");
      res.status(500).json({ error: "Não foi possível validar sua sessão" });
    }
  };
