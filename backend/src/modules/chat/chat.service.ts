import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { toFile } from "openai";
import openai from "../../lib/openai";
import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import {
  getRecentWorkoutLogsForUser,
  getDistinctExerciseNamesForUser,
  logExerciseSetsForDate,
} from "../workoutLogs/workoutLogs.service";
import {
  getExercise1RMHistory,
  getPersonalRecordsForUser,
  searchExercises,
} from "../exercises/exercises.service";
import {
  getActiveProgramForUser,
  getProgramDayByDate,
  logExercisePerformance,
} from "../programs/programs.service";
import {
  getCardioSessionsForUser,
  CARDIO_ACTIVITY_TYPES,
  CardioActivityType,
} from "../cardio/cardio.service";
import {
  getDiaryForDate,
  logFood,
  estimateMacros,
  MEAL_TYPES,
  MealType,
} from "../nutrition/nutrition.service";
import { UNRESTRICTED_TEST_EMAIL } from "../../utils/futureLogGuard";

// Mirrors frontend/lib/purchases/requirePro.ts's UNRESTRICTED_EMAILS — the
// developer's own account plus one comped account, both exempted from the
// Pro paywall everywhere else in the app (that list bypasses
// RevenueCatUI.presentPaywallIfNeeded entirely). The client-sent isPro
// param here comes from RevenueCat's raw entitlement check
// (subscriptionSlice's fetchSubscriptionStatus), which knows nothing about
// that bypass — so without this, these two accounts would correctly skip
// the paywall on every OTHER Pro-gated action but still get blocked here.
const UNRESTRICTED_PRO_EMAILS = [
  UNRESTRICTED_TEST_EMAIL,
  "pineapplecrafty@gmail.com",
  "andrew@getbettrhealth.com",
  "cgfitt.nutrition@gmail.com",
];

const MODEL = "gpt-4o-mini";
// How many prior persisted turns to replay back to OpenAI — bounds cost per
// message without needing real conversation summarization for v1.
const HISTORY_LIMIT = 40;
// Tool-calling round-trips per user message — a hard ceiling in case the
// model gets stuck repeatedly calling tools instead of answering.
const MAX_TOOL_ROUNDS = 5;

// Cost/abuse guard — a rolling 24h window rather than a calendar-day
// boundary, so it doesn't need per-user timezone handling to be correct.
// Generous for a real user (a normal chat session is a handful of
// messages), just bounds the worst case of a runaway client loop or
// scripted abuse racking up OpenAI cost.
const DAILY_MESSAGE_LIMIT = 60;

// Weight is always persisted in lbs (see frontend/lib/utils/units.ts's
// toStoredLbs) regardless of the user's display unitSystem — the log_set
// tool accepts either unit from the model and converts here so the
// stored value matches what every other write path produces.
const LBS_PER_KG = 2.20462262185;

// "Today"/"yesterday" in a chat message means the user's own local
// calendar date, not the server's (Render runs UTC) — same reasoning as
// the workout-reminder job using each user's saved IANA timezone. Falls
// back to UTC for a user who never set one (timezone is only populated
// once registerForPushNotifications runs at least once).
const getUserLocalDateStr = (timezone: string | null): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Needed alongside todayStr specifically for meal-type inference
// ("log 'eggs and toast'" with no meal named) — the date alone doesn't
// say whether it's breakfast or a midnight snack.
const getUserLocalTimeStr = (timezone: string | null): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());

// Mirrors the same restriction food-search.tsx already enforces for
// manual logging — a diary entry with no goal to compare against isn't
// useful, so both write paths require one before creating any entries.
const NO_NUTRITION_GOAL_INSTRUCTIONS = `This user hasn't set up their nutrition goals yet. Logging food (log_food) requires a daily calorie/macro goal to exist first — calling it will be rejected. If they ask you to log food, tell them plainly that they need to set up their nutrition goals in the app first (Nutrition tab), then they can log through you. Everything else is unaffected.`;

