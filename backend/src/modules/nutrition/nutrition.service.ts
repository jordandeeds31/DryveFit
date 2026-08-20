import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import {
  searchFoods,
  getFoodDetail as getUsdaFoodDetail,
  UsdaSearchNutrient,
  UsdaDetailNutrient,
} from "../../lib/usdaFoodData";

// USDA "nutrient number" codes — stable identifiers across dataTypes and
// across the search vs. detail response shapes, unlike nutrientId.
const NUTRIENT_NUMBERS = {
  calories: "208",
  protein: "203",
  fat: "204",
  carbs: "205",
};

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
export const ACTIVITY_LEVELS = Object.keys(ACTIVITY_MULTIPLIERS);

export const GOAL_TYPES = [
  "lose",
  "maintain",
  "gain",
  "build_muscle",
  "recomp",
] as const;
export type NutritionGoalType = (typeof GOAL_TYPES)[number];

// Calorie offset from TDEE per goal.
const GOAL_CALORIE_ADJUSTMENTS: Record<NutritionGoalType, number> = {
  lose: -500,
  maintain: 0,
  // A smaller surplus than a plain "gain" — a lean bulk favors muscle
  // over fat gain, so it doesn't need the full +500.
  build_muscle: 250,
  gain: 500,
  // Recomp runs at maintenance calories — the body-composition change
  // comes from the macro split (below), not a calorie surplus/deficit.
  recomp: 0,
};

// protein/carbs/fat as fractions of total calories, per goal — a cut and a
// lean bulk both lean on more protein than a flat 30/40/30 would give
// (preserving muscle in a deficit, building it in a surplus); recomp pushes
// protein highest of all since it's doing both at once.
const MACRO_SPLITS: Record<
  NutritionGoalType,
  { protein: number; carbs: number; fat: number }
> = {
  lose: { protein: 0.35, carbs: 0.35, fat: 0.3 },
  maintain: { protein: 0.3, carbs: 0.4, fat: 0.3 },
  gain: { protein: 0.25, carbs: 0.45, fat: 0.3 },
  build_muscle: { protein: 0.35, carbs: 0.4, fat: 0.25 },
  recomp: { protein: 0.4, carbs: 0.35, fat: 0.25 },
};

const VALID_GENDERS = ["male", "female"] as const;

// Below this, a calculated deficit goal risks being nutritionally unsafe
// regardless of how low the person's TDEE actually is.
const MIN_CALORIE_GOAL = 1200;

const parseDateKey = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return {
    startOfDay: new Date(year, month - 1, day, 0, 0, 0, 0),
    endOfDay: new Date(year, month - 1, day, 23, 59, 59, 999),
    loggedAt: new Date(year, month - 1, day),
  };
};

// date is stored as local midnight (see parseDateKey above), not a real
// timezone-aware instant — .toISOString() converts to UTC first, which
// silently shifts the calendar day by one whenever the server process
// isn't running in UTC. Building the key from local components instead
// keeps it consistent with how parseDateKey constructed the value in the
// first place.
const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const searchFood = async (query: string) => {
  const hits = await searchFoods(query);

  const common: Array<{
    type: "common";
    id: string;
    foodName: string;
    brandName: string | null;
    servingQty: number;
    servingUnit: string;
    photoUrl: null;
  }> = [];
  const branded: Array<{
    type: "branded";
    id: string;
    foodName: string;
    brandName: string | null;
    servingQty: number;
    servingUnit: string;
    photoUrl: null;
  }> = [];

  for (const hit of hits) {
    // Foundation/SR Legacy/Survey entries report nutrients per 100g with
    // no natural "1 serving" concept — 100g is an honest, functional
    // stand-in, just less natural-language-friendly than a real serving.
    const entry = {
      id: String(hit.fdcId),
      foodName: hit.description,
      brandName: hit.brandOwner ?? hit.brandName ?? null,
      servingQty: hit.servingSize ?? 100,
      servingUnit: hit.servingSizeUnit ?? "g",
      photoUrl: null,
    };

    if (hit.dataType === "Branded") {
      branded.push({ type: "branded", ...entry });
    } else {
      common.push({ type: "common", ...entry });
    }
  }

  return { common: common.slice(0, 10), branded: branded.slice(0, 10) };
};

const findNutrientAmount = (
  nutrients: Array<UsdaSearchNutrient | UsdaDetailNutrient>,
  number: string,
): number => {
  for (const n of nutrients) {
    if ("nutrient" in n) {
      if (n.nutrient.number === number) return n.amount ?? 0;
    } else if (n.nutrientNumber === number) {
      return n.value ?? 0;
    }
  }
  return 0;
};

