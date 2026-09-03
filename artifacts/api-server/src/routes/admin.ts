import { count, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  AdminLoginBody,
  AdminLoginResponse,
  AdminSetupBody,
  AdminSetupResponse,
  GetAdminSetupStatusResponse,
  CreateAdminUserBody,
  CreateAdminUserResponse,
  GetAdminSessionResponse,
  ListAdminOrdersResponse,
  ListAdminUsersResponse,
  UpdateAdminUserBody,
  UpdateAdminUserParams,
  UpdateAdminUserResponse,
} from "@workspace/api-zod";
import {
  adminSetupStateTable,
  adminUsersTable,
  db,
  orderItemsTable,
  ordersTable,
} from "@workspace/db";
import {
  clearAdminSessionCookie,
  clearAuthAttempts,
  consumeAuthAttempt,
  createPasswordHash,
  getCurrentAdminUser,
  requireRole,
  setAdminSessionCookie,
  verifyBootstrapSecret,
  verifyPassword,
} from "../middlewares/admin-auth";

const router: IRouter = Router();

const toAdminUserResponse = (user: typeof adminUsersTable.$inferSelect) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role === "admin" ? "admin" : "operator",
  active: user.active,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const getOrderWithItems = async (id: number) => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) return undefined;

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

  return { ...order, shippingOption: order.shippingOption, items };
};

const authKey = (req: { ip?: string }, email: string): string =>
  `${req.ip ?? "unknown"}:${email.trim().toLowerCase()}`;

router.post("/admin/auth/login", async (req, res): Promise<void> => {
  const body = AdminLoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const normalizedEmail = body.data.email.trim().toLowerCase();
  const attemptKey = authKey(req, normalizedEmail);
  if (!consumeAuthAttempt(attemptKey)) {
    res.setHeader("Retry-After", "900");
    res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    return;
  }

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, normalizedEmail));

  if (!user || !user.active || !verifyPassword(body.data.password, user.passwordHash)) {
    req.log.warn({ email: normalizedEmail }, "Rejected admin login");
    res.status(401).json({ error: "E-mail ou senha inválidos" });
    return;
  }
  clearAuthAttempts(attemptKey);

  const [updatedUser] = await db
    .update(adminUsersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsersTable.id, user.id))
    .returning();

  setAdminSessionCookie(res, updatedUser.id);
  req.log.info({ adminUserId: updatedUser.id }, "Admin user authenticated");
  res.json(AdminLoginResponse.parse({ user: toAdminUserResponse(updatedUser) }));
});

router.get("/admin/auth/setup-status", async (_req, res): Promise<void> => {
  const [setupState] = await db
    .select({ id: adminSetupStateTable.id })
    .from(adminSetupStateTable)
    .limit(1);
  const [{ users }] = await db
    .select({ users: count() })
    .from(adminUsersTable);
  res.json(GetAdminSetupStatusResponse.parse({
    needsSetup: !setupState && Number(users) === 0,
  }));
});

router.post("/admin/auth/setup", async (req, res): Promise<void> => {
  const body = AdminSetupBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const attemptKey = authKey(req, "bootstrap");
  if (!consumeAuthAttempt(attemptKey)) {
    res.setHeader("Retry-After", "900");
    res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    return;
  }
  if (!verifyBootstrapSecret(body.data.setupSecret)) {
    req.log.warn("Rejected admin bootstrap attempt");
    res.status(401).json({ error: "Chave de inicialização inválida" });
    return;
  }

  try {
    const user = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(17420931)`);
      const [setupState] = await tx
        .select({ id: adminSetupStateTable.id })
        .from(adminSetupStateTable)
        .limit(1);
      const [{ users }] = await tx
        .select({ users: count() })
        .from(adminUsersTable);
      if (setupState || Number(users) > 0) {
        throw new Error("ADMIN_SETUP_ALREADY_COMPLETE");
      }

      const [createdUser] = await tx
        .insert(adminUsersTable)
        .values({
          name: body.data.name.trim(),
          email: body.data.email.trim().toLowerCase(),
          passwordHash: createPasswordHash(body.data.password),
          role: "admin",
        })
        .returning();
      await tx.insert(adminSetupStateTable).values({ id: 1 });
      return createdUser;
    });

    clearAuthAttempts(attemptKey);
    setAdminSessionCookie(res, user.id);
    req.log.info({ adminUserId: user.id }, "Initial admin user configured");
    res.status(201).json(AdminSetupResponse.parse({ user: toAdminUserResponse(user) }));
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_SETUP_ALREADY_COMPLETE") {
      res.status(409).json({ error: "O administrador inicial já foi configurado" });
      return;
    }
    throw error;
  }
});

router.post("/admin/auth/logout", async (_req, res): Promise<void> => {
  clearAdminSessionCookie(res);
  res.sendStatus(204);
});

router.get("/admin/auth/me", async (req, res): Promise<void> => {
  const user = await getCurrentAdminUser(req.headers.cookie);
  if (!user) {
    res.status(401).json({ error: "Acesso administrativo não autenticado" });
    return;
  }
  res.json(GetAdminSessionResponse.parse({ user }));
});

router.get("/admin/users", requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(adminUsersTable).orderBy(adminUsersTable.name);
  res.json(ListAdminUsersResponse.parse(users.map(toAdminUserResponse)));
});

router.post("/admin/users", requireRole("admin"), async (req, res): Promise<void> => {
  const body = CreateAdminUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, body.data.email.trim().toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Já existe um usuário com este e-mail" });
    return;
  }

  const [user] = await db
    .insert(adminUsersTable)
    .values({
      name: body.data.name.trim(),
      email: body.data.email.trim().toLowerCase(),
      passwordHash: createPasswordHash(body.data.password),
      role: body.data.role,
    })
    .returning();
  req.log.info({ adminUserId: user.id }, "Admin user created");
  res.status(201).json(CreateAdminUserResponse.parse(toAdminUserResponse(user)));
});

router.patch("/admin/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateAdminUserParams.safeParse(req.params);
  const body = UpdateAdminUserBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "Informe ao menos um campo para atualizar" });
    return;
  }

  const [currentUser] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, params.data.id));
  if (!currentUser) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  if (
    req.adminUser?.id === currentUser.id &&
    (body.data.active === false || body.data.role === "operator")
  ) {
    res.status(400).json({ error: "Você não pode remover o próprio acesso administrativo" });
    return;
  }

  if (body.data.email && body.data.email.trim().toLowerCase() !== currentUser.email) {
    const [existing] = await db
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, body.data.email.trim().toLowerCase()));
    if (existing) {
      res.status(400).json({ error: "Já existe um usuário com este e-mail" });
      return;
    }
  }

  const { password, ...changes } = body.data;
  const updateData = {
    ...changes,
    name: changes.name?.trim(),
    email: changes.email?.trim().toLowerCase(),
    ...(password ? { passwordHash: createPasswordHash(password) } : {}),
  };
  const [user] = await db
    .update(adminUsersTable)
    .set(updateData)
    .where(eq(adminUsersTable.id, params.data.id))
    .returning();

  req.log.info({ adminUserId: user.id }, "Admin user updated");
  res.json(UpdateAdminUserResponse.parse(toAdminUserResponse(user)));
});

router.get("/admin/orders", requireRole("admin", "operator"), async (_req, res): Promise<void> => {
  const orderRows = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  const orders = await Promise.all(orderRows.map((order) => getOrderWithItems(order.id)));
  res.json(ListAdminOrdersResponse.parse(orders.filter(Boolean)));
});

export default router;