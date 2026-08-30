import prisma from "../../lib/prisma";
import { SavedRecipe } from "../../generated/prisma/client";
import openai from "../../lib/openai";
import AppError from "../../utils/AppError";
import { fetchTikTokCaption, TikTokCaptionErrorReason } from "../../lib/tiktok";
import { fetchYouTubeCaption, YouTubeCaptionErrorReason } from "../../lib/youtube";
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

export type CaptionErrorReason =
  | TikTokCaptionErrorReason
  | YouTubeCaptionErrorReason
  | "unsupported_platform";

interface CaptionFetchSuccess {
  ok: true;
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
      message: "This platform isn't supported yet — try a TikTok or YouTube link.",
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

  const extraction = await extractRecipeFromText(captionResult.caption);

  // This is the fallback trigger point: a real future implementation would
  // try audio-transcription or website extraction here before giving up,
  // using the same caption-fetch result (or the original URL) as input.
  // Nothing past this comment exists yet — it just cleanly reports back so
  // the caller (and, later, this function) knows to try something else.
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

  const macros = await estimateAndCacheMacros(saved.id, saved.title, input.ingredients);

  return toSavedRecipeDto(macros ? { ...saved, ...macros } : saved);
};

// Private per-user, like a bookmark list — not a shared feed. Two
// different users importing the same video each get their own row (see
// the userId-scoped dedup check in extractRecipeFromLink above).
export const getSavedRecipes = async (userId: string): Promise<SavedRecipeDto[]> => {
  const recipes = await prisma.savedRecipe.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return recipes.map(toSavedRecipeDto);
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
  const recipe = await prisma.savedRecipe.findFirst({
    where: { id: recipeId, userId },
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
