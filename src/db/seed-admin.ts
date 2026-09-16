import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "./client.js";
import { users } from "./schema.js";
import { hashPassword } from "../modules/auth/password.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Yellow November Administrator";

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set before running db:seed:admin.");
}
if (password.length < 8) {
  throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
}

const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
const passwordHash = await hashPassword(password);
const now = new Date();

if (existing) {
  await db.update(users).set({ name, passwordHash, role: "admin", status: "active", updatedAt: now }).where(eq(users.id, existing.id));
  console.log(`Admin account updated: ${email}`);
} else {
  await db.insert(users).values({
    id: randomUUID(),
    email,
    name,
    phone: null,
    passwordHash,
    role: "admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Admin account created: ${email}`);
}

await pool.end();
