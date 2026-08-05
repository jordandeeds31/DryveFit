import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  createProgram,
  getProgramsForUser,
  getProgramById,
  deactivateProgram,
  deleteProgram,
  getScheduleForUser,
  getProgramDayByDate,
  logExercisePerformance,
  deleteExercisePerformance,
  swapProgramExercise,
  addProgramExercise,
  revertDaySwaps,
  deleteProgramExercise,
} from "./programs.service";
import {
  TrainingSplit,
  FitnessLevel,
  EquipmentAccess,
  TrainingGoal,
} from "./programs.prompts";

const getParam = (value: string | string[]): string => {
  return Array.isArray(value) ? value[0] : value;
};

// Strips the time-of-day component so startDate always represents a
// clean local calendar date, regardless of what time-of-day the
// client's timestamp happened to carry.
const normalizeToLocalMidnight = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const createProgramHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const {
      description,
      startDate,
      durationDays,
      preferredDays,
      trainingSplit,
      sessionMinutes,
      fitnessLevel,
      equipmentAccess,
      trainingGoal,
    } = req.body;

    const parsedStartDate = normalizeToLocalMidnight(new Date(startDate));

    const program = await createProgram({
      userId: req.userId!,
      description,
      startDate: parsedStartDate,
      durationDays,
      daysPerWeek: preferredDays.length,
      preferredDays,
      trainingSplit: trainingSplit as TrainingSplit,
      sessionMinutes,
      fitnessLevel: fitnessLevel as FitnessLevel,
      equipmentAccess: equipmentAccess as EquipmentAccess,
      trainingGoal: trainingGoal as TrainingGoal,
    });

    sendSuccess(res, 201, "PROGRAM_CREATED", { program });
  },
);

export const listProgramsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const programs = await getProgramsForUser(req.userId!);
    sendSuccess(res, 200, "PROGRAMS_FETCHED", { programs });
  },
);

export const getScheduleHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const schedule = await getScheduleForUser(req.userId!);
    sendSuccess(res, 200, "SCHEDULE_FETCHED", { schedule });
  },
);

export const getProgramDayHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const programId = getParam(req.params.id);
    const date = req.query.date;

    if (!date || typeof date !== "string") {
      throw new AppError(400, "date query parameter is required");
    }

    const day = await getProgramDayByDate(req.userId!, programId, date);
    sendSuccess(res, 200, "PROGRAM_DAY_FETCHED", { day });
  },
);

export const getProgramHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const program = await getProgramById(req.userId!, getParam(req.params.id));
    sendSuccess(res, 200, "PROGRAM_FETCHED", { program });
  },
);

export const logExercisePerformanceHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const programExerciseId = getParam(req.params.exerciseId);
    const { sets, durationSecs } = req.body;

    if (!Array.isArray(sets)) {
      throw new AppError(400, "sets must be an array");
    }
    if (durationSecs !== undefined && typeof durationSecs !== "number") {
      throw new AppError(400, "durationSecs must be a number");
    }

    const workoutLog = await logExercisePerformance(
      req.userId!,
      programExerciseId,
      sets,
      durationSecs,
    );

    sendSuccess(res, 201, "EXERCISE_LOGGED", { workoutLog });
  },
);

export const deleteExercisePerformanceHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const programExerciseId = getParam(req.params.exerciseId);
    await deleteExercisePerformance(req.userId!, programExerciseId);
    sendSuccess(res, 200, "EXERCISE_LOG_DELETED", {});
  },
);

export const deleteProgramExerciseHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const programExerciseId = getParam(req.params.exerciseId);
    await deleteProgramExercise(req.userId!, programExerciseId);
    sendSuccess(res, 200, "EXERCISE_DELETED", {});
  },
);

export const swapProgramExerciseHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const programExerciseId = getParam(req.params.exerciseId);
    const { newExerciseId } = req.body;

    if (!newExerciseId || typeof newExerciseId !== "string") {
      throw new AppError(400, "newExerciseId is required");
    }

    const exercise = await swapProgramExercise(
      req.userId!,
      programExerciseId,
      newExerciseId,
    );

    sendSuccess(res, 200, "EXERCISE_SWAPPED", { exercise });
  },
);

export const addProgramExerciseHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const dayId = getParam(req.params.dayId);
    const { exerciseId, sets, reps, restSeconds, notes } = req.body;

    if (!exerciseId || typeof exerciseId !== "string") {
      throw new AppError(400, "exerciseId is required");
    }
    if (typeof sets !== "number" || typeof reps !== "number") {
      throw new AppError(400, "sets and reps must be numbers");
    }
    if (typeof restSeconds !== "number") {
      throw new AppError(400, "restSeconds must be a number");
    }
    if (notes !== undefined && typeof notes !== "string") {
      throw new AppError(400, "notes must be a string");
    }

    const exercise = await addProgramExercise(req.userId!, dayId, {
      exerciseId,
      sets,
      reps,
      restSeconds,
      notes,
    });

    sendSuccess(res, 201, "EXERCISE_ADDED", { exercise });
  },
);

export const revertDaySwapsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const dayId = getParam(req.params.dayId);
    await revertDaySwaps(req.userId!, dayId);
    sendSuccess(res, 200, "DAY_SWAPS_REVERTED", {});
  },
);

export const deactivateProgramHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const program = await deactivateProgram(
      req.userId!,
      getParam(req.params.id),
    );
    sendSuccess(res, 200, "PROGRAM_DEACTIVATED", { program });
  },
);

export const deleteProgramHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await deleteProgram(req.userId!, getParam(req.params.id));
    sendSuccess(res, 200, "PROGRAM_DELETED", {});
  },
);
