import prisma from "../../lib/prisma";
import openai from "../../lib/openai";
import AppError from "../../utils/AppError";
import {
  PROGRAM_DURATION_DAYS,
  ProgramDurationDays,
  BODY_PARTS,
  BodyPart,
  getWeeksPlan,
  buildWeekPrompt,
} from "./programs.prompts";
import { weekResponseSchema } from "./programs.schema";
import { CreateProgramInput } from "./programs.types";

const validateFocusArea = (focusArea: BodyPart[]) => {
  if (focusArea.length === 0) {
    throw new AppError(400, "Select at least one body part to focus on");
  }

  const invalid = focusArea.filter(
    (part) => !BODY_PARTS.includes(part as BodyPart),
  );

  if (invalid.length > 0) {
    throw new AppError(
      400,
      `Invalid focus area(s): ${invalid.join(", ")}. Must be one of: ${BODY_PARTS.join(", ")}`,
    );
  }
};

const validateProgramDates = async (input: {
  userId: string;
  startDate: Date;
  durationDays: number;
  preferredDays: string[];
}) => {
  const { userId, startDate, durationDays, preferredDays } = input;

  if (preferredDays.length === 0) {
    throw new AppError(400, "Select at least one preferred day");
  }

  if (!PROGRAM_DURATION_DAYS.includes(durationDays as ProgramDurationDays)) {
    throw new AppError(400, "Duration must be 30, 60, or 90 days");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDate < today) {
    throw new AppError(400, "Start date cannot be in the past");
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);

  const overlapping = await prisma.program.findFirst({
    where: {
      userId,
      isActive: true,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
  });

  if (overlapping) {
    throw new AppError(400, "Selected dates overlap with an existing program");
  }

  return endDate;
};

// Placeholder naming — no AI call for now. Easy to swap for an
// AI-generated name later without touching any callers.
const buildDefaultProgramName = (input: {
  durationDays: number;
  focusArea: string[];
}): string => {
  const focusLabel =
    input.focusArea.length > 0
      ? input.focusArea
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" & ")
      : "Full Body";

  return `${input.durationDays}-Day ${focusLabel} Program`;
};

export const createProgram = async (input: CreateProgramInput) => {
  validateFocusArea(input.focusArea);

  const endDate = await validateProgramDates({
    userId: input.userId,
    startDate: input.startDate,
    durationDays: input.durationDays,
    preferredDays: input.preferredDays,
  });

  const name = buildDefaultProgramName({
    durationDays: input.durationDays,
    focusArea: input.focusArea,
  });

  const program = await prisma.program.create({
    data: {
      userId: input.userId,
      name,
      description: input.description,
      startDate: input.startDate,
      endDate,
      durationDays: input.durationDays,
      daysPerWeek: input.daysPerWeek,
      preferredDays: input.preferredDays,
      focusArea: input.focusArea,
      sessionMinutes: input.sessionMinutes,
      generationStatus: "pending",
    },
  });

  generateProgramWeeks(program.id, {
    startDate: input.startDate,
    durationDays: input.durationDays,
    preferredDays: input.preferredDays,
    focusArea: input.focusArea,
    sessionMinutes: input.sessionMinutes,
  }).catch((err) => {
    console.error(`Program generation failed for ${program.id}:`, err);
  });

  return program;
};

export const getProgramsForUser = async (userId: string) => {
  return prisma.program.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
  });
};

export const getProgramById = async (userId: string, programId: string) => {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
    include: {
      weeks: {
        include: { days: { include: { exercises: true } } },
        orderBy: { weekNumber: "asc" },
      },
    },
  });

  if (!program) {
    throw new AppError(404, "Program not found");
  }

  return program;
};

export const deactivateProgram = async (userId: string, programId: string) => {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
  });

  if (!program) {
    throw new AppError(404, "Program not found");
  }

  return prisma.program.update({
    where: { id: programId },
    data: { isActive: false },
  });
};

