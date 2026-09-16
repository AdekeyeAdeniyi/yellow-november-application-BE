import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { readFileSync } from "node:fs";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

const ssl = {
  minVersion: "TLSv1.2" as const,
  rejectUnauthorized: true,

  // Optional. Used when DB_SSL_CA is defined in .env.
  ...(env.DB_SSL_CA
    ? {
        ca: readFileSync(env.DB_SSL_CA, "utf8"),
      }
    : {}),
};

export const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  ssl,
  connectionLimit: env.DB_POOL_SIZE,
  enableKeepAlive: true,
});

export const db = drizzle(pool, {
  schema,
  mode: "default",
});
