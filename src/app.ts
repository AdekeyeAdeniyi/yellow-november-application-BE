import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { env } from "./config/env.js";
import core from "./plugins/core.js";
import observability from "./plugins/observability.js";
import { registerRoutes } from "./routes.js";

export async function buildApp() { const app = Fastify({ logger: { level: env.LOG_LEVEL, transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined }, requestIdHeader: "x-request-id", genReqId: () => randomUUID() }); await app.register(core); await app.register(observability); await registerRoutes(app); return app; }
