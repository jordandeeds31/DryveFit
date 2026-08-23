import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import { searchCities, COUNTRIES } from "../../constants/cities";

export const searchCitiesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const query = req.query.q;
    const country = req.query.country;
    const cities = searchCities(
      typeof query === "string" ? query : "",
      typeof country === "string" ? country : undefined,
    );
    sendSuccess(res, 200, "CITIES_SEARCHED", { cities });
  },
);

export const getCountriesHandler = catchAsync(
  async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, 200, "COUNTRIES_FETCHED", { countries: COUNTRIES });
  },
);