const NUTRITION_LOGGING_INSTRUCTIONS = `You can also log food the user describes, with log_food. This logs the food text VERBATIM and gets its macros from an LLM estimate — there's no database lookup or matching involved, so never try to resolve the description to a specific catalog item first.

Resolving date and meal:
- Date: same as everywhere else — resolve "today"/"yesterday"/a named day using today's date above, default to today if unstated.
- Meal: if the user names one ("for lunch", "as a snack"), use it directly. Otherwise infer from the current local time above: before 11am → breakfast, 11am-3pm → lunch, 5pm-9pm → dinner, anything else → snacks. Before finalizing an inferred meal, call get_nutrition_diary_summary for that date and check what's already logged — e.g. at 2:30pm with lunch already logged, that's a signal this new food is actually a snack, not a second lunch. Only ask the user to pick a meal when the time is genuinely borderline (e.g. logging at 4pm with nothing logged yet today) and the diary doesn't resolve it either — otherwise just resolve it yourself, same confidence bar as exercise matching.

Logging: one logFood call per resolved meal. If the user describes several distinct foods for the same meal ("eggs, toast, and orange juice for breakfast"), pass them as separate entries in the items array so each is logged individually — don't merge them into one text string. If they describe foods across different meals in one message, make one logFood call per meal.

After it succeeds, confirm back using the REAL numbers the tool returns (never estimate them yourself in your reply) and always make clear these are estimates, e.g. "Logged '2 eggs and toast' to breakfast — ~320 cal, 18g protein (estimated)". If the tool reports low confidence on an item, say so plainly rather than stating the number flatly — e.g. "~200 cal (rough estimate — hard to tell exactly what that is)".`;

const PRO_LOGGING_INSTRUCTIONS = `You can also log completed workouts for the user, with log_set. Picking the right target and resolving the exercise correctly both matter:

- If the workout is part of the user's active program ("log today's workout", "I completed the plan", "log the recommended sets for bench press"): call get_program_day first — never guess a programExerciseId. It tells you exactly what's prescribed for a date (each exercise's programExerciseId, prescribedSets, prescribedReps, recommendedWeight) AND, per exercise, loggedSets — whatever's actually been logged for it today already, if anything. If the user says "as prescribed"/"as planned" without their own numbers, use prescribedSets/prescribedReps/recommendedWeight directly. Then call log_set with that programExerciseId. This is what marks the exercise (and the whole day, once every exercise in it is logged) as completed in their program.
- For anything NOT part of the active program (extra work on top of the plan, a standalone workout with no scheduled program day, or a specific exercise not in today's plan): you need a real exerciseId, and the ONLY way to get one is search_exercises — never invent an exerciseId or pass a name directly to log_set. Call search_exercises with the exercise name exactly as the user said it. Then, from the results:
  - exactMatch: true, or one candidate scored clearly above the rest (roughly 0.85+, with real separation from the next-best score) → that's a confident match. Call log_set with its id directly — don't ask the user to confirm first, that's an extra round-trip for something you're already sure of.
  - Multiple candidates close in score, or nothing scored high enough to be confident → do NOT guess. Reply listing 2–4 of the actual candidate names (never invented ones) and ask which one they meant. Once they answer, resolve to that one and call log_set — call search_exercises again first if their reply doesn't make the id obvious.
  - No candidates at all → tell them plainly that exercise isn't in the catalog yet, and ask them to try a different/more common name for it. Don't create one or log against a fabricated id.

Call log_set directly, without asking for confirmation first, whenever the exercise is already confidently resolved (either path above) and the user gave a plain factual completion — that's exactly what they asked for. After it succeeds, confirm back exactly what got logged: the resolved exercise name (from the tool result, not your own guess), sets, weight, reps, and date. If log_set errors, relay that plainly and ask them to clarify rather than retrying blindly.

Logging the same exercise more than once on the same date is completely normal and always allowed — a user doing 5 sets of squats will often say so one or two at a time ("squats 135 for 8" ... then later "another set, same weight, 6 reps"), or ask you directly to "log the same thing again" / "one more set of that" / "add another set". Never tell the user you "can't" log an exercise again because they already logged it today — that's not a real restriction, and how to actually do it correctly differs by path:
- exerciseId path: each log_set call ADDS more sets on top of whatever's already logged for that exercise/date — just call it again with only the new set(s).
- programExerciseId path: each log_set call REPLACES that exercise's entire set list, it does not append. Before adding a set here, get that exercise's current loggedSets (from get_program_day — call it again if you don't already have a fresh copy) and pass ALL of them plus the new one(s) together in one log_set call. Passing only the new set would silently erase the ones already logged.

Either path, if they're clearly continuing the same exercise from earlier in this conversation, reuse the exerciseId/programExerciseId you already resolved rather than re-resolving it.`;

