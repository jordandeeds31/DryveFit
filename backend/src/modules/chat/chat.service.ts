import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
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

const MODEL = "gpt-4o-mini";
// How many prior persisted turns to replay back to OpenAI — bounds cost per
// message without needing real conversation summarization for v1.
const HISTORY_LIMIT = 40;
// Tool-calling round-trips per user message — a hard ceiling in case the
// model gets stuck repeatedly calling tools instead of answering.
const MAX_TOOL_ROUNDS = 5;

// Weight is always persisted in lbs (see frontend/lib/utils/units.ts's
// toStoredLbs) regardless of the user's display unitSystem — the
// log_workout_sets tool accepts either unit from the model and converts
// here so the stored value matches what every other write path produces.
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

const buildSystemPrompt = (todayStr: string): string => `You are DryveFit AI Coach, the AI coach built into DryveFit, a fitness tracking app. You're chatting directly with the user about their own training.

Today's date (the user's own local calendar date) is ${todayStr}. Use this to resolve relative dates like "today" or "yesterday" — never guess or use a different date.

You have tools to fetch this user's real workout logs, lifting personal records, cardio sessions, and active program — always call a tool to get real numbers instead of guessing or making anything up. If a tool returns no data, say so plainly rather than inventing an answer.

You can also log completed workouts for the user. Two different tools do this, and picking the right one matters:

- log_program_exercise (after calling get_program_day first) — use this whenever the workout is part of the user's active program: "log today's workout", "I completed the plan", "log the recommended sets for bench press". get_program_day tells you exactly what's prescribed for a date (each exercise's programExerciseId, sets, reps, recommendedWeight) — always call it first, never guess a programExerciseId. If the user says something like "log it as prescribed"/"as planned" without giving their own numbers, use the prescribed sets/reps/recommendedWeight straight from get_program_day. This is what actually marks the exercise (and the whole day, once every exercise in it is logged) as completed in their program.
- log_workout_sets — use this for anything NOT part of the active program: extra work on top of the plan, a standalone workout on a day with no scheduled program day, or when the user gives specific numbers for an exercise that isn't in today's plan. This never affects program completion tracking.

Call the appropriate tool directly, without asking for confirmation first, when the user states a plain factual completion like the examples above — that's exactly what they asked for. Only ask a clarifying question first if something's genuinely ambiguous (e.g. the exercise name doesn't clearly match one thing, there's no scheduled program day for that date, or reps/weight are missing and not "as prescribed"). After a tool call succeeds, confirm back to the user exactly what got logged (exercise, sets, weight, reps, date). If a tool errors — e.g. no matching exercise, multiple exercises match, or no program day found — relay that plainly and ask them to clarify rather than guessing.

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
      name: "log_workout_sets",
      description:
        "Log one or more completed sets of a single exercise for the user, for a given date. Adds to whatever's already logged that day rather than replacing it — safe to call even if other exercises were already logged for the same date. If the exercise name doesn't clearly match exactly one exercise in the catalog, this returns an error listing the possible matches instead of guessing.",
      parameters: {
        type: "object",
        properties: {
          exerciseName: {
            type: "string",
            description:
              "The exercise name as the user said it, e.g. \"barbell bench press\". Matched case-insensitively against the exercise catalog.",
          },
          sets: {
            type: "array",
            description: "Each set completed, in order.",
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
            description: "Date to log for, as YYYY-MM-DD. Defaults to today (see the date given in the system prompt) if omitted.",
          },
        },
        required: ["exerciseName", "sets"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_program_day",
      description:
        "Get the user's active program's prescribed exercises for a specific date — each exercise's programExerciseId, prescribed sets/reps, recommended weight, and whether it's already completed. Always call this before log_program_exercise to get the correct programExerciseId; never guess it. Returns an error if the user has no active program or no scheduled day on that date.",
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
      name: "log_program_exercise",
      description:
        "Log completed sets against ONE prescribed exercise from the user's active program — use this (not log_workout_sets) whenever the user is logging a workout that's part of their program plan. Correctly marks that exercise, and the whole day once every exercise in it is logged, as completed. Requires the programExerciseId from get_program_day — call that first.",
      parameters: {
        type: "object",
        properties: {
          programExerciseId: {
            type: "string",
            description: "The id of the specific exercise being logged, from get_program_day's exercises list.",
          },
          sets: {
            type: "array",
            description: "Each set completed, in order. If the user said to log it as prescribed, use get_program_day's sets count/reps/recommendedWeight for these.",
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
        },
        required: ["programExerciseId", "sets"],
      },
    },
  },
];

const clampLimit = (value: unknown, fallback: number, max: number): number => {
  const n = typeof value === "number" ? value : fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
};

const DATE_STR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Shared between log_workout_sets and log_program_exercise — both take the
// same { weight, reps }[] shape plus an optional unit for the weight.
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

    case "log_workout_sets": {
      const exerciseName = args.exerciseName;
      if (typeof exerciseName !== "string" || exerciseName.trim() === "") {
        return { error: "exerciseName is required" };
      }

      const parsed = parseToolSets(args.sets, args.weightUnit);
      if ("error" in parsed) return parsed;

      const date =
        typeof args.date === "string" && DATE_STR_PATTERN.test(args.date)
          ? args.date
          : todayStr;

      try {
        return await logExerciseSetsForDate(userId, exerciseName, parsed.sets, date);
      } catch (err) {
        return {
          error: err instanceof AppError ? err.message : "Failed to log the workout",
        };
      }
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
            sets: exercise.sets,
            reps: exercise.reps,
            recommendedWeight: exercise.recommendedWeight,
            isCompleted: exercise.isCompleted,
          })),
        };
      } catch (err) {
        return {
          error: err instanceof AppError ? err.message : "Failed to load the program day",
        };
      }
    }

    case "log_program_exercise": {
      const programExerciseId = args.programExerciseId;
      if (typeof programExerciseId !== "string" || programExerciseId.trim() === "") {
        return { error: "programExerciseId is required — call get_program_day first to get it" };
      }

      const parsed = parseToolSets(args.sets, args.weightUnit);
      if ("error" in parsed) return parsed;

      try {
        return await logExercisePerformance(userId, programExerciseId, parsed.sets);
      } catch (err) {
        return {
          error: err instanceof AppError ? err.message : "Failed to log the exercise",
        };
      }
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

export const sendChatMessage = async (
  userId: string,
  content: string,
  conversationId?: string,
) => {
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
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);

  const todayStr = getUserLocalDateStr(user?.timezone ?? null);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(todayStr) },
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
