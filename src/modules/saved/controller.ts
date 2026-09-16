import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../../db/client.js";
import { bulkEnquiries, cartItems, carts, categories, inventoryMovements, orderItems, orders, products, savedProducts, users, variants } from "../../db/schema.js";
import { AuthRequest, availability, cartResponse, ensureCart, findCategory, findProduct, inventoryUnits, login, now, pageParams, productInput, publicProduct, serializeOrder, slugify, adminProducts } from "../../shared/context.js";

export async function registerSavedControllers(app: FastifyInstance) {
  app.get("/saved-products", { preHandler: app.authenticate }, async (request) => { const rows = await db.select().from(savedProducts).where(eq(savedProducts.userId, (request as AuthRequest).user.id)); const items = await Promise.all(rows.map((row) => findProduct(row.productId))); return { ids: rows.map((row) => row.productId), items: items.filter(Boolean) }; });
  app.post("/saved-products", { preHandler: app.authenticate }, async (request) => { const input = z.object({ productId: z.string() }).parse(request.body); await db.insert(savedProducts).values({ userId: (request as AuthRequest).user.id, productId: input.productId, createdAt: now() }).onDuplicateKeyUpdate({ set: { productId: input.productId } }); return { ok: true }; });
  app.delete("/saved-products", { preHandler: app.authenticate }, async (request) => { const input = z.object({ productId: z.string() }).parse(request.body); await db.delete(savedProducts).where(and(eq(savedProducts.userId, (request as AuthRequest).user.id), eq(savedProducts.productId, input.productId))); return { ok: true }; });
}
