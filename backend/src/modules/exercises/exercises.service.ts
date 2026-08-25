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

const normalize = (value: string): string => value.trim().toLowerCase();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export interface ExerciseSearchCandidate {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  score: number;
}

const MIN_CANDIDATE_SCORE = 0.3;
const MAX_CANDIDATES = 5;

// Used by the AI chat tool (search_exercises) to resolve a free-text
// exercise name against the real catalog BEFORE any log gets written —
// the model must call this and reason about the candidates/scores, rather
// than logging against a guessed or hallucinated exercise id. The catalog
// is small (~80 rows), so this scores every row in memory rather than
// needing a real search index.
//
// Scoring, highest first:
//  1.0  exact match (case-insensitive)
//  0.75 substring match, either direction ("bench" in "Barbell Bench
//       Press", or a longer typed name containing the catalog name)
//  else token-overlap: fraction of the query's own words found (as an
//       exact or prefix match) among the exercise name's words — handles
//       reordered/partial phrasing like "shoulder raises" for "Lateral
//       Shoulder Raise" that a substring check alone would miss, since
//       "shoulder raises" is not a substring of "Lateral Shoulder Raise"
//       (extra word "Lateral" in between, plural "raises" vs "Raise").
// exactMatch is only true for a real 1.0 score — the caller (the model)
// is instructed to still treat one clearly-ahead high-scoring candidate
// as safe to log directly, but that judgment call belongs to the model
// grounded in the actual scores, not baked into this function.
export const searchExercises = async (
  query: string,
): Promise<{ exactMatch: boolean; candidates: ExerciseSearchCandidate[] }> => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return { exactMatch: false, candidates: [] };

  const queryTokens = tokenize(query);
  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true, muscleGroup: true, equipment: true },
  });

  const scored = exercises.map((exercise) => {
    const normalizedName = normalize(exercise.name);
    let score: number;

    if (normalizedName === normalizedQuery) {
      score = 1;
    } else if (
      normalizedName.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedName)
    ) {
      score = 0.75;
    } else {
      const nameTokens = tokenize(exercise.name);
      const matchedTokens = queryTokens.filter((queryToken) =>
        nameTokens.some(
          (nameToken) =>
            nameToken.startsWith(queryToken) || queryToken.startsWith(nameToken),
        ),
      );
      score =
        queryTokens.length === 0
          ? 0
          : (matchedTokens.length / queryTokens.length) * 0.7;
    }

    return { ...exercise, score: Math.round(score * 100) / 100 };
  });

  const candidates = scored
    .filter((candidate) => candidate.score >= MIN_CANDIDATE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);

  return {
    exactMatch: candidates.length > 0 && candidates[0].score === 1,
    candidates,
  };
};

// Every exercise's DERIVED image bytes (static PNG vs. animated GIF are
// different encodings of the same source), keyed by name+variant. The
// catalog is small and fixed (~80 exercises), so this is bounded and
// never needs eviction. This is only an in-process fast path on top of
// the durable DB cache below (Exercise.imageBytes) — it resets on every
// restart, but the raw GIF bytes it derives from don't, so a restart
// costs a cheap local sharp conversion, never another WorkoutX request.
const imageCache = new Map<string, { buffer: Buffer; contentType: string }>();

// WorkoutX has no documented SLA — without a timeout, a hung upstream
// request would hang this proxy (and the user's modal) indefinitely
// instead of failing fast enough to show an error state.
const WORKOUTX_FETCH_TIMEOUT_MS = 8000;

// Fetches the actual image bytes server-side (WorkoutX requires an API key
// to load the GIF, not just to look it up) so the key never has to be
// exposed to the client — the frontend hits our own /image proxy instead.
//
// WorkoutX's free tier meters usage per UNIQUE gif fetched, not per
// request served — re-fetching the same exercise's gif on every server
// restart (routine during local dev, where the process restarts on every
// file save) burns through that quota for images we already have. Each
// exercise's raw gif bytes are fetched from WorkoutX at most ONCE, ever:
// persisted to Exercise.imageBytes the first time, and served from there
// (deriving the static/animated variant locally) on every request after.
export const getExerciseImage = async (
  exerciseName: string,
  animated: boolean = false,
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  const cacheKey = `${exerciseName}::${animated ? "animated" : "static"}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  const exercise = await prisma.exercise.findUnique({
    where: { name: exerciseName },
    select: { imageUrl: true, imageBytes: true },
  });

  if (!exercise?.imageUrl) return null;

  let rawGifBytes: Buffer;

  if (exercise.imageBytes) {
    rawGifBytes = Buffer.from(exercise.imageBytes);
  } else {
    if (!env.WORKOUTX_API_KEY) return null;

    let response: Response;
    try {
      response = await fetch(exercise.imageUrl, {
        headers: { "X-WorkoutX-Key": env.WORKOUTX_API_KEY },
        signal: AbortSignal.timeout(WORKOUTX_FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      console.warn(`WorkoutX image fetch failed for "${exerciseName}":`, err);
      return null;
    }

    if (!response.ok) return null;

    rawGifBytes = Buffer.from(await response.arrayBuffer());

    // Best-effort — a failed write here shouldn't stop the image (already
    // successfully fetched) from being served this one time; it just
    // means the next request re-fetches from WorkoutX instead of hitting
    // this cache.
    await prisma.exercise
      .update({
        where: { name: exerciseName },
        // Buffer.from(response.arrayBuffer()) types as Buffer<ArrayBufferLike>
        // (ArrayBuffer | SharedArrayBuffer); Prisma's Bytes field wants the
        // narrower Uint8Array<ArrayBuffer>. Always a real ArrayBuffer at
        // runtime here (it's fetch output, never a SharedArrayBuffer).
        data: { imageBytes: new Uint8Array(rawGifBytes) },
      })
      .catch((err) =>
        console.warn(
          `Failed to persist image bytes for "${exerciseName}":`,
          err,
        ),
      );
  }

  const image = animated
    ? // Pass the original animated GIF through untouched.
      { buffer: rawGifBytes, contentType: "image/gif" }
    : // WorkoutX only serves animated GIFs — sharp defaults to reading just
      // the first frame of a multi-frame input, so this gives us a static
      // image instead of an animation. Used for the small list thumbnail,
      // where a static frame is enough and keeps payload size down.
      {
        buffer: await sharp(rawGifBytes).png().toBuffer(),
        contentType: "image/png",
      };

  imageCache.set(cacheKey, image);
  return image;
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

// Used by the AI chat tool (get_personal_records) — best-ever estimated 1RM
// per exercise across the user's whole history, same Epley estimate as
// getExercise1RMHistory but rolled up per exercise instead of per day.
export const getPersonalRecordsForUser = async (userId: string) => {
  const logs = await prisma.exerciseLog.findMany({
    where: { workoutLog: { userId } },
    select: {
      exerciseName: true,
      sets: { select: { weight: true, reps: true } },
    },
  });

  const bestByExercise = new Map<string, number>();
  for (const log of logs) {
    for (const set of log.sets) {
      if (set.weight == null || set.reps == null) continue;
      const estimate = Math.round(set.weight * (1 + set.reps / 30));
      const current = bestByExercise.get(log.exerciseName) ?? 0;
      if (estimate > current) {
        bestByExercise.set(log.exerciseName, estimate);
      }
    }
  }

  return Array.from(bestByExercise.entries())
    .map(([exerciseName, estimated1RM]) => ({ exerciseName, estimated1RM }))
    .sort((a, b) => b.estimated1RM - a.estimated1RM);
};