// The `type` param is kept for API-shape compatibility with the
// frontend/controller (which still send it from the search hit) — USDA's
// detail endpoint looks foods up by fdcId the same way regardless of
// common vs. branded, unlike Nutritionix's split endpoints.
export const getFoodDetail = async (
  _type: "common" | "branded",
  id: string,
) => {
  const detail = await getUsdaFoodDetail(id).catch(() => null);

  if (!detail) {
    throw new AppError(404, "Couldn't find nutrition info for that food");
  }

  return {
    foodName: detail.description,
    brandName: detail.brandOwner ?? detail.brandName ?? null,
    servingQty: detail.servingSize ?? 100,
    servingUnit: detail.servingSizeUnit ?? "g",
    calories: Math.round(
      findNutrientAmount(detail.foodNutrients, NUTRIENT_NUMBERS.calories),
    ),
    proteinG:
      Math.round(
        findNutrientAmount(detail.foodNutrients, NUTRIENT_NUMBERS.protein) * 10,
      ) / 10,
    carbsG:
      Math.round(
        findNutrientAmount(detail.foodNutrients, NUTRIENT_NUMBERS.carbs) * 10,
      ) / 10,
    fatG:
      Math.round(
        findNutrientAmount(detail.foodNutrients, NUTRIENT_NUMBERS.fat) * 10,
      ) / 10,
  };
};

interface LogFoodInput {
  date: string;
  mealType: MealType;
  foodName: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const logFood = async (userId: string, input: LogFoodInput) => {
  const { loggedAt } = parseDateKey(input.date);

  return prisma.foodLogEntry.create({
    data: {
      userId,
      date: loggedAt,
      mealType: input.mealType,
      foodName: input.foodName,
      brandName: input.brandName,
      servingQty: input.servingQty,
      servingUnit: input.servingUnit,
      calories: input.calories,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
    },
  });
};

export const deleteFoodLogEntry = async (userId: string, entryId: string) => {
  const entry = await prisma.foodLogEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!entry) {
    throw new AppError(404, "Food log entry not found");
  }

  await prisma.foodLogEntry.delete({ where: { id: entryId } });
};

const GOAL_SELECT = {
  dailyCalorieGoal: true,
  dailyProteinGoalG: true,
  dailyCarbGoalG: true,
  dailyFatGoalG: true,
} as const;

export const getDiaryForDate = async (userId: string, dateStr: string) => {
  const { startOfDay, endOfDay } = parseDateKey(dateStr);

  const [entries, user] = await Promise.all([
    prisma.foodLogEntry.findMany({
      where: { userId, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: GOAL_SELECT,
    }),
  ]);

  const meals: Record<MealType, typeof entries> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  };
  for (const entry of entries) {
    if (entry.mealType in meals) {
      meals[entry.mealType as MealType].push(entry);
    }
  }

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      proteinG: acc.proteinG + entry.proteinG,
      carbsG: acc.carbsG + entry.carbsG,
      fatG: acc.fatG + entry.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const hasGoal = user.dailyCalorieGoal != null;

  return {
    meals,
    totals,
    goal: hasGoal
      ? {
          calories: user.dailyCalorieGoal,
          proteinG: user.dailyProteinGoalG,
          carbsG: user.dailyCarbGoalG,
          fatG: user.dailyFatGoalG,
        }
      : null,
  };
};

// Per-day dots on the nutrition calendar — cheap existence check per date,
// not the full diary.
export const getLoggedDateKeys = async (
  userId: string,
  startDate: string,
  endDate: string,
) => {
  const { startOfDay } = parseDateKey(startDate);
  const { endOfDay } = parseDateKey(endDate);

  const entries = await prisma.foodLogEntry.findMany({
    where: { userId, date: { gte: startOfDay, lte: endOfDay } },
    select: { date: true },
    distinct: ["date"],
  });

  return entries.map((entry) => toLocalDateKey(entry.date));
};

const PUBLIC_NUTRITION_HISTORY_DAYS = 7;

