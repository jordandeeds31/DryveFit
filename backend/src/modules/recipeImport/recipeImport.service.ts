import prisma from "../../lib/prisma";
import { SavedRecipe } from "../../generated/prisma/client";
import openai from "../../lib/openai";
import AppError from "../../utils/AppError";
import {
  fetchTikTokCaption,
  fetchTikTokTranscript,
  TikTokCaptionErrorReason,
} from "../../lib/tiktok";
import {
  fetchYouTubeCaption,
  fetchYouTubeTranscript,
  YouTubeCaptionErrorReason,
} from "../../lib/youtube";
import { estimateRecipeMacros, logFood, MealType } from "../nutrition/nutrition.service";

export type RecipeImportPlatform = "tiktok" | "youtube";

const URL_IN_TEXT_PATTERN = /https?:\/\/\S+/;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)\]}'"]+$/;

// The OS share sheet doesn't always hand back a clean URL — sharing
// directly from inside the TikTok/YouTube app (rather than from Safari)
// commonly bundles the link into a caption-style blob ("Check out this
// recipe! https://vt.tiktok.com/xyz via @user"), which a strict
// `new URL(rawUrl)` would otherwise reject outright even though a real
// link is right there in the text.
export const extractUrl = (rawInput: string): string => {
  const match = rawInput.match(URL_IN_TEXT_PATTERN);
  if (!match) return rawInput;
  return match[0].replace(TRAILING_PUNCTUATION_PATTERN, "");
};

export const detectPlatform = (rawUrl: string): RecipeImportPlatform | null => {
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    return null;
  }

  // Instagram is deliberately not recognized yet, even though its URLs are
  // easy to detect — its oEmbed requires a Meta App ID/access token and
  // app review; there is no unauthenticated arbitrary-post fetch, and
  // scraping it directly would violate this feature's own no-crawling
  // guardrail. Adding it means either going through that review process
  // or accepting a real legal/ToS tradeoff — not just recognizing its
  // domain and writing a fetcher.
  if (hostname.endsWith("tiktok.com")) return "tiktok";
  if (hostname.endsWith("youtube.com") || hostname === "youtu.be") return "youtube";
  return null;
};

// Recognizing the domain (unlike detectPlatform above) is all this needs —
// it's only used to pick a more specific error message than "unsupported
// platform" below, not to attempt a fetch.
const isInstagramUrl = (rawUrl: string): boolean => {
  try {
    return new URL(rawUrl).hostname.endsWith("instagram.com");
  } catch {
    return false;
  }
};

export type CaptionErrorReason =
  | TikTokCaptionErrorReason
  | YouTubeCaptionErrorReason
  | "unsupported_platform";

interface CaptionFetchSuccess {
  ok: true;
  videoId: string;
  canonicalUrl: string;
  caption: string;
  thumbnailUrl: string | null;
}
interface CaptionFetchError {
  ok: false;
  reason: CaptionErrorReason;
  message: string;
}
type CaptionFetchOutcome = CaptionFetchSuccess | CaptionFetchError;

// One dispatcher per supported platform — adding TikTok's audio/website
// fallback later, or another platform, means adding a branch here and a
// new lib/ fetcher, not touching the orchestration in importRecipeFromLink
// below.
const fetchCaption = async (
  platform: RecipeImportPlatform,
  url: string,
): Promise<CaptionFetchOutcome> => {
  if (platform === "tiktok") {
    const result = await fetchTikTokCaption(url);
    if (!result.ok) {
      return { ok: false, reason: result.reason, message: result.message };
    }
    return {
      ok: true,
      videoId: result.videoId,
      canonicalUrl: result.canonicalUrl,
      caption: result.caption,
      thumbnailUrl: result.thumbnailUrl,
    };
  }
  if (platform === "youtube") {
    const result = await fetchYouTubeCaption(url);
    if (!result.ok) {
      return { ok: false, reason: result.reason, message: result.message };
    }
    return {
      ok: true,
      videoId: result.videoId,
      canonicalUrl: result.canonicalUrl,
      caption: result.caption,
      thumbnailUrl: result.thumbnailUrl,
    };
  }
  return {
    ok: false,
    reason: "unsupported_platform",
    message: "This platform isn't supported yet.",
  };
};

export interface RecipeExtractionIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface RecipeExtractionResult {
  hasRecipe: boolean;
  confidence: "high" | "medium" | "low";
  title: string | null;
  ingredients: RecipeExtractionIngredient[];
  steps: string[];
}

const EMPTY_EXTRACTION_RESULT: RecipeExtractionResult = {
  hasRecipe: false,
  confidence: "low",
  title: null,
  ingredients: [],
  steps: [],
};

