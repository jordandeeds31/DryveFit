// One-time backfill script — NOT called at request time. Looks up every
// seeded exercise by name against the WorkoutX API (https://workoutxapp.com)
// and stores its gifUrl in Exercise.imageUrl. Run with:
//   npx tsx src/scripts/fetchExerciseImages.ts
import prisma from "../lib/prisma";
import { env } from "../config/env";

const WORKOUTX_BASE_URL = "https://api.workoutxapp.com/v1";

// Free tier allows 30 requests/minute — stay comfortably under that.
const DELAY_BETWEEN_REQUESTS_MS = 2500;
const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 65_000;

interface WorkoutXExercise {
  id: string;
  name: string;
  gifUrl: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const findExactMatch = (
  results: WorkoutXExercise[],
  exerciseName: string,
): WorkoutXExercise | undefined =>
  results.find(
    (result) => result.name.toLowerCase() === exerciseName.toLowerCase(),
  );

const normalizeWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const wordOverlapScore = (a: string[], b: string[]): number => {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((word) => setB.has(word)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

// Requires at least half the combined word set to overlap — loose enough to
// bridge naming differences (equipment prefixes, word order) but not so
// loose it'll pick a wildly unrelated exercise.
const MIN_FUZZY_SCORE = 0.5;

// Best-effort fuzzy match: picks the single highest word-overlap-scoring
// candidate above a minimum threshold. Unlike a strict/unambiguous match,
// this WILL sometimes attach a similar-but-not-identical exercise's image
// (e.g. a specific grip variant) — an accepted tradeoff for recovering more
// images, per explicit user confirmation.
const findBestFuzzyMatch = (
  results: WorkoutXExercise[],
  exerciseName: string,
): WorkoutXExercise | undefined => {
  const exact = findExactMatch(results, exerciseName);
  if (exact) return exact;

  if (results.length === 0) return undefined;

  const ourWords = normalizeWords(exerciseName);
  let best: { result: WorkoutXExercise; score: number } | null = null;

  for (const result of results) {
    const score = wordOverlapScore(ourWords, normalizeWords(result.name));
    if (!best || score > best.score) {
      best = { result, score };
    }
  }

  return best && best.score >= MIN_FUZZY_SCORE ? best.result : undefined;
};

// Fetches with automatic backoff-and-retry on HTTP 429, honoring the
// Retry-After header when the API sends one.
const fetchWithRateLimitRetry = async (
  url: string,
  apiKey: string,
): Promise<Response> => {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: { "X-WorkoutX-Key": apiKey },
    });

    if (response.status !== 429 || attempt === MAX_RATE_LIMIT_RETRIES) {
      return response;
    }

    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1000
      : DEFAULT_RATE_LIMIT_BACKOFF_MS;

    console.warn(
      `Rate limited (429) — waiting ${Math.round(retryAfterMs / 1000)}s before retrying...`,
    );
    await sleep(retryAfterMs);
  }

  // Unreachable, but keeps TypeScript satisfied.
  throw new Error("Exceeded rate-limit retries");
};

async function main() {
  if (!env.WORKOUTX_API_KEY) {
    console.error(
      "WORKOUTX_API_KEY is not set in .env — get one at https://api.workoutxapp.com/dashboard.html#register and add it before running this script.",
    );
    process.exit(1);
  }

  // Resumable — only look up exercises that don't already have an image,
  // so re-running after a rate limit doesn't waste quota re-fetching ones
  // that already succeeded.
  const exercises = await prisma.exercise.findMany({
    where: { imageUrl: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  console.log(`Looking up images for ${exercises.length} exercises...`);

  let matched = 0;
  let notFound = 0;
  let errored = 0;

  const searchByName = async (
    name: string,
  ): Promise<{ ok: true; data: WorkoutXExercise[] } | { ok: false; status: number }> => {
    const response = await fetchWithRateLimitRetry(
      `${WORKOUTX_BASE_URL}/exercises/name/${encodeURIComponent(name)}`,
      env.WORKOUTX_API_KEY!,
    );

    if (response.status === 401 || response.status === 403) {
      console.error(
        `Authentication failed (HTTP ${response.status}) — check that WORKOUTX_API_KEY is valid. Aborting.`,
      );
      process.exit(1);
    }

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const body: { data: WorkoutXExercise[] } = await response.json();
    return { ok: true, data: body.data ?? [] };
  };

  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];

    try {
      const result = await searchByName(exercise.name);

      if (!result.ok) {
        console.warn(
          `[${i + 1}/${exercises.length}] "${exercise.name}": HTTP ${result.status} — leaving imageUrl unset.`,
        );
        notFound++;
        continue;
      }

      let candidates = result.data;

      // A completely empty result usually means the leading word is an
      // equipment/stance qualifier WorkoutX doesn't use (e.g. our "Seated
      // Cable Row" vs their "Cable Row") — retry once with it dropped.
      const nameWords = exercise.name.split(/\s+/);
      if (candidates.length === 0 && nameWords.length > 1) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
        const retryName = nameWords.slice(1).join(" ");
        const retryResult = await searchByName(retryName);
        if (retryResult.ok) {
          candidates = retryResult.data;
        }
      }

      const match = findBestFuzzyMatch(candidates, exercise.name);

      if (!match) {
        console.warn(
          `[${i + 1}/${exercises.length}] "${exercise.name}": no match found — leaving imageUrl unset.`,
        );
        notFound++;
        continue;
      }

      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { imageUrl: match.gifUrl },
      });

      console.log(`[${i + 1}/${exercises.length}] "${exercise.name}": matched.`);
      matched++;
    } catch (error) {
      console.warn(
        `[${i + 1}/${exercises.length}] "${exercise.name}": request failed (${(error as Error).message}) — leaving imageUrl unset.`,
      );
      errored++;
    }

    if (i < exercises.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log(
    `\nDone. Matched: ${matched}, no match: ${notFound}, errors: ${errored}, total: ${exercises.length}.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
