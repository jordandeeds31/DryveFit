export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little to no exercise)",
  light: "Light (exercise 1-3 days/week)",
  moderate: "Moderate (exercise 3-5 days/week)",
  active: "Active (exercise 6-7 days/week)",
  very_active: "Very active (hard exercise + physical job)",
};

export const GOAL_TYPES = [
  "lose",
  "maintain",
  "gain",
  "build_muscle",
  "recomp",
] as const;
export type NutritionGoalType = (typeof GOAL_TYPES)[number];

export const GOAL_TYPE_LABELS: Record<NutritionGoalType, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  gain: "Gain weight",
  build_muscle: "Build muscle",
  recomp: "Lose fat & build muscle",
};

export interface FoodLogEntry {
  id: string;
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

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionGoal {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DailyRecap {
  training: {
    trained: boolean;
    exerciseCount: number;
    totalSets: number;
    totalVolume: number;
  };
  protein: {
    actualG: number;
    goalG: number | null;
    percentOfGoal: number | null;
    floorG: number | null;
    meetsFloor: boolean;
  };
  calories: {
    actual: number;
    goal: number | null;
    status: "under" | "on_target" | "over" | "unknown";
  };
  supportsMuscleGain: boolean;
}

export interface DiaryResponse {
  meals: Record<MealType, FoodLogEntry[]>;
  totals: NutritionTotals;
  goal: NutritionGoal | null;
}

export interface FoodSearchHit {
  type: "common" | "branded";
  id: string;
  foodName: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  photoUrl: string | null;
}

export interface FoodSearchResults {
  common: FoodSearchHit[];
  branded: FoodSearchHit[];
}

export interface FoodDetail {
  foodName: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionProfile {
  gender: string | null;
  weightLbs: number | null;
  heightInches: number | null;
  age: number | null;
  activityLevel: ActivityLevel | null;
  nutritionGoalType: NutritionGoalType | null;
  dailyCalorieGoal: number | null;
  dailyProteinGoalG: number | null;
  dailyCarbGoalG: number | null;
  dailyFatGoalG: number | null;
}
