import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import AnimatedProgressBar from "@/components/shared/AnimatedProgressBar/AnimatedProgressBar";
import NutritionCalendar from "@/features/NutritionCalendar/NutritionCalendar";
import NutritionSetup from "@/features/NutritionSetup/NutritionSetup";
import {
  useNutritionProfile,
  useDiary,
  useDailyRecap,
  useLoggedDateKeys,
  useDeleteFoodLogEntry,
} from "@/hooks/useNutrition";
import { useCurrentUser } from "@/hooks/useUsers";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { displayWeight, weightUnitLabel } from "@/lib/utils/units";
import {
  getWeekDates,
  toDateKey,
  isSameDay,
  startOfDay,
} from "@/lib/utils/date.utils";
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  MealType,
  FoodLogEntry,
  DailyRecap,
} from "@/types/nutrition.types";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const MacroBar = ({
  label,
  consumed,
  goal,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
}) => {
  const percent = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValue}>
          {Math.round(consumed)}
          {goal > 0 ? ` / ${goal}g` : "g"}
        </Text>
      </View>
      <AnimatedProgressBar percent={percent} color={color} />
    </View>
  );
};

const CALORIE_STATUS_LABELS: Record<DailyRecap["calories"]["status"], string> =
  {
    under: "under target",
    on_target: "on target",
    over: "over target",
    unknown: "no goal set",
  };

// Mirrors exactly what the backend's `supportsMuscleGain` boolean checks,
// in the same order, so whichever condition this returns first is
// guaranteed to be the actual reason it's false — never a text that
// contradicts the badge above it.
const buildRecapVerdict = (recap: DailyRecap): string => {
  if (!recap.training.trained) {
    return "No workout logged today — training is what creates the stimulus for muscle growth in the first place.";
  }
  const meetsProteinGoal =
    recap.protein.percentOfGoal != null && recap.protein.percentOfGoal >= 90;
  if (!meetsProteinGoal && !recap.protein.meetsFloor) {
    return `Protein came in low${
      recap.protein.floorG != null
        ? ` — under the ~${recap.protein.floorG}g floor for your bodyweight`
        : ""
    }. That limits how much of today's training can translate into muscle.`;
  }
  if (recap.calories.status === "under") {
    return "Calories were well under target — a significant deficit blunts muscle building even with good protein and training.";
  }
  return "Training, protein, and calories all lined up today — good conditions for muscle growth.";
};