// Shown on another user's public profile's Nutrition tab — gated by the
// same isLeaderboardVisible/username eligibility as
// getPublicProfile/getPublicWorkoutHistory. Only calendar days that
// actually have a logged entry appear (no empty-day placeholders), same
// as the workout history section's "only real logs" convention.
export const getPublicNutritionHistory = async (targetUserId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      isLeaderboardVisible: true,
      username: { not: null },
    },
    select: { id: true },
  });

  if (!user) {
    throw new AppError(404, "Profile not found");
  }

  const today = new Date();
  const windowStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - (PUBLIC_NUTRITION_HISTORY_DAYS - 1),
  );

  const entries = await prisma.foodLogEntry.findMany({
    where: { userId: targetUserId, date: { gte: windowStart } },
    orderBy: { createdAt: "asc" },
  });

  const dayMap = new Map<
    string,
    {
      date: string;
      totals: {
        calories: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
      };
      meals: Record<MealType, typeof entries>;
    }
  >();

  for (const entry of entries) {
    const dateKey = toLocalDateKey(entry.date);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
      });
    }

    const day = dayMap.get(dateKey)!;
    day.totals.calories += entry.calories;
    day.totals.proteinG += entry.proteinG;
    day.totals.carbsG += entry.carbsG;
    day.totals.fatG += entry.fatG;
    if (entry.mealType in day.meals) {
      day.meals[entry.mealType as MealType].push(entry);
    }
  }

  return Array.from(dayMap.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
};

interface NutritionProfileInput {
  gender: string;
  weightLbs: number;
  heightInches: number;
  age: number;
  activityLevel: string;
  goalType: NutritionGoalType;
}

const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthdate.getMonth() ||
    (today.getMonth() === birthdate.getMonth() &&
      today.getDate() >= birthdate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
};

// Mifflin-St Jeor BMR -> activity-scaled TDEE -> goal-adjusted calorie
// target -> a standard 30/40/30 protein/carb/fat split. Deliberately not
// configurable per-macro-percentage for now — a flat, reasonable default
// covers the common case, and the resolved goal fields are independently
// editable afterward if someone wants to fine-tune.
export const updateNutritionProfile = async (
  userId: string,
  input: NutritionProfileInput,
) => {
  if (!VALID_GENDERS.includes(input.gender as (typeof VALID_GENDERS)[number])) {
    throw new AppError(400, "Invalid gender");
  }
  if (input.weightLbs <= 0 || input.weightLbs > 1000) {
    throw new AppError(400, "Invalid weight");
  }
  if (input.heightInches <= 0 || input.heightInches > 108) {
    throw new AppError(400, "Invalid height");
  }
  if (!ACTIVITY_LEVELS.includes(input.activityLevel)) {
    throw new AppError(400, "Invalid activity level");
  }
  if (!GOAL_TYPES.includes(input.goalType as NutritionGoalType)) {
    throw new AppError(400, "Invalid goal type");
  }

  if (!Number.isInteger(input.age) || input.age < 13 || input.age > 120) {
    throw new AppError(400, "Invalid age");
  }
  const age = input.age;
  // No exact birthdate is collected anymore (see NutritionSetup.tsx) — the
  // User.birthdate column still exists for storage/history, so age is
  // re-derived from today's month/day going forward, which keeps
  // calculateAge(birthdate) reproducing this same age if read back later
  // this year.
  const today = new Date();
  const birthdate = new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate(),
  );

  const weightKg = input.weightLbs * 0.453592;
  const heightCm = input.heightInches * 2.54;

  const bmr =
    input.gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];
  const adjustedCalories = tdee + GOAL_CALORIE_ADJUSTMENTS[input.goalType];

  const dailyCalorieGoal = Math.max(
    MIN_CALORIE_GOAL,
    Math.round(adjustedCalories),
  );
  const split = MACRO_SPLITS[input.goalType];
  const dailyProteinGoalG = Math.round((dailyCalorieGoal * split.protein) / 4);
  const dailyCarbGoalG = Math.round((dailyCalorieGoal * split.carbs) / 4);
  const dailyFatGoalG = Math.round((dailyCalorieGoal * split.fat) / 9);

  return prisma.user.update({
    where: { id: userId },
    data: {
      gender: input.gender,
      weightLbs: input.weightLbs,
      heightInches: input.heightInches,
      birthdate,
      activityLevel: input.activityLevel,
      nutritionGoalType: input.goalType,
      dailyCalorieGoal,
      dailyProteinGoalG,
      dailyCarbGoalG,
      dailyFatGoalG,
    },
    select: GOAL_SELECT,
  });
};

