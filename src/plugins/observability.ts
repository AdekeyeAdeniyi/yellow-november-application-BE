import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import client from "prom-client";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
export default fp(async (app: FastifyInstance) => {
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_request, reply) => { try { await db.execute(sql`SELECT 1`); return { status: "ready" }; } catch { return reply.code(503).send({ status: "not_ready" }); } });
  app.get("/metrics", async (_request, reply) => { reply.header("Content-Type", registry.contentType); return registry.metrics(); });
});
