import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../../db/client.js";
import { products, variants } from "../../db/schema.js";
import { findCategory, findProduct, now, productInput, slugify, adminProducts } from "../../shared/context.js";
import { writeAudit } from "../audit/service.js";
import { env } from "../../config/env.js";

export async function registerProductControllers(app: FastifyInstance) {
  app.post("/admin/uploads/cloudinary/signature", { preHandler: app.requireAdmin }, async (request, reply) => {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return reply.code(503).send({ code: "CLOUDINARY_NOT_CONFIGURED", message: "Cloudinary upload is not configured on the backend.", details: null });
    }
    const input = z
      .object({
        folder: z
          .string()
          .regex(/^yellow-november\/[a-z0-9_-]+$/)
          .default("yellow-november/products"),
      })
      .parse(request.body || {});
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1").update(`folder=${input.folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest("hex");
    return { cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, timestamp, folder: input.folder, signature };
  });
  app.get("/admin/products", { preHandler: app.requireAdmin }, async (request) => adminProducts(request));
  app.post("/admin/products", { preHandler: app.requireAdmin }, async (request, reply) => {
    const input = productInput.parse(request.body);
    const category = await findCategory(input.category);
    if (!category) return reply.code(400).send({ code: "INVALID_CATEGORY", message: "Category does not exist.", details: null });
    const id = randomUUID();
    await db.insert(products).values({
      id,
      categoryId: category.id,
      slug: slugify(input.name),
      name: input.name,
      sellingMode: input.sellingMode,
      shortDescription: input.shortDescription,
      description: input.description,

      ingredients: input.ingredients,
      processingInformation: input.processingInformation,

      packaging: input.packaging,
      storage: input.storage,

      shelfLife: input.shelfLife || null,
      certifications: input.certifications || null,

      image: input.image || null,
      images: input.images,
      publicationStatus: input.publicationStatus,
      featured: input.featured,
      allowBulkEnquiry: input.allowBulkEnquiry,

      createdAt: now(),
      updatedAt: now(),
    });
    await db.insert(variants).values(
      input.variants.map((v) => ({
        ...v,
        id: v.id || randomUUID(),
        productId: id,
        sellableType: input.sellingMode === "single" ? "single" : input.sellingMode === "pack" ? "pack" : "variant",
        image: v.image || null,
        createdAt: now(),
        updatedAt: now(),
      })),
    );
    const created = await findProduct(id);
    await writeAudit(request, {
      action: "product.created",
      entityType: "product",
      entityId: id,
      after: { ...(created as object), variants: input.variants.map(({ priceKobo, ...variant }) => ({ ...variant, priceKobo })) },
    });
    return reply.code(201).send(created);
  });
  app.patch("/admin/products/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const id = z.object({ id: z.string() }).parse(request.params).id;
    const input = productInput.partial().parse(request.body);
    const existing = await findProduct(id);
    if (!existing) return reply.code(404).send({ code: "NOT_FOUND", message: "Product not found.", details: null });
    const { variants: nextVariants, category: categoryName, ...fields } = input;
    const category = categoryName ? await findCategory(categoryName) : undefined;
    await db
      .update(products)
      .set({ ...fields, categoryId: category?.id, updatedAt: now() })
      .where(eq(products.id, id));
    if (nextVariants) {
      await db.delete(variants).where(eq(variants.productId, id));
      await db.insert(variants).values(
        nextVariants.map((v) => ({
          ...v,
          id: v.id || randomUUID(),
          productId: id,
          sellableType: input.sellingMode === "single" ? "single" : input.sellingMode === "pack" ? "pack" : "variant",
          image: v.image || null,
          createdAt: now(),
          updatedAt: now(),
        })),
      );
    }
    const updated = await findProduct(id);
    await writeAudit(request, {
      action: "product.updated",
      entityType: "product",
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });
    return updated;
  });
  app.delete("/admin/products/:id", { preHandler: app.requireAdmin }, async (request) => {
    const id = z.object({ id: z.string() }).parse(request.params).id;
    const before = await findProduct(id);
    await db.update(products).set({ publicationStatus: "archived", updatedAt: now() }).where(eq(products.id, id));
    await writeAudit(request, { action: "product.archived", entityType: "product", entityId: id, before: before as unknown as Record<string, unknown>, after: { publicationStatus: "archived" } });
    return { ok: true };
  });
}