// Kept short deliberately — this user's tool list still includes log_set
// (the model can't be un-taught a tool exists mid-schema), but log_set
// itself refuses to execute for a non-Pro user (see executeTool) as the
// real enforcement. This is just what steers the model away from ever
// attempting it and toward telling the user why in plain language.
const NON_PRO_LOGGING_INSTRUCTIONS = `This user does NOT have an active DryveFit Pro subscription. Logging workouts (log_set) is a Pro feature — calling it for this user will be rejected. If they ask you to log a workout/set/exercise, tell them plainly that logging through the AI coach requires DryveFit Pro, and that they can subscribe from the app to unlock it. Everything else (their history, PRs, program, general advice) is still fully available — the Pro requirement is only for writing new logs through chat.`;

const buildSystemPrompt = (
  todayStr: string,
  nowStr: string,
  isPro: boolean,
  hasNutritionGoal: boolean,
): string => `You are DryveFit AI Coach, the AI coach built into DryveFit, a fitness tracking app. You're chatting directly with the user about their own training.

Today's date (the user's own local calendar date) is ${todayStr}, and the current local time is ${nowStr}. Use these to resolve relative dates like "today" or "yesterday", and to infer meal type when logging food — never guess or use a different date.

You have tools to fetch this user's real workout logs, lifting personal records, cardio sessions, and active program — always call a tool to get real numbers instead of guessing or making anything up. If a tool returns no data, say so plainly rather than inventing an answer.

${isPro ? PRO_LOGGING_INSTRUCTIONS : NON_PRO_LOGGING_INSTRUCTIONS}

${hasNutritionGoal ? NUTRITION_LOGGING_INSTRUCTIONS : NO_NUTRITION_GOAL_INSTRUCTIONS}

Be concise, specific, and encouraging — cite actual numbers, exercise names, and dates from the data you fetch. If asked something with no relevant tool (e.g. general fitness advice), just answer normally.`;

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_recent_workouts",
      description:
        "Get the user's most recent logged workouts (program-based or standalone), each with its exercises and sets.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max workouts to return, most recent first. Default 10, max 30.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_logged_exercise_names",
      description:
        "List every distinct exercise name the user has ever logged — use this to know what's valid to pass to get_1rm_history.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_1rm_history",
      description:
        "Get the user's estimated one-rep-max history over time for a specific exercise, one best estimate per day it was logged.",
      parameters: {
        type: "object",
        properties: {
          exerciseName: {
            type: "string",
            description: "Exact exercise name, e.g. \"Barbell Squat\".",
          },
        },
        required: ["exerciseName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_personal_records",
      description:
        "Get the user's best-ever estimated one-rep-max for every exercise they've logged, sorted highest first.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cardio_sessions",
      description:
        "Get the user's recent cardio sessions (walk/run/bike) with distance, duration, calories, heart rate, and steps.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max sessions to return, most recent first. Default 10, max 30.",
          },
          activityType: {
            type: "string",
            enum: [...CARDIO_ACTIVITY_TYPES],
            description: "Filter to just one activity type.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_program",
      description:
        "Get the user's currently active training program (name, split, days per week, goal, etc). Returns null if they have none.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_exercises",
      description:
        "Search the exercise catalog by free-text name. Always call this before log_set for anything not part of the active program (i.e. whenever you'd pass exerciseId, not programExerciseId) — never guess or invent an exerciseId. Returns up to 5 ranked candidates with a 0-1 confidence score, plus exactMatch (true only for a literal name match).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The exercise name as the user said it, e.g. \"shoulder raises\".",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_program_day",
      description:
        "Get the user's active program's prescribed exercises for a specific date — each exercise's programExerciseId, prescribedSets/prescribedReps, recommendedWeight, isCompleted, and loggedSets (the actual sets logged so far, if any — needed before adding another set to an already-logged program exercise, since log_set replaces this exercise's set list rather than appending). Always call this before logging against the program to get the correct programExerciseId; never guess it. Returns an error if the user has no active program or no scheduled day on that date.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to look up, as YYYY-MM-DD. Defaults to today if omitted.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_set",
      description:
        "Log completed sets for one resolved exercise. Pass exactly one of exerciseId (from a prior search_exercises result — never invented, never a raw name) or programExerciseId (from get_program_day, to log against today's prescribed exercise and mark it/the day complete). Repeating an exercise on the same date is always fine — it's just never rejected for that — but the two paths behave differently: exerciseId ADDS to whatever's already logged, safe to call again with only the new set(s); programExerciseId REPLACES that exercise's entire set list each call, so adding to an already-logged one means passing get_program_day's loggedSets plus the new set(s) together, not just the new one(s) alone.",
      parameters: {
        type: "object",
        properties: {
          exerciseId: {
            type: "string",
            description: "Exercise catalog id from a prior search_exercises result. Omit if programExerciseId is given.",
          },
          programExerciseId: {
            type: "string",
            description: "ProgramExercise id from get_program_day. Omit if exerciseId is given.",
          },
          sets: {
            type: "array",
            description: "Each set completed, in order. If the user said to log it as prescribed, use get_program_day's prescribedSets/prescribedReps/recommendedWeight for these. When targeting programExerciseId and the exercise already has loggedSets, include those sets here too (see log_set's own description) — this replaces the full list, it doesn't append.",
            items: {
              type: "object",
              properties: {
                weight: {
                  type: "number",
                  description: "Weight used for this set. Omit entirely for a bodyweight exercise.",
                },
                reps: {
                  type: "number",
                  description: "Reps completed for this set.",
                },
              },
              required: ["reps"],
            },
          },
          weightUnit: {
            type: "string",
            enum: ["lbs", "kg"],
            description: "Unit the weight values are in. Default \"lbs\" unless the user said kg.",
          },
          date: {
            type: "string",
            description: "Date to log for (exerciseId path only), as YYYY-MM-DD. Defaults to today if omitted. Ignored for programExerciseId, which logs against that exercise's own scheduled date.",
          },
        },
        required: ["sets"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nutrition_diary_summary",
      description:
        "Get what's already logged for one date, grouped by meal (just food names and calories, not the full diary). Call this before log_food when the meal type wasn't stated, to sanity-check a time-of-day-based guess against what's already been logged (e.g. don't infer lunch again if lunch already has entries).",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check, as YYYY-MM-DD. Defaults to today if omitted.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_food",
      description:
        "Log food the user describes, verbatim. This does NOT match against any food database — the text is logged exactly as given, and its macros come from a separate LLM estimate computed automatically after this call, never guessed by you. Never pass estimated calorie/macro numbers as arguments here — there's nowhere to put them; this tool only takes the food text plus date/meal.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "One entry per distinct food for this meal — see NUTRITION_LOGGING_INSTRUCTIONS for when to split vs. combine.",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The food/quantity as the user described it, e.g. \"2 scrambled eggs\" or \"a slice of whole wheat toast with butter\".",
                },
              },
              required: ["text"],
            },
          },
          date: {
            type: "string",
            description: "Date to log for, as YYYY-MM-DD. Defaults to today if omitted.",
          },
          mealType: {
            type: "string",
            enum: [...MEAL_TYPES],
            description: "Resolved meal — see the meal-resolution rules above for how to infer this when the user didn't state it.",
          },
        },
        required: ["items", "mealType"],
      },
    },
  },
];

