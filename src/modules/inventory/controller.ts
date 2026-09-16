import type { FastifyInstance } from "fastify";
import { and, desc, eq, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../../db/client.js";
import { inventoryMovements, products, variants } from "../../db/schema.js";
import { availability, inventoryUnits, now, pageParams } from "../../shared/context.js";
import { writeAudit } from "../audit/service.js";

export async function registerInventoryControllers(app: FastifyInstance) {
  app.get("/admin/inventory", { preHandler: app.requireAdmin }, async (request) => {
    const q = pageParams.parse(request.query);
    const rows = await db.select({ variant: variants, product: products }).from(variants).innerJoin(products, eq(variants.productId, products.id));
    const filtered = rows.filter(({ variant, product }) => {
      const haystack = `${product.name} ${variant.name} ${variant.sku}`.toLowerCase();
      return (!q.search || haystack.includes(q.search.toLowerCase())) && (!q.status || q.status === "all" || availability(variant) === q.status);
    });
    const selected = filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    const items = selected.map(({ variant, product }) => ({ productId: product.id, productName: product.name, sellingMode: product.sellingMode, productStatus: product.publicationStatus, variantId: variant.id, variantName: variant.name, sku: variant.sku, active: variant.active, availability: availability(variant), inventoryPacks: variant.inventoryPacks, inventoryPieces: variant.inventoryPieces, piecesPerPack: variant.piecesPerPack, lowStockThreshold: variant.lowStockThreshold, priceKobo: variant.priceKobo }));
    const movements = await db.select({ movement: inventoryMovements, variant: variants, product: products }).from(inventoryMovements).innerJoin(variants, eq(inventoryMovements.variantId, variants.id)).innerJoin(products, eq(variants.productId, products.id)).orderBy(desc(inventoryMovements.createdAt)).limit(100);
    return { items, page: q.page, pageSize: q.pageSize, total: filtered.length, movements: movements.map(({ movement, variant, product }) => ({ ...movement, productId: product.id, productName: product.name, variantName: variant.name, sku: variant.sku })) };
  });
  app.post("/admin/inventory/adjustments", { preHandler: app.requireAdmin }, async (request, reply) => {
    const input = z.object({ variantId: z.string(), type: z.enum(["receive", "adjust", "damage", "return"]), deltaPacks: z.number().int(), deltaPieces: z.number().int(), reason: z.string().min(4), reference: z.string().optional() }).parse(request.body);
    const v = (await db.select().from(variants).where(eq(variants.id, input.variantId)).limit(1))[0];
    if (!v) return reply.code(404).send({ code: "NOT_FOUND", message: "Variant not found.", details: null });
    const product = (await db.select().from(products).where(eq(products.id, v.productId)).limit(1))[0];
    const beforePacks = v.inventoryPacks; const beforePieces = v.inventoryPieces;
    const total = inventoryUnits(v) + input.deltaPacks * v.piecesPerPack + input.deltaPieces;
    if (total < 0) return reply.code(409).send({ code: "NEGATIVE_INVENTORY", message: "Inventory cannot go below zero.", details: null });
    const afterPacks = Math.floor(total / v.piecesPerPack); const afterPieces = total % v.piecesPerPack;
    await db.update(variants).set({ inventoryPacks: afterPacks, inventoryPieces: afterPieces, updatedAt: now() }).where(eq(variants.id, v.id));
    const movement = { id: randomUUID(), variantId: v.id, type: input.type, reason: input.reason, reference: input.reference, deltaPacks: input.deltaPacks, deltaPieces: input.deltaPieces, beforePacks, beforePieces, afterPacks, afterPieces, createdAt: now() };
    await db.insert(inventoryMovements).values(movement);
    await writeAudit(request, { action: "inventory.adjusted", entityType: "variant", entityId: v.id, before: { inventoryPacks: beforePacks, inventoryPieces: beforePieces }, after: { inventoryPacks: afterPacks, inventoryPieces: afterPieces }, metadata: { type: input.type, reason: input.reason, reference: input.reference, movementId: movement.id } });
    return { ...movement, productId: product?.id, productName: product?.name, variantName: v.name, sku: v.sku };
  });
}
