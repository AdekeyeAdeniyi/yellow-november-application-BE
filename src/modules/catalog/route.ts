import type { FastifyInstance } from "fastify";
import { registerCatalogControllers } from "./controller.js";

/** HTTP route registration for the catalog bounded context. */
export async function registerCatalogRoutes(app: FastifyInstance) {
  await registerCatalogControllers(app);
}
