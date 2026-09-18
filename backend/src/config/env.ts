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
  // Optional so normal app startup never hard-fails without it — forgot-
  // password requests just fail with a clear 500 until this is set.
  RESEND_API_KEY: z.string().min(1).optional(),
  // Resend's shared sender works with no domain verification, so
  // forgot-password email works immediately in dev; swap in a verified
  // sender on the real domain once one exists.
  RESEND_FROM_EMAIL: z.string().min(1).default("DryveFit <onboarding@resend.dev>"),
  // Optional so normal app startup never hard-fails without it — food
  // search/logging just 500s with a clear message until this is set. Free
  // at api.data.gov/signup — no paid tier, unlike Nutritionix.
  USDA_API_KEY: z.string().min(1).optional(),
  // Optional so normal app startup never hard-fails without it — post
  // image uploads just fail with a clear error until all three are set.
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  // Every OAuth client ID this app has registered with Google — one per
  // platform, since each platform's Sign-In flow stamps the ID token's
  // `aud` claim with whichever client ID it used to request it (see
  // auth.service.ts's authenticateWithGoogle). All configured ones are
  // accepted as valid audiences; GOOGLE_ANDROID_CLIENT_ID stays unset
  // until an Android build exists. Optional so normal app startup never
  // hard-fails without it — Google sign-in just 501s with a clear
  // message until at least one is set.
  GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_WEB_CLIENT_ID: z.string().min(1).optional(),
  // Optional so normal app startup never hard-fails without it — YouTube
  // recipe imports just fail with a clear message until this is set. Free
  // (10,000 units/day) via a Google Cloud project with the YouTube Data
  // API v3 enabled.
  YOUTUBE_API_KEY: z.string().min(1).optional(),
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
