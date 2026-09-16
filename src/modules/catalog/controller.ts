import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../../db/client.js";
import { bulkEnquiries, cartItems, carts, categories, inventoryMovements, orderItems, orders, products, savedProducts, users, variants } from "../../db/schema.js";
import { AuthRequest, availability, cartResponse, ensureCart, findCategory, findProduct, inventoryUnits, login, now, pageParams, productInput, publicProduct, serializeOrder, slugify, adminProducts } from "../../shared/context.js";

export async function registerCatalogControllers(app: FastifyInstance) {
  app.get("/catalog/categories", async () => {
    return db.select().from(categories).where(eq(categories.active, true)).orderBy(categories.name);
  });
  app.get("/catalog/products", async (request) => { const query = pageParams.parse(request.query); const category = query.category ? await findCategory(query.category) : undefined; const all = await db.select().from(products).where(and(eq(products.publicationStatus, "published"), category ? eq(products.categoryId, category.id) : undefined, query.featured ? eq(products.featured, true) : undefined, query.bulk ? eq(products.allowBulkEnquiry, true) : undefined, query.search ? or(like(products.name, `%${query.search}%`), like(products.shortDescription, `%${query.search}%`)) : undefined)); const selected = all.slice((query.page - 1) * query.pageSize, query.page * query.pageSize); const result = await Promise.all(selected.map(async (product) => publicProduct(product, await db.select().from(variants).where(eq(variants.productId, product.id))))); return result; });
  app.get("/catalog/products/:slug", async (request, reply) => { const { slug } = z.object({ slug: z.string() }).parse(request.params); const product = (await db.select().from(products).where(and(eq(products.slug, slug), eq(products.publicationStatus, "published"))).limit(1))[0]; if (!product) return reply.code(404).send({ code: "NOT_FOUND", message: "Product not found.", details: null }); return publicProduct(product, await db.select().from(variants).where(eq(variants.productId, product.id))); });
}
