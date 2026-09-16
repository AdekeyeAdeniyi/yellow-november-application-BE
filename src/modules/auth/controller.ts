import type { FastifyInstance } from "fastify";
import { and, count, eq, gte, like, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../../db/client.js";
import { users, orders } from "../../db/schema.js";
import { AuthRequest, login, now, pageParams } from "../../shared/context.js";
import { hashPassword } from "./password.js";
import { writeAudit } from "../audit/service.js";
async function getCustomerOrderTotals(userId: string) {
  const customerOrders = await db
    .select({
      status: orders.status,
      totalKobo: orders.totalKobo,
    })
    .from(orders)
    .where(eq(orders.userId, userId));

  const validOrders = customerOrders.filter((order) => order.status !== "cancelled");

  return {
    orders: validOrders.length,
    spent: validOrders.reduce((total, order) => total + (order.totalKobo || 0), 0),
  };
}

export async function registerAuthControllers(app: FastifyInstance) {
  app.post("/auth/customer/signup", async (request, reply) => {
    const input = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), password: z.string().min(8) }).parse(request.body);
    const email = input.email.trim().toLowerCase();
    const exists = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (exists) return reply.code(409).send({ code: "EMAIL_EXISTS", message: "An account with this email already exists.", details: null });
    const user = {
      id: randomUUID(),
      name: input.name.trim(),
      email,
      phone: input.phone?.trim(),
      passwordHash: await hashPassword(input.password),
      role: "customer" as const,
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    };
    await db.insert(users).values(user);
    await writeAudit(request, { action: "auth.signup", entityType: "user", entityId: user.id, after: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
    return { token: app.jwt.sign({ id: user.id, role: user.role, email: user.email }), user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  });
  app.post("/auth/customer/login", async (request, reply) => login(app, request, reply, "customer"));
  app.post("/auth/admin/login", async (request, reply) => login(app, request, reply, "admin"));
  app.get("/auth/me", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = request as AuthRequest;

    const user = (
      await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, auth.user.id))
        .limit(1)
    )[0];

    if (!user) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "User not found.",
        details: null,
      });
    }

    return user;
  });

  app.patch("/auth/me", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = request as AuthRequest;

    const input = z
      .object({
        phone: z.string().trim().min(7).optional().or(z.literal("")),
      })
      .parse(request.body);

    await db
      .update(users)
      .set({
        phone: input.phone || null,
        updatedAt: now(),
      })
      .where(eq(users.id, auth.user.id));

    const user = (
      await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, auth.user.id))
        .limit(1)
    )[0];

    if (!user) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "User not found.",
        details: null,
      });
    }

    return user;
  });

  app.get("/admin/overview/metrics", { preHandler: app.requireAdmin }, async () => {
    const nowDate = new Date();
    const startOfCurrentMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const startOfNextMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);
    const startOfPreviousMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1);
    const [total, active, currentMonth, previousMonth] = await Promise.all([
      db.select({ value: count() }).from(users).where(eq(users.role, "customer")),
      db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "customer"), eq(users.status, "active"))),
      db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "customer"), gte(users.createdAt, startOfCurrentMonth), lt(users.createdAt, startOfNextMonth))),
      db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "customer"), gte(users.createdAt, startOfPreviousMonth), lt(users.createdAt, startOfCurrentMonth))),
    ]);
    const current = Number(currentMonth[0]?.value || 0);
    const previous = Number(previousMonth[0]?.value || 0);
    return {
      customers: Number(total[0]?.value || 0),
      activeCustomers: Number(active[0]?.value || 0),
      newCustomersThisMonth: current,
      customerGrowthPercent: previous === 0 ? null : Math.round(((current - previous) / previous) * 100),
    };
  });
  app.get("/admin/users", { preHandler: app.requireAdmin }, async (request) => {
    const q = pageParams.parse(request.query);
    const rows = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          q.status && q.status !== "all" ? eq(users.status, q.status) : undefined,
          q.search ? or(like(users.name, `%${q.search}%`), like(users.email, `%${q.search}%`)) : undefined,
        ),
      );
    const selected = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    return Promise.all(
      selected.map(async (user) => {
        const totals = await getCustomerOrderTotals(user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          joined: user.createdAt,
          orders: totals.orders,
          spent: totals.spent,
          lastActive: user.updatedAt,
        };
      }),
    );
  });
  app.patch("/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const id = z.object({ id: z.string() }).parse(request.params).id;
    const input = z.object({ status: z.enum(["active", "suspended"]) }).parse(request.body);
    const result = await db
      .update(users)
      .set({ status: input.status, updatedAt: now() })
      .where(and(eq(users.id, id), eq(users.role, "customer")));
    if (!result[0]?.affectedRows) return reply.code(404).send({ code: "NOT_FOUND", message: "Customer not found.", details: null });
    const user = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
    if (!user) return reply.code(404).send({ code: "NOT_FOUND", message: "Customer not found.", details: null });
    await writeAudit(request, { action: "user.status_changed", entityType: "user", entityId: id, after: { status: input.status } });
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, joined: user.createdAt, orders: 0, spent: 0, lastActive: user.updatedAt };
  });
}