// hasRecipe is the fallback trigger this whole module is built around: a
// caller sees hasRecipe: false and knows this caption alone wasn't enough,
// which is where audio-transcription or website-fallback extraction would
// plug in later — nothing here implements that yet, only the signal that
// would drive it.
const RECIPE_EXTRACTION_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "recipe_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        hasRecipe: { type: "boolean" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        title: { type: ["string", "null"] },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: ["number", "null"] },
              unit: { type: ["string", "null"] },
            },
            required: ["name", "quantity", "unit"],
            additionalProperties: false,
          },
        },
        steps: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["hasRecipe", "confidence", "title", "ingredients", "steps"],
      additionalProperties: false,
    },
  },
};

const RECIPE_EXTRACTION_SYSTEM_PROMPT = `You extract recipe data from social media captions. The caption may be informal, use emojis/hashtags, and be in any language.

Rules:
- Only set hasRecipe to true if the caption actually contains real recipe information (specific ingredients and/or preparation steps) — not just a mention of food, a review, or "recipe in bio/link" with no actual content.
- If the caption is in a language other than English, translate the title, ingredients, and steps into English. Translate ingredient names precisely — never substitute a different, similar-sounding ingredient because the translation is ambiguous.
- For each ingredient, extract quantity and unit only if they are actually stated in the text. Leave them null if not specified — never guess a plausible quantity.
- List steps in the order implied by the caption, each as a clear standalone instruction. If the caption lists ingredients but gives no explicit steps, return an empty steps array rather than inventing steps.
- Infer a short, natural recipe title from the content if the caption doesn't explicitly name the dish.
- confidence: "high" if the caption clearly and fully describes a recipe; "medium" if it's a real recipe but with gaps (vague quantities, unclear steps); "low" if hasRecipe is true but the extraction is a stretch, or whenever hasRecipe is false.`;

export const extractRecipeFromText = async (
  captionText: string,
): Promise<RecipeExtractionResult> => {
  // Empty/missing caption can't contain a recipe — return the clean
  // no-recipe result directly rather than spending an LLM call (and
  // risking a hallucinated recipe from an empty prompt) to find that out.
  if (!captionText || captionText.trim().length === 0) {
    return EMPTY_EXTRACTION_RESULT;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RECIPE_EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: captionText },
    ],
    response_format: RECIPE_EXTRACTION_RESPONSE_FORMAT,
  });

  const raw = completion.choices[0].message.content;
  if (!raw) return EMPTY_EXTRACTION_RESULT;
  return JSON.parse(raw);
};

export interface SavedRecipeDto {
  id: string;
  title: string;
  ingredients: RecipeExtractionIngredient[];
  steps: string[];
  source: string;
  sourcePlatform: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  createdAt: Date;
}

const toSavedRecipeDto = (recipe: SavedRecipe): SavedRecipeDto => ({
  id: recipe.id,
  title: recipe.title,
  ingredients: recipe.ingredients as unknown as RecipeExtractionIngredient[],
  steps: recipe.steps as unknown as string[],
  source: recipe.source,
  sourcePlatform: recipe.sourcePlatform,
  sourceUrl: recipe.sourceUrl,
  thumbnailUrl: recipe.thumbnailUrl,
  calories: recipe.calories,
  proteinG: recipe.proteinG,
  carbsG: recipe.carbsG,
  fatG: recipe.fatG,
  createdAt: recipe.createdAt,
});

export interface ExtractedRecipe {
  title: string;
  ingredients: RecipeExtractionIngredient[];
  steps: string[];
  sourcePlatform: RecipeImportPlatform;
  sourceUrl: string;
  thumbnailUrl: string | null;
}

export type ExtractRecipeOutcome =
  | { status: "ready_to_review"; recipe: ExtractedRecipe }
  | { status: "already_saved"; recipe: SavedRecipeDto }
  | { status: "no_recipe_detected"; captionPreview: string }
  | {
      status: "error";
      reason: CaptionErrorReason;
      message: string;
    };