const clampLimit = (value: unknown, fallback: number, max: number): number => {
  const n = typeof value === "number" ? value : fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
};

const DATE_STR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// log_set's sets array is the same { weight, reps }[] shape plus an
// optional unit for the weight, regardless of which id (exerciseId or
// programExerciseId) it's targeting.
const parseToolSets = (
  rawSets: unknown,
  weightUnit: unknown,
): { sets: Array<{ weight: number | null; reps: number }> } | { error: string } => {
  const list = Array.isArray(rawSets) ? rawSets : [];
  if (list.length === 0) return { error: "At least one set is required" };

  const unit = weightUnit === "kg" ? "kg" : "lbs";
  const sets: Array<{ weight: number | null; reps: number }> = [];
  for (const rawSet of list) {
    const set = rawSet as Record<string, unknown>;
    const reps = typeof set.reps === "number" ? set.reps : null;
    if (reps == null || reps <= 0) {
      return { error: "Every set needs a positive rep count" };
    }
    const rawWeight = typeof set.weight === "number" ? set.weight : null;
    const weight =
      rawWeight == null ? null : unit === "kg" ? rawWeight * LBS_PER_KG : rawWeight;
    sets.push({ weight, reps });
  }
  return { sets };
};

const executeTool = async (
  userId: string,
  name: string,
  args: Record<string, unknown>,
  todayStr: string,
  isPro: boolean,
  hasNutritionGoal: boolean,
): Promise<unknown> => {
  switch (name) {
    case "get_recent_workouts":
      return getRecentWorkoutLogsForUser(
        userId,
        clampLimit(args.limit, 10, 30),
      );

    case "get_logged_exercise_names":
      return getDistinctExerciseNamesForUser(userId);

    case "get_1rm_history": {
      const exerciseName = args.exerciseName;
      if (typeof exerciseName !== "string" || exerciseName.trim() === "") {
        return { error: "exerciseName is required" };
      }
      return getExercise1RMHistory(userId, exerciseName);
    }

    case "get_personal_records":
      return getPersonalRecordsForUser(userId);

    case "get_cardio_sessions": {
      const limit = clampLimit(args.limit, 10, 30);
      const activityType = args.activityType;
      let sessions = await getCardioSessionsForUser(userId);
      if (
        typeof activityType === "string" &&
        (CARDIO_ACTIVITY_TYPES as readonly string[]).includes(activityType)
      ) {
        sessions = sessions.filter(
          (session) => session.activityType === (activityType as CardioActivityType),
        );
      }
      return sessions.slice(0, limit);
    }

    case "get_active_program":
      return getActiveProgramForUser(userId);

    case "search_exercises": {
      const query = args.query;
      if (typeof query !== "string" || query.trim() === "") {
        return { error: "query is required" };
      }
      return searchExercises(query);
    }

    case "get_program_day": {
      const activeProgram = await getActiveProgramForUser(userId);
      if (!activeProgram) {
        return { error: "The user has no active program" };
      }

      const date =
        typeof args.date === "string" && DATE_STR_PATTERN.test(args.date)
          ? args.date
          : todayStr;

      try {
        const programDay = await getProgramDayByDate(
          userId,
          activeProgram.id,
          date,
        );
        return {
          date,
          weekNumber: programDay.week.weekNumber,
          exercises: programDay.exercises.map((exercise) => ({
            programExerciseId: exercise.id,
            exerciseName: exercise.exerciseName,
            prescribedSets: exercise.sets,
            prescribedReps: exercise.reps,
            recommendedWeight: exercise.recommendedWeight,
            isCompleted: exercise.isCompleted,
            // The ACTUAL sets already logged for this exercise today, if
            // any — log_set (programExerciseId path) replaces this
            // exercise's whole set list on every call rather than
            // appending, so adding one more set to an already-completed
            // exercise means passing THESE plus the new one, not just the
            // new one alone.
            loggedSets: exercise.exerciseLogs[0]?.sets.map((set) => ({
              setNumber: set.setNumber,
              weight: set.weight,
              reps: set.reps,
            })) ?? [],
          })),
        };
      } catch (err) {
        return {
          error: err instanceof AppError ? err.message : "Failed to load the program day",
        };
      }
    }

    case "log_set": {
      // Real enforcement, not just prompt steering — the model is told not
      // to attempt this for a non-Pro user, but that's persuasion, not a
      // guarantee. This is what actually stops the write.
      if (!isPro) {
        return {
          error:
            "Logging workouts through the AI coach requires DryveFit Pro. Tell the user to subscribe from the app to unlock this.",
        };
      }

      const exerciseId =
        typeof args.exerciseId === "string" && args.exerciseId.trim() !== ""
          ? args.exerciseId
          : null;
      const programExerciseId =
        typeof args.programExerciseId === "string" &&
        args.programExerciseId.trim() !== ""
          ? args.programExerciseId
          : null;

      if (!exerciseId && !programExerciseId) {
        return {
          error:
            "Either exerciseId (from search_exercises) or programExerciseId (from get_program_day) is required",
        };
      }
      if (exerciseId && programExerciseId) {
        return { error: "Pass only one of exerciseId or programExerciseId, not both" };
      }

      const parsed = parseToolSets(args.sets, args.weightUnit);
      if ("error" in parsed) return parsed;

      try {
        if (programExerciseId) {
          return await logExercisePerformance(userId, programExerciseId, parsed.sets);
        }

        const date =
          typeof args.date === "string" && DATE_STR_PATTERN.test(args.date)
            ? args.date
            : todayStr;
        return await logExerciseSetsForDate(userId, exerciseId!, parsed.sets, date);
      } catch (err) {
        return {
          error: err instanceof AppError ? err.message : "Failed to log the set",
        };
      }
    }

    case "get_nutrition_diary_summary": {
      const date =
        typeof args.date === "string" && DATE_STR_PATTERN.test(args.date)
          ? args.date
          : todayStr;

      const diary = await getDiaryForDate(userId, date);
      const meals = Object.fromEntries(
        MEAL_TYPES.map((mealType) => [
          mealType,
          diary.meals[mealType].map((entry) => ({
            foodName: entry.foodName,
            calories: entry.calories,
          })),
        ]),
      );
      return { date, meals };
    }

    case "log_food": {
      // Real enforcement, not just prompt steering — same "told not to
      // attempt this, but that's persuasion, not a guarantee" reasoning
      // as log_set's Pro check above.
      if (!hasNutritionGoal) {
        return {
          error:
            "This user hasn't set up their nutrition goals yet. Tell them to set up their daily calorie/macro goal in the Nutrition tab before logging food.",
        };
      }

      const rawItems = Array.isArray(args.items) ? args.items : [];
      const texts = rawItems
        .map((item) =>
          item && typeof item === "object" && typeof (item as any).text === "string"
            ? (item as any).text.trim()
            : "",
        )
        .filter((text) => text.length > 0);
      if (texts.length === 0) {
        return { error: "At least one item with text is required" };
      }

      const mealType = args.mealType;
      if (
        typeof mealType !== "string" ||
        !(MEAL_TYPES as readonly string[]).includes(mealType)
      ) {
        return { error: `mealType must be one of: ${MEAL_TYPES.join(", ")}` };
      }

      const date =
        typeof args.date === "string" && DATE_STR_PATTERN.test(args.date)
          ? args.date
          : todayStr;

      // Per-item, not Promise.all — a single bad estimate (rare OpenAI
      // hiccup) shouldn't block the other items in the same message from
      // logging, same "don't fail the whole batch over one bad part"
      // reasoning as the news RSS fetcher.
      const results = [];
      for (const text of texts) {
        try {
          const estimate = await estimateMacros(text);
          const entry = await logFood(userId, {
            date,
            mealType: mealType as MealType,
            foodName: text,
            brandName: null,
            servingQty: 1,
            servingUnit: "serving",
            calories: estimate.calories,
            proteinG: estimate.proteinG,
            carbsG: estimate.carbsG,
            fatG: estimate.fatG,
            source: "ai_estimated",
          });
          results.push({
            text,
            calories: entry.calories,
            proteinG: entry.proteinG,
            carbsG: entry.carbsG,
            fatG: entry.fatG,
            confidence: estimate.confidence,
          });
        } catch (err) {
          results.push({
            text,
            error: err instanceof AppError ? err.message : "Couldn't estimate or log this item",
          });
        }
      }

      return { date, mealType, items: results };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
};

// Conversation titles are derived once, from the first user message, the
// same way ChatGPT/Claude do it — never re-derived on later messages, so
// the title doesn't drift as the conversation moves on.
const TITLE_MAX_LENGTH = 60;

const deriveConversationTitle = (content: string): string => {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (singleLine.length <= TITLE_MAX_LENGTH) return singleLine;
  return `${singleLine.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`;
};

export const listConversations = async (userId: string) => {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
};

const requireOwnedConversation = async (
  userId: string,
  conversationId: string,
) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) {
    throw new AppError(404, "Conversation not found");
  }
  return conversation;
};

