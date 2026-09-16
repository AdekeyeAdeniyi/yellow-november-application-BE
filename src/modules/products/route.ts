import type { FastifyInstance } from "fastify";
import { registerProductControllers } from "./controller.js";

/** HTTP route registration for the products bounded context. */
export async function registerProductRoutes(app: FastifyInstance) {
  await registerProductControllers(app);
}