// On-demand only: one caller-supplied URL in, one caption fetch, one LLM
// extraction, no DB write — the result is handed back for the user to
// review/edit before anything is persisted (see saveRecipe below). There
// is no loop, queue, or scheduled invocation of this function anywhere,
// which is the constraint this feature's "single URL, on demand" framing
// depends on. Do not wrap this in a batch/cron job.
export const extractRecipeFromLink = async (
  rawInput: string,
  userId: string,
): Promise<ExtractRecipeOutcome> => {
  const url = extractUrl(rawInput);
  const platform = detectPlatform(url);
  if (!platform) {
    return {
      status: "error",
      reason: "unsupported_platform",
      message: isInstagramUrl(url)
        ? "Instagram isn't supported yet — we're working on it. Try a TikTok or YouTube link for now."
        : "This platform isn't supported yet — try a TikTok or YouTube link.",
    };
  }

  const captionResult = await fetchCaption(platform, url);
  if (!captionResult.ok) {
    return {
      status: "error",
      reason: captionResult.reason,
      message: captionResult.message,
    };
  }

  // Checked by the platform's own canonical video URL (not the raw share
  // URL, which carries random per-share tracking params like TikTok/
  // YouTube's `?si=...`) so re-sharing the same video — the common case,
  // since a share sheet link always looks "new" — doesn't create a
  // duplicate or spend an LLM call re-extracting it. Scoped to this user
  // only: saved recipes are a private per-user collection (like a
  // bookmark list), not a shared feed, so a different user importing the
  // same video is a completely separate save, not a duplicate.
  const existing = await prisma.savedRecipe.findFirst({
    where: { sourceUrl: captionResult.canonicalUrl, userId },
  });
  if (existing) {
    return { status: "already_saved", recipe: toSavedRecipeDto(existing) };
  }

  let extraction = await extractRecipeFromText(captionResult.caption);

  // The fallback trigger point: the caption/description alone didn't
  // contain a real recipe (common when a creator narrates or overlays
  // the ingredients/steps instead of typing them out) — try the video's
  // own transcript next before giving up. YouTube has a public caption
  // track to read (see fetchYouTubeTranscript); TikTok has no equivalent
  // yet (see fetchTikTokTranscript below — not implemented).
  if (!extraction.hasRecipe) {
    const transcript =
      platform === "youtube"
        ? await fetchYouTubeTranscript(captionResult.videoId)
        : await fetchTikTokTranscript(captionResult.videoId);

    if (transcript) {
      // Combined with the caption, not just the transcript alone — the
      // caption sometimes has the dish's name/context even when it's
      // missing the actual ingredients/steps, and losing that would make
      // the retry strictly worse information than the first attempt.
      extraction = await extractRecipeFromText(
        `${captionResult.caption}\n\nVideo transcript:\n${transcript}`,
      );
    }
  }

  if (!extraction.hasRecipe) {
    return {
      status: "no_recipe_detected",
      captionPreview: captionResult.caption.slice(0, 200),
    };
  }

  return {
    status: "ready_to_review",
    recipe: {
      title: extraction.title ?? "Untitled Recipe",
      ingredients: extraction.ingredients,
      steps: extraction.steps,
      sourcePlatform: platform,
      sourceUrl: captionResult.canonicalUrl,
      thumbnailUrl: captionResult.thumbnailUrl,
    },
  };
};

const formatIngredientForEstimate = (ingredient: RecipeExtractionIngredient): string =>
  [ingredient.quantity, ingredient.unit, ingredient.name]
    .filter((part) => part !== null && part !== "")
    .join(" ");

interface CachedMacros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// Estimates once and writes the result onto the recipe row so every
// future read (a repeat "add to meal", a future retry) sees the exact
// same numbers — estimateRecipeMacros runs at temperature: 0 precisely
// so that, if this ever does need to run again for the same recipe (see
// the null-backfill path in logSavedRecipeToMeal below), it reproduces
// the same result rather than drifting. Best-effort: a transient LLM
// failure here shouldn't block saving the recipe itself, so this
// swallows errors and returns null rather than throwing.
const estimateAndCacheMacros = async (
  recipeId: string,
  title: string,
  ingredients: RecipeExtractionIngredient[],
): Promise<CachedMacros | null> => {
  try {
    const ingredientsText = ingredients.map(formatIngredientForEstimate).join(", ");
    const estimate = await estimateRecipeMacros(title, ingredientsText);
    const macros: CachedMacros = {
      calories: estimate.calories,
      proteinG: estimate.proteinG,
      carbsG: estimate.carbsG,
      fatG: estimate.fatG,
    };
    await prisma.savedRecipe.update({ where: { id: recipeId }, data: macros });
    return macros;
  } catch {
    return null;
  }
};

const RECIPE_KEYWORDS_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "recipe_keywords",
    strict: true,
    schema: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["keywords"],
      additionalProperties: false,
    },
  },
};

