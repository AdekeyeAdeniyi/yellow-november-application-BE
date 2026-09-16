import type { FastifyInstance } from "fastify";
import { registerCategoryControllers } from "./controller.js";

/** HTTP route registration for the categories bounded context. */
export async function registerCategoryRoutes(app: FastifyInstance) {
  await registerCategoryControllers(app);
}
