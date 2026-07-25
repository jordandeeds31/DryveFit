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
  getScheduleForUser,
  getProgramDayByDate,
} from "./programs.service";
import { BodyPart } from "./programs.prompts";

const getParam = (value: string | string[]): string => {
  return Array.isArray(value) ? value[0] : value;
};

export const createProgramHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const {
      name,
      description,
      startDate,
      durationDays,
      preferredDays,
      focusArea,
      sessionMinutes,
    } = req.body;

    const program = await createProgram({
      userId: req.userId!,
      name,
      description,
      startDate: new Date(startDate),
      durationDays,
      daysPerWeek: preferredDays.length,
      preferredDays,
      focusArea: focusArea as BodyPart[],
      sessionMinutes,
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

export const deactivateProgramHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const program = await deactivateProgram(
      req.userId!,
      getParam(req.params.id),
    );
    sendSuccess(res, 200, "PROGRAM_DEACTIVATED", { program });
  },
);
