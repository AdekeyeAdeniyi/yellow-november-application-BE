import type { FastifyInstance } from "fastify";
import { registerCartControllers } from "./controller.js";

/** HTTP route registration for the cart bounded context. */
export async function registerCartRoutes(app: FastifyInstance) {
  await registerCartControllers(app);
}