interface GoalOverrideInput {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const updateNutritionGoalOverride = async (
  userId: string,
  input: GoalOverrideInput,
) => {
  if (input.calories < MIN_CALORIE_GOAL || input.calories > 10000) {
    throw new AppError(
      400,
      `Calorie goal must be at least ${MIN_CALORIE_GOAL}`,
    );
  }
  if (
    input.proteinG < 0 ||
    input.carbsG < 0 ||
    input.fatG < 0 ||
    input.proteinG > 1000 ||
    input.carbsG > 1000 ||
    input.fatG > 1000
  ) {
    throw new AppError(400, "Invalid macro goal");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      dailyCalorieGoal: Math.round(input.calories),
      dailyProteinGoalG: Math.round(input.proteinG),
      dailyCarbGoalG: Math.round(input.carbsG),
      dailyFatGoalG: Math.round(input.fatG),
    },
    select: GOAL_SELECT,
  });
};

// Muscle protein synthesis floor independent of whatever calorie/protein
// goal is set — roughly the low end of the range shown to support muscle
// growth across a body of resistance-training research (Schoenfeld &
// Aragon's meta-analyses land around 0.7-1g/lb, 1.6-2.2g/kg).
const PROTEIN_FLOOR_G_PER_LB = 0.7;

// Within this ratio of the calorie goal counts as "on target" rather than
// meaningfully under/over — no single-day number is exact enough to treat
// a 2% miss as a real deficit/surplus.
const CALORIE_TARGET_TOLERANCE = 0.15;

export const getDailyRecap = async (userId: string, dateStr: string) => {
  const { startOfDay, endOfDay } = parseDateKey(dateStr);

  const [workoutLogs, diary, user] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId, loggedAt: { gte: startOfDay, lte: endOfDay } },
      include: { exercises: { include: { sets: true } } },
    }),
    getDiaryForDate(userId, dateStr),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { weightLbs: true },
    }),
  ]);

  const allSets = workoutLogs.flatMap((log) =>
    log.exercises.flatMap((exercise) => exercise.sets),
  );
  const exerciseCount = new Set(
    workoutLogs.flatMap((log) => log.exercises.map((ex) => ex.exerciseName)),
  ).size;
  const totalSets = allSets.length;
  const totalVolume = Math.round(
    allSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0),
  );
  const trained = totalSets > 0;

  const proteinActual = diary.totals.proteinG;
  const proteinGoal = diary.goal?.proteinG ?? null;
  const proteinPercentOfGoal =
    proteinGoal != null
      ? Math.round((proteinActual / proteinGoal) * 100)
      : null;
  const meetsProteinGoal =
    proteinGoal != null && proteinActual >= proteinGoal * 0.9;

  const proteinFloor =
    user.weightLbs != null ? user.weightLbs * PROTEIN_FLOOR_G_PER_LB : null;
  const meetsProteinFloor =
    proteinFloor != null && proteinActual >= proteinFloor;

  const calorieActual = diary.totals.calories;
  const calorieGoal = diary.goal?.calories ?? null;
  let calorieStatus: "under" | "on_target" | "over" | "unknown" = "unknown";
  if (calorieGoal != null) {
    const ratio = calorieActual / calorieGoal;
    calorieStatus =
      ratio < 1 - CALORIE_TARGET_TOLERANCE
        ? "under"
        : ratio > 1 + CALORIE_TARGET_TOLERANCE
          ? "over"
          : "on_target";
  }

  // A same-day training/nutrition alignment check, not a claim that
  // muscle tissue was actually gained today — that's only observable over
  // weeks, and only via real body-composition measurement, not diary data.
  const supportsMuscleGain =
    trained &&
    (meetsProteinGoal || meetsProteinFloor) &&
    calorieStatus !== "under";

  return {
    training: { trained, exerciseCount, totalSets, totalVolume },
    protein: {
      actualG: Math.round(proteinActual * 10) / 10,
      goalG: proteinGoal,
      percentOfGoal: proteinPercentOfGoal,
      floorG: proteinFloor != null ? Math.round(proteinFloor) : null,
      meetsFloor: meetsProteinFloor,
    },
    calories: {
      actual: calorieActual,
      goal: calorieGoal,
      status: calorieStatus,
    },
    supportsMuscleGain,
  };
};

export const getNutritionProfile = async (userId: string) => {
  const { birthdate, ...user } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      gender: true,
      weightLbs: true,
      heightInches: true,
      birthdate: true,
      activityLevel: true,
      nutritionGoalType: true,
      ...GOAL_SELECT,
    },
  });

  return { ...user, age: birthdate ? calculateAge(birthdate) : null };
};
