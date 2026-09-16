import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();
await app.listen({ port: env.PORT, host: env.HOST });
const shutdown = async () => { await app.close(); process.exit(0); };
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
