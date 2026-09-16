import type { FastifyRequest } from "fastify";
import { and, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { carts, cartItems, categories, orderItems, orders, products, variants, users } from "../db/schema.js";
import { verifyPassword } from "../modules/auth/password.js";
import type { FastifyInstance, FastifyReply } from "fastify";
import { writeAudit } from "../modules/audit/service.js";

export type AuthRequest = FastifyRequest & { user: { id: string; role: "customer" | "admin"; email: string } };
export const now = () => new Date();
export const pageParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.string().trim().optional(),
  featured: z.coerce.boolean().optional(),
  bulk: z.coerce.boolean().optional(),
});
export const productInput = z.object({
  name: z.string().min(2).max(200),
  category: z.string().min(2),
  sellingMode: z.enum(["single", "pack", "variants"]),
  shortDescription: z.string().min(10),
  description: z.string().min(10),

  ingredients: z.string().default(""),
  processingInformation: z.string().default(""),

  packaging: z.string().default(""),
  storage: z.string().default(""),

  shelfLife: z.string().max(255).optional(),
  certifications: z.string().max(255).optional(),

  image: z.string().optional(),
  images: z.array(z.string()).default([]),

  publicationStatus: z.enum(["draft", "published", "archived"]).default("draft"),

  featured: z.boolean().default(false),
  allowBulkEnquiry: z.boolean().default(true),

  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        sku: z.string().min(1),
        name: z.string().min(1),
        sellableType: z.string().optional(),
        priceKobo: z.number().int().nonnegative().nullable(),
        active: z.boolean().default(true),
        inventoryPacks: z.number().int().nonnegative().default(0),
        inventoryPieces: z.number().int().nonnegative().default(0),
        piecesPerPack: z.number().int().positive().default(1),
        lowStockThreshold: z.number().int().nonnegative().default(5),
        minOrderQuantity: z.number().int().positive().default(1),
        maxOrderQuantity: z.number().int().nonnegative().default(0),
        image: z.string().optional(),
        images: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});

export async function publicProduct(product: typeof products.$inferSelect, rows: (typeof variants.$inferSelect)[]) {
  const category = (await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1))[0];
  const normalizedVariants = rows.map((variant) => ({ ...variant, availability: availability(variant), stock: variant.inventoryPacks }));
  const productAvailability = normalizedVariants.some((variant) => variant.active && variant.availability === "low_stock")
    ? "low_stock"
    : normalizedVariants.some((variant) => variant.active && variant.availability !== "out_of_stock")
      ? "in_stock"
      : "out_of_stock";
  return { ...product, category: category?.name || product.categoryId, availability: productAvailability, variants: normalizedVariants };
}
export async function findProduct(id: string) {
  const product = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
  if (!product) return null;
  return publicProduct(product, await db.select().from(variants).where(eq(variants.productId, id)));
}
export async function findCategory(name: string) {
  return (
    await db
      .select()
      .from(categories)
      .where(or(eq(categories.id, name), eq(categories.name, name)))
      .limit(1)
  )[0];
}
export function inventoryUnits(v: typeof variants.$inferSelect) {
  return v.inventoryPacks * v.piecesPerPack + v.inventoryPieces;
}
export function availability(v: typeof variants.$inferSelect) {
  const units = inventoryUnits(v);
  const threshold = v.lowStockThreshold * v.piecesPerPack;
  return units <= 0 ? "out_of_stock" : units <= threshold ? "low_stock" : "in_stock";
}
export async function login(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply, role: "customer" | "admin") {
  const input = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(request.body);
  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.email, input.email.toLowerCase()), eq(users.role, role)))
      .limit(1)
  )[0];
  if (!user || user.status !== "active" || !(await verifyPassword(input.password, user.passwordHash))) {
    await writeAudit(request, {
      action: "auth.login.failure",
      entityType: "user",
      entityId: user?.id,
      metadata: { email: input.email.toLowerCase(), role, reason: user?.status !== "active" ? "account_inactive" : "invalid_credentials" },
    });
    return reply.code(401).send({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", details: null });
  }
  const userRole = user.role as "customer" | "admin";
  await writeAudit(request, { action: "auth.login.success", entityType: "user", entityId: user.id, after: { id: user.id, role: userRole, status: user.status } });
  return { token: app.jwt.sign({ id: user.id, role: userRole, email: user.email }), user: { id: user.id, name: user.name, email: user.email, role: userRole } };
}
export async function adminProducts(request: FastifyRequest) {
  const q = pageParams.parse(request.query);
  const rows = await db
    .select()
    .from(products)
    .where(
      and(q.search ? or(like(products.name, `%${q.search}%`), like(products.slug, `%${q.search}%`)) : undefined, q.status && q.status !== "all" ? eq(products.publicationStatus, q.status) : undefined),
    );
  const selected = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
  return Promise.all(selected.map(async (product) => publicProduct(product, await db.select().from(variants).where(eq(variants.productId, product.id)))));
}
export async function ensureCart(userId: string) {
  const existing = (await db.select().from(carts).where(eq(carts.userId, userId)).limit(1))[0];
  if (existing) return existing;
  const cart = { id: randomUUID(), userId, updatedAt: now() };
  await db.insert(carts).values(cart);
  return cart;
}
export async function cartResponse(userId: string) {
  const cart = await ensureCart(userId);

  const rows = await db
    .select({
      item: cartItems,
      variant: variants,
      product: products,
    })
    .from(cartItems)
    .innerJoin(variants, eq(cartItems.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(cartItems.cartId, cart.id));

  return {
    items: rows.map(({ item, variant, product }) => ({
      variantId: variant.id,
      productId: variant.productId,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      quantity: item.quantity,
      sellAsPieces: item.sellAsPieces,
      saleUnit: item.sellAsPieces ? "piece" : "record",
      priceKobo: item.sellAsPieces ? Math.floor((variant.priceKobo || 0) / variant.piecesPerPack) : variant.priceKobo,
      image: variant.image || product.image,
    })),
  };
}

export async function serializeOrder(order: typeof orders.$inferSelect) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items, subtotal: { formatted: `₦${(order.subtotalKobo / 100).toLocaleString("en-NG")}` }, total: { formatted: `₦${(order.totalKobo / 100).toLocaleString("en-NG")}` } };
}
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
