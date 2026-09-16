import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, lte, like, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { auditLogs } from "../../db/schema.js";

const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25), action: z.string().trim().optional(), entityType: z.string().trim().optional(), actorUserId: z.string().trim().optional(), entityId: z.string().trim().optional(), search: z.string().trim().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() });
export async function registerAuditControllers(app: FastifyInstance) {
  app.get("/admin/audit-logs", { preHandler: app.requireAdmin }, async (request) => {
    const q = querySchema.parse(request.query);
    const filters = [q.action ? eq(auditLogs.action, q.action) : undefined, q.entityType ? eq(auditLogs.entityType, q.entityType) : undefined, q.actorUserId ? eq(auditLogs.actorUserId, q.actorUserId) : undefined, q.entityId ? eq(auditLogs.entityId, q.entityId) : undefined, q.from ? gte(auditLogs.createdAt, q.from) : undefined, q.to ? lte(auditLogs.createdAt, q.to) : undefined, q.search ? or(like(auditLogs.action, `%${q.search}%`), like(auditLogs.entityType, `%${q.search}%`), like(auditLogs.entityId, `%${q.search}%`), like(auditLogs.requestId, `%${q.search}%`)) : undefined].filter(Boolean);
    const where = filters.length ? and(...filters) : undefined;
    const rows = await db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
    return { items: rows, page: q.page, pageSize: q.pageSize, hasMore: rows.length === q.pageSize };
  });
  app.get("/admin/audit-logs/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const id = z.object({ id: z.string().uuid() }).parse(request.params).id;
    const row = (await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1))[0];
    if (!row) return reply.code(404).send({ code: "NOT_FOUND", message: "Audit record not found.", details: null });
    return row;
  });
}
