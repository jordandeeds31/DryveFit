import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import AppError from "../../utils/AppError";
import { AuthRequest } from "../../middleware/authMiddleware";
import { searchCities, findNearestCity, COUNTRIES } from "../../constants/cities";

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

// Used by signup's location-based auto-detect: finds the closest entry in
// the app's own (population-filtered) city list to a GPS fix, instead of
// requiring the device's reverse-geocoded city name to exactly match a
// listed city — see findNearestCity for why that's the real fix, not just
// a fuzzier string match.
export const getNearestCityHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const country = req.query.country;
    const state = req.query.state;

    if (Number.isNaN(lat) || Number.isNaN(lng) || typeof country !== "string") {
      throw new AppError(400, "lat, lng, and country are required");
    }

    const city = findNearestCity(
      lat,
      lng,
      country,
      typeof state === "string" ? state : undefined,
    );
    sendSuccess(res, 200, "NEAREST_CITY_FOUND", { city });
  },
);
