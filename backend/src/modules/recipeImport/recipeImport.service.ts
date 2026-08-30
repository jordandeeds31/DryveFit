import prisma from "../../lib/prisma";
import openai from "../../lib/openai";
import { fetchTikTokCaption, TikTokCaptionErrorReason } from "../../lib/tiktok";
import { fetchYouTubeCaption, YouTubeCaptionErrorReason } from "../../lib/youtube";

export type RecipeImportPlatform = "tiktok" | "youtube";

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
    return { ok: true, caption: result.caption, thumbnailUrl: result.thumbnailUrl };
  }
  if (platform === "youtube") {
    const result = await fetchYouTubeCaption(url);
    if (!result.ok) {
      return { ok: false, reason: result.reason, message: result.message };
    }
    return { ok: true, caption: result.caption, thumbnailUrl: result.thumbnailUrl };
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
  importedByUsername: string | null;
  createdAt: Date;
}

export type ImportRecipeOutcome =
  | { status: "saved"; recipe: SavedRecipeDto }
  | { status: "no_recipe_detected"; captionPreview: string }
  | {
      status: "error";
      reason: CaptionErrorReason;
      message: string;
    };

// The single on-demand entry point for this feature: one caller-supplied
// URL in, one fetch + one extraction + at most one DB write, then done.
// There is no loop, queue, or scheduled invocation of this function
// anywhere — every call here is synchronous with a user submitting a
// link, which is the constraint this feature's "single URL, on demand"
// framing depends on. Do not wrap this in a batch/cron job.
export const importRecipeFromLink = async (
  userId: string,
  url: string,
): Promise<ImportRecipeOutcome> => {
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

  const saved = await prisma.savedRecipe.create({
    data: {
      userId,
      title: extraction.title ?? "Untitled Recipe",
      ingredients: extraction.ingredients as object,
      steps: extraction.steps as object,
      source: "caption_import",
      sourcePlatform: platform,
      sourceUrl: url,
      thumbnailUrl: captionResult.thumbnailUrl,
    },
    include: { user: { select: { username: true } } },
  });

  return {
    status: "saved",
    recipe: {
      id: saved.id,
      title: saved.title,
      ingredients: saved.ingredients as unknown as RecipeExtractionIngredient[],
      steps: saved.steps as unknown as string[],
      source: saved.source,
      sourcePlatform: saved.sourcePlatform,
      sourceUrl: saved.sourceUrl,
      thumbnailUrl: saved.thumbnailUrl,
      importedByUsername: saved.user.username,
      createdAt: saved.createdAt,
    },
  };
};

// Deliberately not scoped to a single userId — an imported recipe is
// shared with every user of the app, the same way a Post or BlogPost is,
// not kept private to whoever imported it.
export const getSavedRecipes = async (): Promise<SavedRecipeDto[]> => {
  const recipes = await prisma.savedRecipe.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { username: true } } },
  });

  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients as unknown as RecipeExtractionIngredient[],
    steps: recipe.steps as unknown as string[],
    source: recipe.source,
    sourcePlatform: recipe.sourcePlatform,
    sourceUrl: recipe.sourceUrl,
    thumbnailUrl: recipe.thumbnailUrl,
    importedByUsername: recipe.user.username,
    createdAt: recipe.createdAt,
  }));
};
