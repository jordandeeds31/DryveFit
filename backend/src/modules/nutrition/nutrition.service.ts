import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import {
  searchInstant,
  getCommonFoodNutrients,
  getBrandedFoodNutrients,
  NutritionixFoodDetail,
} from "../../lib/nutritionix";

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

export const searchFood = async (query: string) => {
  const result = await searchInstant(query);

  const common = result.common.slice(0, 10).map((hit) => ({
    type: "common" as const,
    id: hit.food_name,
    foodName: hit.food_name,
    brandName: null,
    servingQty: hit.serving_qty,
    servingUnit: hit.serving_unit,
    photoUrl: hit.photo?.thumb ?? null,
  }));

  const branded = result.branded.slice(0, 10).map((hit) => ({
    type: "branded" as const,
    id: hit.nix_item_id,
    foodName: hit.food_name,
    brandName: hit.brand_name,
    servingQty: hit.serving_qty,
    servingUnit: hit.serving_unit,
    photoUrl: hit.photo?.thumb ?? null,
  }));

  return { common, branded };
};

const normalizeDetail = (detail: NutritionixFoodDetail) => ({
  foodName: detail.food_name,
  brandName: detail.brand_name,
  servingQty: detail.serving_qty,
  servingUnit: detail.serving_unit,
  calories: Math.round(detail.nf_calories),
  proteinG: Math.round(detail.nf_protein * 10) / 10,
  carbsG: Math.round(detail.nf_total_carbohydrate * 10) / 10,
  fatG: Math.round(detail.nf_total_fat * 10) / 10,
});

export const getFoodDetail = async (
  type: "common" | "branded",
  id: string,
) => {
  const detail =
    type === "common"
      ? await getCommonFoodNutrients(id)
      : await getBrandedFoodNutrients(id);

  if (!detail) {
    throw new AppError(404, "Couldn't find nutrition info for that food");
  }

  return normalizeDetail(detail);
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

  return entries.map((entry) => entry.date.toISOString().split("T")[0]);
};

interface NutritionProfileInput {
  gender: string;
  weightLbs: number;
  heightInches: number;
  birthdate: string;
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

  const birthdate = new Date(input.birthdate);
  if (Number.isNaN(birthdate.getTime())) {
    throw new AppError(400, "Invalid birthdate");
  }
  const age = calculateAge(birthdate);
  if (age < 13 || age > 120) {
    throw new AppError(400, "Invalid birthdate");
  }

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
    throw new AppError(400, `Calorie goal must be at least ${MIN_CALORIE_GOAL}`);
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

export const getNutritionProfile = async (userId: string) => {
  return prisma.user.findUniqueOrThrow({
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
};
