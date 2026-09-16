import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

const ssl = {
  minVersion: "TLSv1.2" as const,
  rejectUnauthorized: true,

  // Pass the string directly and format escaped line breaks
  ...(env.DB_SSL_CA
    ? {
        ca: env.DB_SSL_CA.replace(/\\n/g, "\n"),
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
