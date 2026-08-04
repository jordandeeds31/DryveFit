import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import { searchCities } from "../../constants/cities";

export const searchCitiesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const query = req.query.q;
    const cities = searchCities(typeof query === "string" ? query : "");
    sendSuccess(res, 200, "CITIES_SEARCHED", { cities });
  },
);
