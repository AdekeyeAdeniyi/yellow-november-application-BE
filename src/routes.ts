import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./modules/auth/route.js";
import { registerCatalogRoutes } from "./modules/catalog/route.js";
import { registerCategoryRoutes } from "./modules/categories/route.js";
import { registerProductRoutes } from "./modules/products/route.js";
import { registerInventoryRoutes } from "./modules/inventory/route.js";
import { registerSavedRoutes } from "./modules/saved/route.js";
import { registerCartRoutes } from "./modules/cart/route.js";
import { registerOrderRoutes } from "./modules/orders/route.js";
import { registerBulkRoutes } from "./modules/bulk/route.js";
import { registerAuditRoutes } from "./modules/audit/route.js";

export async function registerRoutes(app: FastifyInstance) {
  await registerAuthRoutes(app);
  await registerCatalogRoutes(app);
  await registerCategoryRoutes(app);
  await registerProductRoutes(app);
  await registerInventoryRoutes(app);
  await registerSavedRoutes(app);
  await registerCartRoutes(app);
  await registerOrderRoutes(app);
  await registerBulkRoutes(app);
  await registerAuditRoutes(app);
}
