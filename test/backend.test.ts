import { beforeAll, afterAll, describe, expect, it } from "vitest";
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt-auth";
process.env.DATABASE_URL = "mysql://test:test@127.0.0.1:3306/yellow";
process.env.NODE_ENV = "test";
const { buildApp } = await import("../src/app.js");
const { hashPassword, verifyPassword } = await import("../src/modules/auth/password.js");
let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => { app = await buildApp(); });
afterAll(async () => { await app.close(); });
describe("backend foundations", () => {
  it("hashes and verifies passwords without storing plaintext", async () => { const hash = await hashPassword("correct horse battery staple"); expect(hash).not.toContain("correct horse"); expect(await verifyPassword("correct horse battery staple", hash)).toBe(true); expect(await verifyPassword("wrong password", hash)).toBe(false); });
  it("exposes liveness and metrics endpoints", async () => { const live = await app.inject({ method: "GET", url: "/health/live" }); expect(live.statusCode).toBe(200); expect(live.json()).toEqual({ status: "ok" }); const metrics = await app.inject({ method: "GET", url: "/metrics" }); expect(metrics.statusCode).toBe(200); });
  it("rejects protected endpoints without a token", async () => { const response = await app.inject({ method: "GET", url: "/saved-products" }); expect(response.statusCode).toBe(401); expect(response.json().code).toBe("UNAUTHORIZED"); });
});
