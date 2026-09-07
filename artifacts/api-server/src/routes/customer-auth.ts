import { createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetCustomerSessionResponse,
  LoginCustomerBody,
  LoginCustomerResponse,
  RegisterCustomerBody,
  RegisterCustomerResponse,
  RequestPasswordResetBody,
  ResetPasswordBody,
  ResetPasswordResponse,
} from "@workspace/api-zod";
import { db, passwordResetTokensTable, profilesTable } from "@workspace/db";
import {
  clearAuthAttempts,
  consumeAuthAttempt,
  createPasswordHash,
  verifyPassword,
} from "../middlewares/admin-auth";
import {
  clearCustomerSessionCookie,
  getCurrentCustomer,
  setCustomerSessionCookie,
  toCustomerSessionUser,
} from "../middlewares/customer-auth";
import { appUrl, sendEmail } from "../lib/mailer";

const router: IRouter = Router();

const resetTokenTtlMs = 1000 * 60 * 60; // 1 hora

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const authKey = (req: { ip?: string }, scope: string): string =>
  `customer:${scope}:${req.ip ?? "unknown"}`;

const hashResetToken = (token: string): string =>
  createHmac("sha256", process.env.SESSION_SECRET ?? "").update(token).digest("hex");

router.post("/auth/register", async (req, res): Promise<void> => {
  const body = RegisterCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const attemptKey = authKey(req, "register");
  if (!consumeAuthAttempt(attemptKey)) {
    res.setHeader("Retry-After", "900");
    res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    return;
  }

  const email = normalizeEmail(body.data.email);
  const [existing] = await db
    .select({ id: profilesTable.id, passwordHash: profilesTable.passwordHash })
    .from(profilesTable)
    .where(eq(profilesTable.email, email));

  if (existing?.passwordHash) {
    res.status(409).json({ error: "Já existe uma conta com este e-mail" });
    return;
  }

  const passwordHash = createPasswordHash(body.data.password);
  const name = body.data.name.trim();

  // Um perfil de convidado (criado só no checkout) pode existir sem senha —
  // nesse caso apenas anexamos as credenciais.
  const [profile] = existing
    ? await db
        .update(profilesTable)
        .set({ name, passwordHash })
        .where(eq(profilesTable.id, existing.id))
        .returning()
    : await db
        .insert(profilesTable)
        .values({ name, email, passwordHash })
        .returning();

  clearAuthAttempts(attemptKey);
  setCustomerSessionCookie(res, profile.id);
  req.log.info({ profileId: profile.id }, "Customer account created");
  res
    .status(201)
    .json(RegisterCustomerResponse.parse({ user: toCustomerSessionUser(profile) }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = LoginCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const email = normalizeEmail(body.data.email);
  const attemptKey = `${authKey(req, "login")}:${email}`;
  if (!consumeAuthAttempt(attemptKey)) {
    res.setHeader("Retry-After", "900");
    res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    return;
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.email, email));

  if (!profile?.passwordHash || !verifyPassword(body.data.password, profile.passwordHash)) {
    req.log.warn({ email }, "Rejected customer login");
    res.status(401).json({ error: "E-mail ou senha inválidos" });
    return;
  }

  clearAuthAttempts(attemptKey);
  setCustomerSessionCookie(res, profile.id);
  req.log.info({ profileId: profile.id }, "Customer authenticated");
  res.json(LoginCustomerResponse.parse({ user: toCustomerSessionUser(profile) }));
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  clearCustomerSessionCookie(res);
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const customer = await getCurrentCustomer(req.headers.cookie);
  if (!customer) {
    res.status(401).json({ error: "Entre na sua conta para continuar" });
    return;
  }
  res.json(GetCustomerSessionResponse.parse({ user: customer }));
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const body = RequestPasswordResetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const attemptKey = authKey(req, "forgot");
  if (!consumeAuthAttempt(attemptKey)) {
    res.setHeader("Retry-After", "900");
    res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    return;
  }

  const email = normalizeEmail(body.data.email);
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.email, email));

  // Resposta idêntica exista ou não a conta, para não vazar quem tem cadastro.
  if (profile?.passwordHash) {
    const token = randomBytes(32).toString("base64url");
    await db.insert(passwordResetTokensTable).values({
      profileId: profile.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + resetTokenTtlMs),
    });

    const link = `${appUrl()}/redefinir-senha?token=${token}`;
    await sendEmail({
      to: profile.email,
      subject: "Redefinição de senha — URB",
      text:
        `Olá, ${profile.name}.\n\n` +
        `Recebemos um pedido para redefinir a senha da sua conta URB.\n` +
        `Abra o link abaixo (válido por 1 hora):\n\n${link}\n\n` +
        `Se não foi você, ignore este e-mail.`,
    });
    req.log.info({ profileId: profile.id }, "Password reset link issued");
  }

  res.sendStatus(202);
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const body = ResetPasswordBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const tokenHash = hashResetToken(body.data.token);
  const [entry] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );

  if (!entry) {
    res.status(400).json({ error: "Link inválido ou expirado. Solicite um novo." });
    return;
  }

  const profile = await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, entry.id));

    const [updated] = await tx
      .update(profilesTable)
      .set({ passwordHash: createPasswordHash(body.data.password) })
      .where(eq(profilesTable.id, entry.profileId))
      .returning();
    return updated;
  });

  if (!profile) {
    res.status(400).json({ error: "Conta não encontrada" });
    return;
  }

  setCustomerSessionCookie(res, profile.id);
  req.log.info({ profileId: profile.id }, "Customer password reset");
  res.json(ResetPasswordResponse.parse({ user: toCustomerSessionUser(profile) }));
});

export default router;
