import type { FastifyInstance } from "fastify";
import { registerInventoryControllers } from "./controller.js";

/** HTTP route registration for the inventory bounded context. */
export async function registerInventoryRoutes(app: FastifyInstance) {
  await registerInventoryControllers(app);
}
