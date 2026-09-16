import { migrate } from "drizzle-orm/mysql2/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db, pool } from "./client.js";

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

await migrate(db, { migrationsFolder });

await pool.end();

console.log(`Database migrations applied from ${migrationsFolder}.`);
