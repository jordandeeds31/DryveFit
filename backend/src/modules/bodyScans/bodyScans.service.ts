import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import { env } from "../../config/env";

// Matches WorkoutX's own gender enum, and nutrition.service.ts's identical
// constant — the app only ever collects/validates these two values.
const VALID_GENDERS = ["male", "female"] as const;
type Gender = (typeof VALID_GENDERS)[number];

// Same conversion constants as nutrition.service.ts's updateNutritionProfile.
const KG_PER_LB = 0.453592;
const CM_PER_INCH = 2.54;

const SCAN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// WorkoutX's docs cite a ~2.7s average response time, but that's an
// average, not a cap — this is a paid, user-initiated request (unlike
// exercises.service.ts's lightweight 8s GIF-fetch timeout), so a generous
// ceiling is used instead of failing a slow-but-real response early.
const WORKOUTX_SCAN_TIMEOUT_MS = 25000;

// Duplicated from nutrition.service.ts's calculateAge rather than
// imported — an 8-line pure function with no shared state, kept local so
// this module doesn't need a cross-module dependency for it.
const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthdate.getMonth() ||
    (today.getMonth() === birthdate.getMonth() &&
      today.getDate() >= birthdate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
};

const formatRemaining = (ms: number): string => {
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
};

interface BodyScanOverrides {
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: string;
}

interface WorkoutXScanResponse {
  body_fat_percentage: number;
  body_fat_category: string;
  lean_mass_kg: number;
  muscle_score: number;
  body_type: string;
  symmetry_score: number;
  fitness_score: number;
  posture_notes: unknown;
  circumferences: unknown;
  confidence_score: number;
  bmi: number;
}

export const createBodyScan = async (
  userId: string,
  photoBuffer: Buffer,
  overrides: BodyScanOverrides,
) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { gender: true, weightLbs: true, heightInches: true, birthdate: true },
  });

  const heightCm =
    overrides.heightCm ??
    (user.heightInches ? Math.round(user.heightInches * CM_PER_INCH) : undefined);
  const weightKg =
    overrides.weightKg ??
    (user.weightLbs ? Math.round(user.weightLbs * KG_PER_LB) : undefined);
  const age =
    overrides.age ?? (user.birthdate ? calculateAge(user.birthdate) : undefined);
  const gender = overrides.gender ?? user.gender ?? undefined;

  const missing: string[] = [];
  if (heightCm === undefined) missing.push("height");
  if (weightKg === undefined) missing.push("weight");
  if (age === undefined) missing.push("age");
  if (gender === undefined) missing.push("gender");
  if (missing.length > 0) {
    throw new AppError(400, `Missing required info for a Body Scan: ${missing.join(", ")}`);
  }
  if (!VALID_GENDERS.includes(gender as Gender)) {
    throw new AppError(400, "gender must be male or female");
  }
  if (heightCm! < 50 || heightCm! > 275) {
    throw new AppError(400, "Height must be between 50cm and 275cm");
  }
  if (weightKg! < 20 || weightKg! > 450) {
    throw new AppError(400, "Weight must be between 20kg and 450kg");
  }
  if (!Number.isInteger(age!) || age! < 13 || age! > 120) {
    throw new AppError(400, "Age must be between 13 and 120");
  }

  const lastScan = await prisma.bodyScan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastScan) {
    const elapsedMs = Date.now() - lastScan.createdAt.getTime();
    if (elapsedMs < SCAN_COOLDOWN_MS) {
      throw new AppError(
        429,
        `You can do one Body Scan every 7 days. Try again in ${formatRemaining(SCAN_COOLDOWN_MS - elapsedMs)}.`,
      );
    }
  }

  if (!env.WORKOUTX_API_KEY) {
    throw new AppError(503, "Body Scan isn't configured yet — missing WorkoutX API key.");
  }

  const formData = new FormData();
  // Buffer<ArrayBufferLike> isn't assignable to BlobPart (same underlying
  // Buffer/Uint8Array typing mismatch as exercises.service.ts's imageBytes
  // write) — always a real ArrayBuffer at runtime here (multer's memory
  // storage buffer, never a SharedArrayBuffer).
  formData.append(
    "photo",
    new Blob([new Uint8Array(photoBuffer)], { type: "image/jpeg" }),
    "scan.jpg",
  );
  formData.append("height_cm", String(heightCm));
  formData.append("weight_kg", String(weightKg));
  formData.append("age", String(age));
  formData.append("gender", gender as Gender);

  let response: Response;
  try {
    response = await fetch("https://api.workoutxapp.com/v1/scan", {
      method: "POST",
      headers: { "X-WorkoutX-Key": env.WORKOUTX_API_KEY },
      body: formData,
      signal: AbortSignal.timeout(WORKOUTX_SCAN_TIMEOUT_MS),
    });
  } catch (err) {
    console.warn("WorkoutX body scan request failed:", err);
    throw new AppError(502, "Body Scan service didn't respond in time — try again in a moment.");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // WORKOUTX_API_KEY is confirmed working for the separate exercise-GIF
      // product (see exercises.service.ts) — it's unconfirmed whether the
      // same account is provisioned/billed for the Body Scan product too.
      // A 401/403 here most likely means it isn't, so this is surfaced
      // distinctly rather than as a generic failure.
      throw new AppError(
        502,
        "Body Scan isn't available right now — this WorkoutX account may not be provisioned for Body Scan credits yet.",
      );
    }
    throw new AppError(502, `Body Scan request failed (${response.status}).`);
  }

  const result = (await response.json()) as WorkoutXScanResponse;

  return prisma.bodyScan.create({
    data: {
      userId,
      heightCm: heightCm!,
      weightKg: weightKg!,
      age: age!,
      gender: gender as Gender,
      bodyFatPercentage: result.body_fat_percentage,
      bodyFatCategory: result.body_fat_category,
      leanMassKg: result.lean_mass_kg,
      muscleScore: result.muscle_score,
      bodyType: result.body_type,
      symmetryScore: result.symmetry_score,
      fitnessScore: result.fitness_score,
      postureNotes: result.posture_notes as object,
      circumferences: result.circumferences as object,
      confidenceScore: result.confidence_score,
      bmi: result.bmi,
    },
  });
};

export const getBodyScanHistory = (userId: string) =>
  prisma.bodyScan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
