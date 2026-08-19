import prisma from "./src/lib/prisma";
import { env } from "./src/config/env";

const WORKOUTX_BASE_URL = "https://api.workoutxapp.com/v1";
const DELAY_BETWEEN_REQUESTS_MS = 2500;

interface WorkoutXExercise {
  id: string;
  name: string;
  gifUrl: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const findExactMatch = (results: WorkoutXExercise[], exerciseName: string) =>
  results.find((r) => r.name.toLowerCase() === exerciseName.toLowerCase());

const normalizeWords = (text: string): string[] =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

const wordOverlapScore = (a: string[], b: string[]): number => {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

const MIN_FUZZY_SCORE = 0.5;

const findBestFuzzyMatch = (results: WorkoutXExercise[], exerciseName: string) => {
  const exact = findExactMatch(results, exerciseName);
  if (exact) return exact;
  if (results.length === 0) return undefined;
  const ourWords = normalizeWords(exerciseName);
  let best: { result: WorkoutXExercise; score: number } | null = null;
  for (const result of results) {
    const score = wordOverlapScore(ourWords, normalizeWords(result.name));
    if (!best || score > best.score) best = { result, score };
  }
  return best && best.score >= MIN_FUZZY_SCORE ? best.result : undefined;
};

const MAX_RATE_LIMIT_RETRIES = 5;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 65_000;

const searchByName = async (name: string): Promise<WorkoutXExercise[]> => {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const response = await fetch(
      `${WORKOUTX_BASE_URL}/exercises/name/${encodeURIComponent(name)}`,
      { headers: { "X-WorkoutX-Key": env.WORKOUTX_API_KEY! } },
    );

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : DEFAULT_RATE_LIMIT_BACKOFF_MS;
      console.warn(
        `Rate limited (429) for "${name}" — waiting ${Math.round(retryAfterMs / 1000)}s before retrying...`,
      );
      await sleep(retryAfterMs);
      continue;
    }

    if (!response.ok) {
      console.warn(`HTTP ${response.status} for "${name}"`);
      return [];
    }

    const body: { data: WorkoutXExercise[] } = await response.json();
    return body.data ?? [];
  }
  return [];
};

async function main() {
  if (!env.WORKOUTX_API_KEY) {
    console.error("WORKOUTX_API_KEY not set");
    process.exit(1);
  }

  const names = [
    "Dumbbell Incline Bench Press",
    "Cable Standing Up Straight Crossovers",
  ];

  for (const name of names) {
    const exercise = await prisma.exercise.findUnique({ where: { name } });
    if (!exercise) {
      console.log(`"${name}": no matching row in our catalog.`);
      continue;
    }

    console.log(`"${name}": current imageUrl = ${exercise.imageUrl}`);

    let candidates = await searchByName(name);
    console.log(`"${name}": WorkoutX candidates:`, candidates.map((c) => c.name));

    if (candidates.length === 0) {
      const words = name.split(/\s+/);
      if (words.length > 1) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
        const retryName = words.slice(1).join(" ");
        candidates = await searchByName(retryName);
        console.log(`"${name}": retry "${retryName}" candidates:`, candidates.map((c) => c.name));
      }
    }

    const match = findBestFuzzyMatch(candidates, name);

    if (!match) {
      console.warn(`"${name}": no match found on WorkoutX — leaving imageUrl as-is.`);
      continue;
    }

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { imageUrl: match.gifUrl },
    });
    console.log(`"${name}": updated imageUrl -> matched WorkoutX exercise "${match.name}" (${match.gifUrl})`);

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }
}

main().finally(() => prisma.$disconnect());
