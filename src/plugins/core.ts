import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import underPressure from "@fastify/under-pressure";
import jwt from "@fastify/jwt";
import { env } from "../config/env.js";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export type AuthUser = { id: string; role: "customer" | "admin"; email: string };
declare module "@fastify/jwt" { interface FastifyJWT { payload: AuthUser; user: AuthUser; } }
declare module "fastify" { interface FastifyInstance { authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>; requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>; } }
export default fp(async (app: FastifyInstance) => {
  await app.register(helmet);
  await app.register(cors, { origin: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()), credentials: true });
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW });
  await app.register(underPressure, { maxEventLoopDelay: 1000, maxHeapUsedBytes: 500_000_000 });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: "2h" } });
  app.decorate("authenticate", async (request, reply) => { try { request.user = await request.jwtVerify<AuthUser>(); const user = (await db.select({ id: users.id, role: users.role, email: users.email, status: users.status }).from(users).where(eq(users.id, request.user.id)).limit(1))[0]; if (!user || user.status !== "active" || user.role !== request.user.role) return reply.code(401).send({ code: "UNAUTHORIZED", message: "Authentication is required.", details: null }); } catch { return reply.code(401).send({ code: "UNAUTHORIZED", message: "Authentication is required.", details: null }); } });
  app.decorate("requireAdmin", async (request, reply) => { await app.authenticate(request, reply); if (reply.sent) return; if ((request.user as AuthUser).role !== "admin") return reply.code(403).send({ code: "FORBIDDEN", message: "Administrator access is required.", details: null }); });
  app.setErrorHandler((error: FastifyError, request, reply) => { request.log.error({ err: error, requestId: request.id }, "request failed"); const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500; reply.code(status).send({ code: status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR", message: status === 500 ? "An unexpected server error occurred." : error.message, details: null }); });
});
