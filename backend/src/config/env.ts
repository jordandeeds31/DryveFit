import { z } from "zod";
import { config } from "dotenv";

config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("5787"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("30d"),
  OPENAI_API_KEY: z.string().min(1),
  // Used by the one-time scripts/fetchExerciseImages.ts backfill script and
  // by the live /api/exercises/image proxy (which fetches the actual GIF
  // bytes server-side so the key is never exposed to the client). Optional
  // so normal app startup never hard-fails without it — the proxy just
  // 404s if it's missing.
  WORKOUTX_API_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables: ",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
