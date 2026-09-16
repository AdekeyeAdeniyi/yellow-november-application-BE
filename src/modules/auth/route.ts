import type { FastifyInstance } from "fastify";
import { registerAuthControllers } from "./controller.js";

/** HTTP route registration for the auth bounded context. */
export async function registerAuthRoutes(app: FastifyInstance) {
  await registerAuthControllers(app);
}
