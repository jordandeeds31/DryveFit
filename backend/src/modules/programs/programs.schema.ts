import { z } from "zod";

export const weekExerciseSchema = z.object({
  exerciseName: z.string().min(1),
  muscleGroup: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  restSeconds: z.number().int().nonnegative(),
  notes: z.string().optional(),
  // The AI is asked to include this, but occasionally drops it for a
  // handful of entries in a longer response — the persisted order is
  // derived from each exercise's final array position at write time
  // instead, so this is never load-bearing and must not reject the whole
  // week's generation just because it's missing.
  order: z.number().int().optional(),
  recommendedWeight: z.number().positive().optional(),
});

export const weekDaySchema = z
  .object({
    dayName: z.string().min(1),
    focus: z.string(),
    isRestDay: z.boolean(),
    // The AI sometimes omits "exercises" entirely for rest days instead of
    // returning an empty array — default it rather than failing the whole
    // week's generation over a rest day.
    exercises: z.array(weekExerciseSchema).optional().default([]),
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
