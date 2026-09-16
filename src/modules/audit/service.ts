import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { auditLogs } from "../../db/schema.js";
import type { AuthRequest } from "../../shared/context.js";

export type AuditAction =
  | "auth.signup" | "auth.login.success" | "auth.login.failure"
  | "product.created" | "product.updated" | "product.archived"
  | "category.created" | "category.updated" | "category.deleted"
  | "inventory.adjusted" | "order.created" | "order.status_changed"
  | "bulk_enquiry.created";

export type AuditEvent = {
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

const sensitiveKeys = new Set(["password", "passwordHash", "token", "authorization", "cookie"]);
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sensitiveKeys.has(key) ? "[REDACTED]" : redact(child)]));
}

export async function writeAudit(request: FastifyRequest, event: AuditEvent) {
  const auth = request as Partial<AuthRequest>;
  const actor = auth.user;
  await db.insert(auditLogs).values({
    id: randomUUID(), actorUserId: actor?.id || null, actorRole: actor?.role || null,
    action: event.action, entityType: event.entityType, entityId: event.entityId || null,
    requestId: request.id, ipAddress: request.ip || null,
    userAgent: request.headers["user-agent"] || null,
    before: event.before ? redact(event.before) as Record<string, unknown> : null,
    after: event.after ? redact(event.after) as Record<string, unknown> : null,
    metadata: redact(event.metadata || {}) as Record<string, unknown>, createdAt: new Date(),
  });
}
