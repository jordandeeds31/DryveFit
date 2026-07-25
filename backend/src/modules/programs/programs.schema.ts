import { z } from "zod";

export const weekExerciseSchema = z.object({
  exerciseName: z.string().min(1),
  muscleGroup: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  restSeconds: z.number().int().nonnegative(),
  notes: z.string().optional(),
  order: z.number().int(),
});

export const weekDaySchema = z
  .object({
    dayName: z.string().min(1),
    focus: z.string(),
    isRestDay: z.boolean(),
    exercises: z.array(weekExerciseSchema),
  })
  .transform((day) => ({
    ...day,
    focus:
      day.focus.trim().length > 0
        ? day.focus
        : day.isRestDay
          ? "Rest"
          : "General",
  }));

export const weekResponseSchema = z.object({
  days: z.array(weekDaySchema),
});

export type WeekResponse = z.infer<typeof weekResponseSchema>;
