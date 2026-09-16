import type { FastifyInstance } from "fastify";
import { registerBulkControllers } from "./controller.js";

/** HTTP route registration for the bulk bounded context. */
export async function registerBulkRoutes(app: FastifyInstance) {
  await registerBulkControllers(app);
}