const NutritionScreen = () => {
  const { openSetup } = useLocalSearchParams<{ openSetup?: string }>();

  const queryClient = useQueryClient();

  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isRecapOpen, setIsRecapOpen] = useState(false);

  // food-search redirects here with ?openSetup=1 when someone tries to log
  // food before setting up a goal — this is what actually opens the modal
  // for them instead of just landing back on the tab.
  useEffect(() => {
    if (openSetup === "1") {
      setIsSetupOpen(true);
      router.setParams({ openSetup: undefined });
    }
  }, [openSetup]);

  // Workouts get logged from completely different screens (Home,
  // Cinematic Mode) that have no reason to know this tab's cache keys
  // exist, and tabs stay mounted across switches rather than remounting —
  // so without this, the recap/diary silently keep showing whatever was
  // true the last time this tab was actually focused.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["dailyRecap"] });
      queryClient.invalidateQueries({ queryKey: ["diary"] });
      queryClient.invalidateQueries({ queryKey: ["loggedDateKeys"] });
    }, [queryClient]),
  );

  const weekDates = getWeekDates(referenceDate);
  const selectedDateKey = toDateKey(selectedDate);

  const { data: profile, isLoading: isProfileLoading } = useNutritionProfile();
  const { data: diary, isLoading: isDiaryLoading } = useDiary(selectedDateKey);
  const { data: recapData } = useDailyRecap(selectedDateKey);
  const recap: DailyRecap | undefined = recapData;
  const { data: currentUser } = useCurrentUser();
  const unitSystem = useUnitSystem();

  // Nothing to log before the account existed — same "can't page past the
  // earliest real thing" pattern as the Home screen's program calendar.
  const earliestWeekStart = currentUser
    ? startOfDay(getWeekDates(new Date(currentUser.createdAt))[0])
    : null;

  const canGoToPreviousWeek =
    !earliestWeekStart ||
    startOfDay(weekDates[0]).getTime() > earliestWeekStart.getTime();

  // Covers the previous/current/next week pages the calendar can page
  // into without a refetch, same 3-page window NutritionCalendar renders.
  const rangeStart = toDateKey(addDays(weekDates[0], -7));
  const rangeEnd = toDateKey(addDays(weekDates[6], 7));
  const { data: loggedDates } = useLoggedDateKeys(rangeStart, rangeEnd);
  const loggedDateKeys = new Set<string>(loggedDates ?? []);

  const { mutate: removeEntry } = useDeleteFoodLogEntry();

  const hasGoal = !!profile?.dailyCalorieGoal;

  const goToNextWeek = () => {
    setReferenceDate((prev) => addDays(prev, 7));
  };
  const goToPreviousWeek = () => {
    if (!canGoToPreviousWeek) return;
    setReferenceDate((prev) => addDays(prev, -7));
  };

  const handleLogMeal = (mealType: MealType) => {
    router.push({
      pathname: "/food-search",
      params: { mealType, date: selectedDateKey },
    });
  };

  if (isProfileLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  const totals = diary?.totals ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const goal = diary?.goal ?? null;
  const caloriePercent =
    goal && goal.calories > 0
      ? Math.min(100, (totals.calories / goal.calories) * 100)
      : 0;
  const caloriesRemaining = goal
    ? Math.max(0, goal.calories - totals.calories)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <NutritionCalendar
          weekDates={weekDates}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onNextWeek={goToNextWeek}
          onPreviousWeek={goToPreviousWeek}
          canGoToPreviousWeek={canGoToPreviousWeek}
          canGoToNextWeek
          loggedDateKeys={loggedDateKeys}
        />

        {hasGoal && recap && (
          <View style={styles.recapButtonRow}>
            <TouchableOpacity
              style={styles.recapButton}
              onPress={() => setIsRecapOpen(true)}
            >
              <Feather
                name="bar-chart-2"
                size={14}
                color={colors.primaryBlue}
              />
              <Text style={styles.recapButtonText}>
                {isSameDay(selectedDate, new Date()) ? "Today's" : "Day's"}{" "}
                Recap
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!hasGoal ? (
          <TouchableOpacity
            style={styles.setupPrompt}
            onPress={() => setIsSetupOpen(true)}
          >
            <Feather name="target" size={20} color={colors.primaryBlue} />
            <View style={styles.setupPromptTextGroup}>
              <Text style={styles.setupPromptTitle}>
                Set up your nutrition goals
              </Text>
              <Text style={styles.setupPromptText}>
                Get a personalized daily calorie and macro target.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.summaryCard}>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieConsumed}>{totals.calories}</Text>
              <Text style={styles.calorieGoal}> / {goal?.calories} cal</Text>
              <TouchableOpacity
                style={styles.editGoalButton}
                onPress={() => setIsSetupOpen(true)}
              >
                <Feather name="edit-2" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <AnimatedProgressBar
              percent={caloriePercent}
              color={colors.primaryBlue}
            />
            <Text style={styles.remainingText}>
              {caloriesRemaining} cal remaining
            </Text>

            <View style={styles.macroRow}>
              <MacroBar
                label="Protein"
                consumed={totals.proteinG}
                goal={goal?.proteinG ?? 0}
                color={colors.primaryBlue}
              />
              <MacroBar
                label="Carbs"
                consumed={totals.carbsG}
                goal={goal?.carbsG ?? 0}
                color={colors.purple}
              />
              <MacroBar
                label="Fat"
                consumed={totals.fatG}
                goal={goal?.fatG ?? 0}
                color={colors.pendingAmber}
              />
            </View>
          </View>
        )}

        <Modal visible={isSetupOpen} onClose={() => setIsSetupOpen(false)}>
          <NutritionSetup onSaved={() => setIsSetupOpen(false)} />
        </Modal>

        {isDiaryLoading ? (
          <ActivityIndicator style={{ marginVertical: spacing.lg }} />
        ) : (
          MEAL_TYPES.map((mealType) => {
            const entries: FoodLogEntry[] = diary?.meals[mealType] ?? [];
            return (
              <View key={mealType} style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTitle}>
                    {MEAL_TYPE_LABELS[mealType]}
                  </Text>
                  <TouchableOpacity
                    style={styles.logButton}
                    onPress={() => handleLogMeal(mealType)}
                  >
                    <Feather name="plus" size={14} color={colors.primaryBlue} />
                    <Text style={styles.logButtonText}>Log</Text>
                  </TouchableOpacity>
                </View>

                {entries.length === 0 ? (
                  <Text style={styles.emptyMealText}>Nothing logged yet</Text>
                ) : (
                  entries.map((entry) => (
                    <View key={entry.id} style={styles.entryRow}>
                      <View style={styles.entryTextGroup}>
                        <Text style={styles.entryName} numberOfLines={1}>
                          {entry.foodName}
                        </Text>
                        <Text style={styles.entryServing}>
                          {entry.brandName ? `${entry.brandName} · ` : ""}
                          {entry.servingQty} {entry.servingUnit}
                        </Text>
                      </View>
                      <Text style={styles.entryCalories}>
                        {entry.calories} cal
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeEntry(entry.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {recap && (
        <Modal visible={isRecapOpen} onClose={() => setIsRecapOpen(false)}>
          <Text style={styles.recapTitle}>
            {isSameDay(selectedDate, new Date()) ? "Today's" : "Day's"} Recap
          </Text>

          <View style={styles.recapRow}>
            <Feather name="activity" size={16} color={colors.textSecondary} />
            <Text style={styles.recapRowText}>
              {recap.training.trained
                ? `${recap.training.exerciseCount} exercise${recap.training.exerciseCount === 1 ? "" : "s"} · ${recap.training.totalSets} sets · ${Math.round(displayWeight(recap.training.totalVolume, unitSystem)).toLocaleString()} ${weightUnitLabel(unitSystem)} volume`
                : "No workout logged"}
            </Text>
          </View>

          <View style={styles.recapRow}>
            <Feather
              name="trending-up"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.recapRowText}>
              {Math.round(recap.protein.actualG)}g protein
              {recap.protein.goalG != null
                ? ` (${recap.protein.percentOfGoal}% of ${recap.protein.goalG}g goal)`
                : ""}
            </Text>
          </View>

          <View style={styles.recapRow}>
            <Feather name="pie-chart" size={16} color={colors.textSecondary} />
            <Text style={styles.recapRowText}>
              {recap.calories.actual} cal
              {recap.calories.goal != null
                ? ` / ${recap.calories.goal} — ${CALORIE_STATUS_LABELS[recap.calories.status]}`
                : ""}
            </Text>
          </View>

          <View
            style={[
              styles.verdictBanner,
              recap.supportsMuscleGain
                ? styles.verdictGood
                : styles.verdictNeutral,
            ]}
          >
            <Feather
              name={recap.supportsMuscleGain ? "check-circle" : "info"}
              size={18}
              color={
                recap.supportsMuscleGain
                  ? colors.completedGreen
                  : colors.pendingAmber
              }
            />
            <Text style={styles.verdictText}>{buildRecapVerdict(recap)}</Text>
          </View>

          <Text style={styles.recapDisclaimer}>
            A same-day check on whether training and nutrition lined up — not
            proof muscle was gained. That only shows up over weeks of consistent
            training and eating, and only via real body measurement.
          </Text>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default NutritionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  setupPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  setupPromptTextGroup: {
    flex: 1,
  },
  setupPromptTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  setupPromptText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.lightGraySoft,
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  calorieConsumed: {
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.extrabold,
  },
  calorieGoal: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
  editGoalButton: {
    marginLeft: "auto",
    padding: spacing.xs,
  },
  remainingText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  macroRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  macroBarContainer: {
    flex: 1,
  },
  macroBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  macroBarLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  macroBarValue: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  mealSection: {
    marginBottom: spacing.lg,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  mealTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  logButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  emptyMealText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  entryTextGroup: {
    flex: 1,
  },
  entryName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  entryServing: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryCalories: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
  recapButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.sm,
  },
  recapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  recapButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  recapTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
  },
  recapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  recapRowText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  verdictBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  verdictGood: {
    backgroundColor: colors.completedGreenLight,
  },
  verdictNeutral: {
    backgroundColor: "#FEF3E2",
  },
  verdictText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  recapDisclaimer: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});