// Concept tags, not a transcription of the title — the whole point is
// catching a search like "italian" for a recipe titled "Chicken Piccata"
// that never says the word itself. Cuisine especially has to be inferred
// from the ingredients (parmesan + basil + pasta implies "italian"), not
// just lifted from text that's already there.
const RECIPE_KEYWORDS_SYSTEM_PROMPT = `You generate short search tags for a recipe so it can be found by cuisine, main ingredients, diet, or meal type — not just by matching its exact title.

Rules:
- Return 4-8 lowercase, single-or-two-word tags (e.g. "italian", "pasta", "chicken", "high protein", "breakfast", "vegetarian", "dessert").
- Infer cuisine/region even when it's never stated outright — judge it from the ingredients and preparation style (e.g. parmesan + basil + pasta implies "italian"; soy sauce + ginger + rice implies "asian").
- Only include tags that are genuinely applicable — don't pad the list with generic filler.
- Tags only, no sentences or explanations.`;

const generateSearchKeywords = async (
  title: string,
  ingredients: RecipeExtractionIngredient[],
  steps: string[],
): Promise<string[]> => {
  const ingredientsText = ingredients.map(formatIngredientForEstimate).join(", ");
  const content = `Title: ${title}\nIngredients: ${ingredientsText}\nSteps: ${steps.join(" ")}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RECIPE_KEYWORDS_SYSTEM_PROMPT },
      { role: "user", content },
    ],
    response_format: RECIPE_KEYWORDS_RESPONSE_FORMAT,
  });

  const raw = completion.choices[0].message.content;
  if (!raw) return [];
  const parsed = JSON.parse(raw) as { keywords: string[] };
  return parsed.keywords.map((keyword) => keyword.toLowerCase().trim()).filter(Boolean);
};

// Same best-effort/never-throws shape as estimateAndCacheMacros above,
// and the same reason: a transient LLM failure here should never block
// saving the recipe itself, or (via backfillMissingKeywords below) block
// Discover from loading.
const estimateAndCacheKeywords = async (
  recipeId: string,
  title: string,
  ingredients: RecipeExtractionIngredient[],
  steps: string[],
): Promise<string[] | null> => {
  try {
    const keywords = await generateSearchKeywords(title, ingredients, steps);
    await prisma.savedRecipe.update({
      where: { id: recipeId },
      data: { searchKeywords: keywords },
    });
    return keywords;
  } catch {
    return null;
  }
};

// The explicit, separate "commit" step — only ever called once a user has
// reviewed (and possibly edited) the extracted fields and tapped Save.
// Nothing from extractRecipeFromLink is persisted before this runs.
export const saveRecipe = async (
  userId: string,
  input: ExtractedRecipe,
): Promise<SavedRecipeDto> => {
  const saved = await prisma.savedRecipe.create({
    data: {
      userId,
      title: input.title,
      ingredients: input.ingredients as object,
      steps: input.steps as object,
      source: "caption_import",
      sourcePlatform: input.sourcePlatform,
      sourceUrl: input.sourceUrl,
      thumbnailUrl: input.thumbnailUrl,
    },
  });

  // Independent LLM calls (macros vs. search tags) — run concurrently
  // rather than one after another.
  const [macros] = await Promise.all([
    estimateAndCacheMacros(saved.id, saved.title, input.ingredients),
    estimateAndCacheKeywords(saved.id, saved.title, input.ingredients, input.steps),
  ]);

  return toSavedRecipeDto(macros ? { ...saved, ...macros } : saved);
};

// This user's own bookmark list. Two different users importing the same
// video each still get their own row here (see the userId-scoped dedup
// check in extractRecipeFromLink above) — getDiscoverRecipes below is
// where cross-user duplicates of the same video get collapsed.
export const getSavedRecipes = async (userId: string): Promise<SavedRecipeDto[]> => {
  const recipes = await prisma.savedRecipe.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return recipes.map(toSavedRecipeDto);
};

// Backfills any row fetched with no cached search tags yet (saved before
// searchKeywords existed, or whose generation failed at save time) — a
// one-time cost per row, since the next fetch skips whatever already has
// tags. Done here rather than filtering in SQL against searchKeywords
// directly: an old row's tags don't exist until AFTER this runs, so a
// WHERE clause checking them first would never see it.
const backfillMissingKeywords = async (
  recipes: SavedRecipe[],
): Promise<SavedRecipe[]> =>
  Promise.all(
    recipes.map(async (recipe) => {
      if (recipe.searchKeywords.length > 0) return recipe;
      const keywords = await estimateAndCacheKeywords(
        recipe.id,
        recipe.title,
        recipe.ingredients as unknown as RecipeExtractionIngredient[],
        recipe.steps as unknown as string[],
      );
      return keywords ? { ...recipe, searchKeywords: keywords } : recipe;
    }),
  );

// Concept match, not just a literal title match — "italian" should find a
// recipe titled "Chicken Piccata" via its cuisine tag even though the
// word "italian" never appears in the title itself. Checked both
// directions against each tag so either a short query inside a longer
// tag ("ital" vs. "italian") or a longer query containing a short tag
// ("authentic italian food" vs. "italian") counts as a match.
const matchesQuery = (recipe: SavedRecipe, query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  if (recipe.title.toLowerCase().includes(lowerQuery)) return true;
  return recipe.searchKeywords.some(
    (keyword) => keyword.includes(lowerQuery) || lowerQuery.includes(keyword),
  );
};

// The community feed: every user's saved imports, one card per unique
// source video. Different users importing the same video each get their
// own SavedRecipe row (see extractRecipeFromLink's per-user dedup check
// above), so naively listing every row would show the same video's recipe
// once per person who'd saved it.
export const getDiscoverRecipes = async (
  query?: string,
): Promise<SavedRecipeDto[]> => {
  const trimmedQuery = query?.trim();

  const rawRecipes = await prisma.savedRecipe.findMany({
    // Excludes manual entries (source: "manual", not implemented yet)
    // that might one day have no sourceUrl — grouping those under one
    // shared `null` key would wrongly collapse unrelated recipes into
    // one card.
    where: { sourceUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    // Bounds the pre-backfill/pre-dedup fetch the same way every other
    // list here bounds itself (no real pagination anywhere in this
    // module yet) — plenty of headroom over the final 100-card page even
    // with heavy overlap. Unconditional (not narrowed by query) so a
    // search always has this same fully-tagged candidate set to filter,
    // rather than a "most recent 500 matching title" query that could
    // never surface an older tag-only match.
    take: 500,
  });

  const recipes = await backfillMissingKeywords(rawRecipes);
  const matches = trimmedQuery
    ? recipes.filter((recipe) => matchesQuery(recipe, trimmedQuery))
    : recipes;

  // `matches` is newest-first; Map#set overwrites a repeated key, so
  // always overwriting while iterating in that order leaves the OLDEST
  // save of each video as the survivor — it's the last one written,
  // since it's encountered last. That keeps the original importer's copy
  // as the canonical one rather than whichever near-duplicate happens to
  // be freshest.
  const bySourceUrl = new Map<string, SavedRecipe>();
  for (const recipe of matches) {
    bySourceUrl.set(recipe.sourceUrl!, recipe);
  }

  return [...bySourceUrl.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 100)
    .map(toSavedRecipeDto);
};

// No nutrition database (USDA, etc.) is consulted here — a recipe's
// ingredients are a caption-derived guess already (see
// extractRecipeFromText above), and matching each one to a database
// entry plus unit-converting its serving size would compound that
// uncertainty further. Reads the macros cached on the recipe by
// saveRecipe (via estimateAndCacheMacros above) rather than re-estimating
// on every call — besides the wasted LLM cost, calling estimateRecipeMacros
// fresh each time previously meant the same recipe could log a different
// calorie count from one add to the next.
export const logSavedRecipeToMeal = async (
  userId: string,
  recipeId: string,
  mealType: MealType,
  date: string,
) => {
  // Not scoped to userId — recipeId can come from Discover now, not just
  // this user's own saved list. That's fine: this only ever reads the
  // recipe's ingredients/macros, and logFood below writes the resulting
  // entry to the CALLER's diary regardless of whose row recipeId is.
  const recipe = await prisma.savedRecipe.findFirst({
    where: { id: recipeId },
  });
  if (!recipe) {
    throw new AppError(404, "Saved recipe not found");
  }

  let macros: CachedMacros | null =
    recipe.calories !== null &&
    recipe.proteinG !== null &&
    recipe.carbsG !== null &&
    recipe.fatG !== null
      ? {
          calories: recipe.calories,
          proteinG: recipe.proteinG,
          carbsG: recipe.carbsG,
          fatG: recipe.fatG,
        }
      : null;

  // Only reached for a recipe saved before this caching existed, or one
  // whose save-time estimate failed — backfills the cache so every
  // subsequent add reuses this same result too.
  if (!macros) {
    const ingredients = recipe.ingredients as unknown as RecipeExtractionIngredient[];
    macros = await estimateAndCacheMacros(recipe.id, recipe.title, ingredients);
  }
  if (!macros) {
    throw new AppError(502, "Couldn't estimate macros for this recipe — try again");
  }

  return logFood(userId, {
    date,
    mealType,
    foodName: recipe.title,
    brandName: null,
    servingQty: 1,
    servingUnit: "serving",
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    source: "ai_estimated",
  });
};
