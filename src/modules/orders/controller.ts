import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../../db/client.js";
import { bulkEnquiries, cartItems, carts, categories, inventoryMovements, orderItems, orders, products, savedProducts, users, variants } from "../../db/schema.js";
import {
  AuthRequest,
  availability,
  cartResponse,
  ensureCart,
  findCategory,
  findProduct,
  inventoryUnits,
  login,
  now,
  pageParams,
  productInput,
  publicProduct,
  serializeOrder,
  slugify,
  adminProducts,
} from "../../shared/context.js";
import { writeAudit } from "../audit/service.js";

export async function registerOrderControllers(app: FastifyInstance) {
  app.get("/orders", { preHandler: app.authenticate }, async (request) => {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, (request as AuthRequest).user.id))
      .orderBy(desc(orders.createdAt));
    return Promise.all(rows.map(serializeOrder));
  });
  app.get("/orders/:orderNumber", { preHandler: app.authenticate }, async (request, reply) => {
    const orderNumber = z.object({ orderNumber: z.string() }).parse(request.params).orderNumber;
    const order = (
      await db
        .select()
        .from(orders)
        .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, (request as AuthRequest).user.id)))
        .limit(1)
    )[0];
    if (!order) return reply.code(404).send({ code: "NOT_FOUND", message: "Order not found.", details: null });
    return serializeOrder(order);
  });
  app.post("/orders", { preHandler: app.authenticate }, async (request, reply) => {
    const key = request.headers["idempotency-key"];

    if (!key || Array.isArray(key)) {
      return reply.code(400).send({
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message: "Idempotency-Key is required.",
        details: null,
      });
    }

    const input = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(7),
        address: z.string().min(3),
        city: z.string().min(2),
        state: z.string().min(2),
        method: z.string().min(2),
        notes: z.string().optional(),
      })
      .parse(request.body);

    const existingOrder = (await db.select().from(orders).where(eq(orders.idempotencyKey, key)).limit(1))[0];

    if (existingOrder) {
      return existingOrder;
    }

    const auth = request as AuthRequest;
    const cart = await ensureCart(auth.user.id);

    const lines = await db
      .select({
        item: cartItems,
        variant: variants,
        product: products,
      })
      .from(cartItems)
      .innerJoin(variants, eq(cartItems.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(cartItems.cartId, cart.id));

    if (!lines.length) {
      return reply.code(400).send({
        code: "EMPTY_CART",
        message: "Your cart is empty.",
        details: null,
      });
    }

    const subtotal = lines.reduce((sum, line) => {
      const unitPrice = line.item.sellAsPieces ? Math.floor((line.variant.priceKobo || 0) / line.variant.piecesPerPack) : line.variant.priceKobo || 0;

      return sum + unitPrice * line.item.quantity;
    }, 0);

    const order = {
      id: randomUUID(),
      orderNumber: `YN-${Date.now().toString().slice(-8)}`,
      userId: auth.user.id,
      status: "awaiting_confirmation",
      subtotalKobo: subtotal,
      totalKobo: subtotal,
      address: input,
      idempotencyKey: key,
      createdAt: now(),
      updatedAt: now(),
    };

    await db.insert(orders).values(order);

    await db.insert(orderItems).values(
      lines.map((line) => ({
        id: randomUUID(),
        orderId: order.id,
        variantId: line.variant.id,
        productName: line.product.name,
        variantName: line.variant.name,
        sku: line.variant.sku,
        quantity: line.item.quantity,
        priceKobo: line.item.sellAsPieces ? Math.floor((line.variant.priceKobo || 0) / line.variant.piecesPerPack) : line.variant.priceKobo || 0,
        sellAsPieces: line.item.sellAsPieces,
      })),
    );

    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    await writeAudit(request, {
      action: "order.created",
      entityType: "order",
      entityId: order.id,
      after: {
        orderNumber: order.orderNumber,
        userId: order.userId,
        status: order.status,
        subtotalKobo: order.subtotalKobo,
        totalKobo: order.totalKobo,
      },
      metadata: {
        itemCount: lines.length,
        idempotencyKey: key,
      },
    });

    return reply.code(201).send(order);
  });

  app.get("/admin/orders", { preHandler: app.requireAdmin }, async (request) => {
    const q = pageParams.parse(request.query);
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const selected = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    return Promise.all(selected.map(serializeOrder));
  });
  app.patch("/admin/orders/:orderNumber/status", { preHandler: app.requireAdmin }, async (request, reply) => {
    const orderNumber = z.object({ orderNumber: z.string() }).parse(request.params).orderNumber;
    const status = z.object({ status: z.enum(["submitted", "awaiting_confirmation", "confirmed", "processing", "completed", "cancelled"]) }).parse(request.body).status;
    const before = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
    if (!before) return reply.code(404).send({ code: "NOT_FOUND", message: "Order not found.", details: null });
    const result = await db.update(orders).set({ status, updatedAt: now() }).where(eq(orders.orderNumber, orderNumber));
    if (!result[0]?.affectedRows) return reply.code(404).send({ code: "NOT_FOUND", message: "Order not found.", details: null });
    const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
    if (!order) return reply.code(404).send({ code: "NOT_FOUND", message: "Order not found.", details: null });
    await writeAudit(request, {
      action: "order.status_changed",
      entityType: "order",
      entityId: order.id,
      before: { status: before.status },
      after: { status: order.status },
      metadata: { orderNumber },
    });
    return serializeOrder(order);
  });
}
