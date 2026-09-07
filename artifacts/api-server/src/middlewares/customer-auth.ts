import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";

export type CustomerSessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  createdAt: Date;
};

declare global {
  namespace Express {
    interface Request {
      customer?: CustomerSessionUser;
    }
  }
}

const cookieName = "urb_customer_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30; // 30 dias

const getSessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured for customer accounts");
  }
  return secret;
};

const sign = (value: string): string =>
  createHmac("sha256", getSessionSecret()).update(value).digest("base64url");

const parseCookies = (header?: string): Record<string, string> =>
  Object.fromEntries(
    (header ?? "")
      .split(";")
      .map((entry) => entry.trim().split(/=(.*)/s, 2))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );

const getSessionProfileId = (cookie?: string): number | null => {
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

export const toCustomerSessionUser = (
  profile: typeof profilesTable.$inferSelect,
): CustomerSessionUser => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  phone: profile.phone,
  postalCode: profile.postalCode,
  city: profile.city,
  state: profile.state,
  createdAt: profile.createdAt,
});

export const setCustomerSessionCookie = (
  res: Parameters<RequestHandler>[1],
  profileId: number,
): void => {
  const expiresAt = Date.now() + sessionDurationMs;
  const payload = `${profileId}.${expiresAt}`;
  res.cookie(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionDurationMs,
    path: "/",
  });
};

export const clearCustomerSessionCookie = (
  res: Parameters<RequestHandler>[1],
): void => {
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
};

export const getCurrentCustomer = async (
  cookieHeader?: string,
): Promise<CustomerSessionUser | null> => {
  const profileId = getSessionProfileId(parseCookies(cookieHeader)[cookieName]);
  if (!profileId) return null;

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId));

  if (!profile || !profile.passwordHash) return null;
  return toCustomerSessionUser(profile);
};

export const requireCustomer: RequestHandler = async (req, res, next) => {
  try {
    const customer = await getCurrentCustomer(req.headers.cookie);
    if (!customer) {
      res.status(401).json({ error: "Entre na sua conta para continuar" });
      return;
    }
    req.customer = customer;
    next();
  } catch (error) {
    req.log.error({ error }, "Failed to validate customer session");
    res.status(500).json({ error: "Não foi possível validar sua sessão" });
  }
};
