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

  // WorkoutX only serves animated GIFs — sharp defaults to reading just the
  // first frame of a multi-frame input, so this gives us a static image
  // instead of an animation.
  const pngBuffer = await sharp(Buffer.from(arrayBuffer)).png().toBuffer();

  return {
    buffer: pngBuffer,
    contentType: "image/png",
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

  return logs.map((log) => {
    // Use the heaviest estimated 1RM among that session's sets
    const best1RM = Math.max(
      ...log.sets
        .filter((set) => set.weight != null && set.reps != null)
        .map((set) => Math.round(set.weight! * (1 + set.reps! / 30))),
    );

    return {
      date: log.workoutLog.loggedAt,
      estimated1RM: best1RM,
      sets: log.sets,
    };
  });
};
