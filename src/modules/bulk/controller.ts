import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../../db/client.js";
import { bulkEnquiries, cartItems, carts, categories, inventoryMovements, orderItems, orders, products, savedProducts, users, variants } from "../../db/schema.js";
import { AuthRequest, availability, cartResponse, ensureCart, findCategory, findProduct, inventoryUnits, login, now, pageParams, productInput, publicProduct, serializeOrder, slugify, adminProducts } from "../../shared/context.js";
import { writeAudit } from "../audit/service.js";

export async function registerBulkControllers(app: FastifyInstance) {
  app.post("/bulk-enquiries", async (request, reply) => { const input = z.object({ name: z.string().min(2), company: z.string().optional(), email: z.string().email(), phone: z.string().min(7), items: z.array(z.object({ productId: z.string(), variantId: z.string(), quantity: z.number().int().positive(), unit: z.string() })).min(1), location: z.string().min(3), date: z.string().min(4), packaging: z.string().optional(), requirements: z.string().optional() }).parse(request.body); const enquiry = { id: randomUUID(), enquiryNumber: `ENQ-${Date.now().toString().slice(-8)}`, status: "submitted", contact: { name: input.name, company: input.company || "", email: input.email, phone: input.phone }, items: input.items, delivery: { location: input.location, date: input.date, packaging: input.packaging || "", requirements: input.requirements || "" }, createdAt: now() }; await db.insert(bulkEnquiries).values(enquiry); await writeAudit(request, { action: "bulk_enquiry.created", entityType: "bulk_enquiry", entityId: enquiry.id, after: { enquiryNumber: enquiry.enquiryNumber, status: enquiry.status }, metadata: { itemCount: input.items.length, email: input.email } }); return reply.code(201).send(enquiry); });
}
