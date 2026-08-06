import sharp from "sharp";
import prisma from "../../lib/prisma";
import { env } from "../../config/env";

// The client should never see the raw WorkoutX URL directly — it requires
// an API key to actually load, which we don't want exposed client-side.
// Point it at our own authenticated proxy instead.
//
// "v=2" is a cache-buster: the proxy response is served with a long
// Cache-Control lifetime, so bump this whenever what the proxy returns for
// the same name changes shape (e.g. switching from animated GIF to static
// PNG) — otherwise clients keep serving their old cached bytes forever for
// the exact same URL.
export const toProxiedImagePath = (
  exerciseName: string,
  hasImage: boolean,
): string | null =>
  hasImage
    ? `/api/exercises/image?name=${encodeURIComponent(exerciseName)}&v=2`
    : null;

export const getAllExercises = async () => {
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
  });

  return exercises.map((exercise) => ({
    ...exercise,
    imageUrl: toProxiedImagePath(exercise.name, exercise.imageUrl != null),
  }));
};

// Fetches the actual image bytes server-side (WorkoutX requires an API key
// to load the GIF, not just to look it up) so the key never has to be
// exposed to the client — the frontend hits our own /image proxy instead.
export const getExerciseImage = async (
  exerciseName: string,
  animated: boolean = false,
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  if (!env.WORKOUTX_API_KEY) return null;

  const exercise = await prisma.exercise.findUnique({
    where: { name: exerciseName },
    select: { imageUrl: true },
  });

  if (!exercise?.imageUrl) return null;

  const response = await fetch(exercise.imageUrl, {
    headers: { "X-WorkoutX-Key": env.WORKOUTX_API_KEY },
  });

  if (!response.ok) return null;

  const arrayBuffer = await response.arrayBuffer();

  if (animated) {
    // Pass the original animated GIF through untouched.
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: "image/gif",
    };
  }

  // WorkoutX only serves animated GIFs — sharp defaults to reading just the
  // first frame of a multi-frame input, so this gives us a static image
  // instead of an animation. Used for the small list thumbnail, where a
  // static frame is enough and keeps payload size down.
  const pngBuffer = await sharp(Buffer.from(arrayBuffer)).png().toBuffer();

  return {
    buffer: pngBuffer,
    contentType: "image/png",
  };
};

// The most recent logged session for an exercise, set-by-set — powers the
// "Check Previous Workout" button so a user doesn't have to navigate back
// to an earlier day just to see what weight/reps they used last time.
export const getPreviousSession = async (
  userId: string,
  exerciseName: string,
  beforeDateStr?: string,
) => {
  const beforeDate = beforeDateStr ? new Date(beforeDateStr) : undefined;

  const log = await prisma.exerciseLog.findFirst({
    where: {
      exerciseName,
      workoutLog: {
        userId,
        ...(beforeDate ? { loggedAt: { lt: beforeDate } } : {}),
      },
    },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      workoutLog: { select: { loggedAt: true } },
    },
    orderBy: { workoutLog: { loggedAt: "desc" } },
  });

  if (!log) return null;

  return {
    date: log.workoutLog.loggedAt,
    sets: log.sets.map((set) => ({
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
    })),
  };
};

export const getExercise1RMHistory = async (
  userId: string,
  exerciseName: string,
) => {
  const logs = await prisma.exerciseLog.findMany({
    where: {
      exerciseName,
      workoutLog: { userId },
    },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      workoutLog: { select: { loggedAt: true } },
    },
    orderBy: { workoutLog: { loggedAt: "asc" } },
  });

  // Multiple ExerciseLog rows can land on the same calendar day (e.g. one
  // from a program day plus one from a standalone log), which would
  // otherwise plot two points for the same date and make the line zig-zag.
  // Key by day and keep only the best estimate per day.
  const bestByDay = new Map<
    string,
    { date: Date; estimated1RM: number; sets: (typeof logs)[number]["sets"] }
  >();

  for (const log of logs) {
    const estimates = log.sets
      .filter((set) => set.weight != null && set.reps != null)
      .map((set) => Math.round(set.weight! * (1 + set.reps! / 30)));

    // No external load logged for this session at all (e.g. a bodyweight
    // exercise, which has no meaningful 1RM) — Math.max() on an empty
    // array would silently produce -Infinity, so skip the session
    // entirely rather than plotting a broken data point.
    if (estimates.length === 0) continue;

    const estimated1RM = Math.max(...estimates);
    const dayKey = log.workoutLog.loggedAt.toISOString().slice(0, 10);
    const existing = bestByDay.get(dayKey);

    if (!existing || estimated1RM > existing.estimated1RM) {
      bestByDay.set(dayKey, {
        date: log.workoutLog.loggedAt,
        estimated1RM,
        sets: log.sets,
      });
    }
  }

  return Array.from(bestByDay.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
};
