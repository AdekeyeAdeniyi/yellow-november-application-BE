import { z } from "zod";
import "dotenv/config";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  DB_SSL_CA: z.string().optional(),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z
    .string()
    .email()
    .optional()
    .transform((val) => val?.trim().toLowerCase()),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});
export type Env = z.infer<typeof schema>;
export const env = schema.parse(process.env);