export const getConversationMessages = async (
  userId: string,
  conversationId: string,
) => {
  await requireOwnedConversation(userId, conversationId);
  return prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
};

export const deleteConversation = async (
  userId: string,
  conversationId: string,
) => {
  await requireOwnedConversation(userId, conversationId);
  await prisma.conversation.delete({ where: { id: conversationId } });
};

// Backs the AI chat's mic button (frontend records with expo-audio's
// HIGH_QUALITY preset, which outputs .m4a — Whisper accepts that natively,
// no transcoding needed here). Transcribed text lands back in the
// composer for the user to review/edit, same as if they'd typed it — it's
// never sent straight to sendChatMessage on its own.
export const transcribeAudio = async (buffer: Buffer): Promise<string> => {
  const file = await toFile(buffer, "recording.m4a");
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });
  return transcription.text;
};

// isPro is supplied by the client (RevenueCat's own entitlement check,
// same as every other Pro gate in this app — e.g. requirePro.ts's
// ensureProAccess — there's no backend-side subscription record to check
// independently; RevenueCat entitlements are never synced to the DB).
// Trusting the client here is consistent with the rest of the app, not a
// weaker check than elsewhere it's used. It's OR'd with the
// UNRESTRICTED_PRO_EMAILS bypass (below, computed as effectiveIsPro)
// server-side, since that bypass is exactly what the client's RevenueCat
// check alone doesn't know about — without it, the dev/comped accounts
// would correctly skip the paywall everywhere else but still get blocked
// here. What executeTool's own log_set check (further down) buys beyond
// all of this: if the model ignores or misreads the system prompt's
// instruction and calls log_set anyway for a non-Pro user, the write
// still gets refused there — defense against LLM non-compliance, not
// against a client sending a false isPro value, which nothing here can
// detect.
export const sendChatMessage = async (
  userId: string,
  content: string,
  conversationId: string | undefined,
  isPro: boolean,
) => {
  const rollingWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const messagesInWindow = await prisma.chatMessage.count({
    where: { userId, role: "user", createdAt: { gte: rollingWindowStart } },
  });
  if (messagesInWindow >= DAILY_MESSAGE_LIMIT) {
    throw new AppError(
      429,
      "You've hit today's chat message limit — try again in a bit.",
    );
  }

  const conversation = conversationId
    ? await requireOwnedConversation(userId, conversationId)
    : await prisma.conversation.create({
        data: { userId, title: deriveConversationTitle(content) },
      });

  await prisma.chatMessage.create({
    data: { userId, conversationId: conversation.id, role: "user", content },
  });

  const [priorMessages, user] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, email: true, dailyCalorieGoal: true },
    }),
  ]);

  const todayStr = getUserLocalDateStr(user?.timezone ?? null);
  const nowStr = getUserLocalTimeStr(user?.timezone ?? null);
  const effectiveIsPro =
    isPro ||
    (!!user?.email &&
      UNRESTRICTED_PRO_EMAILS.some(
        (email) => email.toLowerCase() === user.email.toLowerCase(),
      ));
  // Mirrors food-search.tsx's own hasGoal check — an entry logged with no
  // goal to compare against isn't useful, so both write paths require one.
  const hasNutritionGoal = user?.dailyCalorieGoal != null;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildSystemPrompt(
        todayStr,
        nowStr,
        effectiveIsPro,
        hasNutritionGoal,
      ),
    },
    ...priorMessages
      .reverse()
      .map((message): ChatCompletionMessageParam => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })),
  ];

  let finalText: string | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools,
    });

    const responseMessage = completion.choices[0]?.message;
    if (!responseMessage) break;

    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      finalText = responseMessage.content ?? null;
      break;
    }

    messages.push({
      role: "assistant",
      content: responseMessage.content,
      tool_calls: responseMessage.tool_calls,
    });

    for (const toolCall of responseMessage.tool_calls) {
      if (toolCall.type !== "function") continue;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        // Malformed args from the model — fall through with an empty
        // object rather than crashing the whole turn.
      }

      const result = await executeTool(
        userId,
        toolCall.function.name,
        args,
        todayStr,
        effectiveIsPro,
        hasNutritionGoal,
      );

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  const assistantContent =
    finalText ?? "Sorry, I wasn't able to come up with an answer for that.";

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      userId,
      conversationId: conversation.id,
      role: "assistant",
      content: assistantContent,
    },
  });

  // Bumps updatedAt (no other field changes) so the conversation surfaces
  // at the top of the history list, ordered by recent activity.
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return { message: assistantMessage, conversationId: conversation.id };
};