export const getScheduleForUser = async (userId: string) => {
  const programs = await prisma.program.findMany({
    where: { userId, isActive: true },
    include: {
      weeks: {
        include: {
          days: {
            include: { exercises: true },
          },
        },
      },
    },
  });

  const scheduleMap = new Map<
    string,
    Array<{
      id: string;
      programId: string;
      programName: string;
      dayNumber: number;
      title: string;
      isCompleted: boolean;
    }>
  >();

  for (const program of programs) {
    for (const week of program.weeks) {
      for (const day of week.days) {
        const dateKey = day.date.toISOString().split("T")[0];

        const isCompleted =
          day.exercises.length > 0 &&
          day.exercises.every((exercise) => exercise.isCompleted);

        const entry = {
          id: day.id,
          programId: program.id,
          programName: program.name,
          dayNumber: day.dayNumber,
          title: day.focus,
          isCompleted,
        };

        if (!scheduleMap.has(dateKey)) {
          scheduleMap.set(dateKey, []);
        }
        scheduleMap.get(dateKey)!.push(entry);
      }
    }
  }

  return Array.from(scheduleMap.entries())
    .map(([date, programDays]) => ({ date, programDays }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getProgramDayByDate = async (
  userId: string,
  programId: string,
  dateStr: string,
) => {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
  });

  if (!program) {
    throw new AppError(404, "Program not found");
  }

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) {
    throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const day = await prisma.programDay.findFirst({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      week: { programId },
    },
    include: {
      exercises: { orderBy: { order: "asc" } },
      week: { select: { weekNumber: true } },
    },
  });

  if (!day) {
    throw new AppError(404, "No workout day found for that date");
  }

  return day;
};

const stripCodeFences = (text: string): string => {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
};

const generateProgramWeeks = async (
  programId: string,
  input: {
    startDate: Date;
    durationDays: number;
    preferredDays: string[];
    focusArea: string[];
    sessionMinutes: number;
  },
) => {
  const plan = getWeeksPlan(
    input.startDate,
    input.durationDays,
    input.preferredDays,
  );
  const totalWeeks = plan.length;
  const totalSessions = plan.reduce(
    (sum, week) => sum + week.trainingDays.length,
    0,
  );

  await prisma.program.update({
    where: { id: programId },
    data: {
      generationStatus: "generating",
      generationStep: "Analyzing your training profile...",
      generationStepIndex: 0,
      totalSessions,
      generatedSessions: 0,
    },
  });

  try {
    let generatedSessions = 0;

    for (const week of plan) {
      await prisma.program.update({
        where: { id: programId },
        data: {
          generationStep: `Building week ${week.weekNumber} of ${totalWeeks}...`,
          generationStepIndex: week.weekNumber,
        },
      });

      const prompt = buildWeekPrompt({
        weekNumber: week.weekNumber,
        totalWeeks,
        days: week.days,
        focusAreas: input.focusArea,
        sessionMinutes: input.sessionMinutes,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error(
          `No content returned from OpenAI for week ${week.weekNumber}`,
        );
      }

      const parsed = JSON.parse(stripCodeFences(rawContent));
      const validated = weekResponseSchema.parse(parsed);

      await prisma.programWeek.create({
        data: {
          programId,
          weekNumber: week.weekNumber,
          days: {
            create: validated.days.map((day, index) => ({
              dayNumber: index + 1,
              dayName: day.dayName,
              date: week.days[index]?.date ?? week.days[0].date,
              focus: day.focus,
              isRestDay: day.isRestDay,
              exercises: {
                create: day.exercises.map((exercise) => ({
                  exerciseName: exercise.exerciseName,
                  muscleGroup: exercise.muscleGroup,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restSeconds: exercise.restSeconds,
                  notes: exercise.notes,
                  order: exercise.order,
                })),
              },
            })),
          },
        },
      });

      generatedSessions += week.trainingDays.length;

      await prisma.program.update({
        where: { id: programId },
        data: { generatedSessions },
      });
    }

    await prisma.program.update({
      where: { id: programId },
      data: {
        generationStatus: "completed",
        generationStep: "Finalizing your program...",
        generationStepIndex: totalWeeks + 1,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.program.update({
      where: { id: programId },
      data: {
        generationStatus: "failed",
        generationError: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
};
