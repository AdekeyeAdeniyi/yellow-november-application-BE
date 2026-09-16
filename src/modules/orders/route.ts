import type { FastifyInstance } from "fastify";
import { registerOrderControllers } from "./controller.js";

/** HTTP route registration for the orders bounded context. */
export async function registerOrderRoutes(app: FastifyInstance) {
  await registerOrderControllers(app);
}
