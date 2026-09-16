import type { FastifyInstance } from "fastify";
import { registerAuditControllers } from "./controller.js";
export async function registerAuditRoutes(app: FastifyInstance) { await registerAuditControllers(app); }
