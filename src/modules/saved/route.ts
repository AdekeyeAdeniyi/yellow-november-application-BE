import type { FastifyInstance } from "fastify";
import { registerSavedControllers } from "./controller.js";

/** HTTP route registration for the saved bounded context. */
export async function registerSavedRoutes(app: FastifyInstance) {
  await registerSavedControllers(app);
}
