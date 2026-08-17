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
} from "../workoutLogs/workoutLogs.service";
import {
  getExercise1RMHistory,
  getPersonalRecordsForUser,
} from "../exercises/exercises.service";
import { getActiveProgramForUser } from "../programs/programs.service";
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

const SYSTEM_PROMPT = `You are DryveFit AI Coach, the AI coach built into DryveFit, a fitness tracking app. You're chatting directly with the user about their own training.

You have tools to fetch this user's real workout logs, lifting personal records, cardio sessions, and active program — always call a tool to get real numbers instead of guessing or making anything up. If a tool returns no data, say so plainly rather than inventing an answer.

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
];

const clampLimit = (value: unknown, fallback: number, max: number): number => {
  const n = typeof value === "number" ? value : fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
};

const executeTool = async (
  userId: string,
  name: string,
  args: Record<string, unknown>,
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

  const priorMessages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
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

      const result = await executeTool(userId, toolCall.function.name, args);

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
