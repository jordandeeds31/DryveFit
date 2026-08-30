import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import AnimatedProgressBar from "@/components/shared/AnimatedProgressBar/AnimatedProgressBar";
import NutritionCalendar from "@/features/NutritionCalendar/NutritionCalendar";
import NutritionSetup from "@/features/NutritionSetup/NutritionSetup";
import {
  useNutritionProfile,
  useDiary,
  useLoggedDateKeys,
  useDeleteFoodLogEntry,
  useUpdateFoodLogEntry,
} from "@/hooks/useNutrition";
import {
  useDailyAnalysis,
  useRunDailyAnalysis,
  useMarkDailyAnalysisViewed,
} from "@/hooks/useDailyAnalysis";
import { useCurrentUser } from "@/hooks/useUsers";
import { getWeekDates, toDateKey, startOfDay } from "@/lib/utils/date.utils";
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  MealType,
  FoodLogEntry,
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

const NutritionScreen = () => {
  const { openSetup, dailyAnalysisDate } = useLocalSearchParams<{
    openSetup?: string;
    dailyAnalysisDate?: string;
  }>();

  const queryClient = useQueryClient();

  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDailyAnalysisOpen, setIsDailyAnalysisOpen] = useState(false);
  // Set only when arriving via the 9pm push's deep link — that analysis
  // was already computed and persisted by the job that sent it (see
  // dailyProgressNotifications.ts), so this just fetches the existing
  // record instead of the manual button's re-run mutation below.
  const [dailyAnalysisDateToFetch, setDailyAnalysisDateToFetch] = useState<
    string | null
  >(null);

  // food-search redirects here with ?openSetup=1 when someone tries to log
  // food before setting up a goal — this is what actually opens the modal
  // for them instead of just landing back on the tab.
  useEffect(() => {
    if (openSetup === "1") {
      setIsSetupOpen(true);
      router.setParams({ openSetup: undefined });
    }
  }, [openSetup]);

  useEffect(() => {
    if (dailyAnalysisDate) {
      setDailyAnalysisDateToFetch(dailyAnalysisDate);
      setIsDailyAnalysisOpen(true);
      router.setParams({ dailyAnalysisDate: undefined });
    }
  }, [dailyAnalysisDate]);

  // Workouts get logged from completely different screens (Home,
  // Cinematic Mode) that have no reason to know this tab's cache keys
  // exist, and tabs stay mounted across switches rather than remounting —
  // so without this, the diary silently keeps showing whatever was true
  // the last time this tab was actually focused.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["diary"] });
      queryClient.invalidateQueries({ queryKey: ["loggedDateKeys"] });
    }, [queryClient]),
  );

  const weekDates = getWeekDates(referenceDate);
  const selectedDateKey = toDateKey(selectedDate);

  const { data: profile, isLoading: isProfileLoading } = useNutritionProfile();
  const { data: diary, isLoading: isDiaryLoading } = useDiary(selectedDateKey);
  const {
    mutate: runDailyAnalysis,
    data: freshDailyAnalysis,
    isPending: isRunningDailyAnalysis,
    reset: resetDailyAnalysis,
  } = useRunDailyAnalysis();
  const {
    data: fetchedDailyAnalysis,
    isLoading: isFetchingDailyAnalysis,
  } = useDailyAnalysis(dailyAnalysisDateToFetch);
  const { mutate: markDailyAnalysisViewed } = useMarkDailyAnalysisViewed();
  const dailyAnalysis = dailyAnalysisDateToFetch
    ? fetchedDailyAnalysis
    : freshDailyAnalysis;

  // Only the deep-link path needs this — arriving via the 9pm push is the
  // one way to see an analysis without having just triggered it yourself
  // with the button, so it's the one case where "viewed" isn't already
  // implied.
  useEffect(() => {
    if (fetchedDailyAnalysis && !fetchedDailyAnalysis.viewedAt) {
      markDailyAnalysisViewed(fetchedDailyAnalysis.id);
    }
  }, [fetchedDailyAnalysis, markDailyAnalysisViewed]);

  const { data: currentUser } = useCurrentUser();

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
  const { mutate: updateEntry, isPending: isUpdatingEntry } =
    useUpdateFoodLogEntry();

  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [editFields, setEditFields] = useState({
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });

  const handleOpenEdit = (entry: FoodLogEntry) => {
    setEditingEntry(entry);
    setEditFields({
      calories: String(entry.calories),
      proteinG: String(entry.proteinG),
      carbsG: String(entry.carbsG),
      fatG: String(entry.fatG),
    });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    updateEntry(
      {
        entryId: editingEntry.id,
        calories: Math.round(parseFloat(editFields.calories) || 0),
        proteinG: parseFloat(editFields.proteinG) || 0,
        carbsG: parseFloat(editFields.carbsG) || 0,
        fatG: parseFloat(editFields.fatG) || 0,
      },
      { onSuccess: () => setEditingEntry(null) },
    );
  };

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

  // Plain text through the OS share sheet (Messages, WhatsApp, etc.) rather
  // than an in-app share — this is for sending a day's numbers to someone
  // outside the app, not posting to the Feed.
  const handleShareNutrition = async () => {
    const dateLabel = selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const lines = [
      `My nutrition — ${dateLabel}`,
      "",
      `${totals.calories}${goal ? ` / ${goal.calories}` : ""} cal`,
      `Protein: ${totals.proteinG}g   Carbs: ${totals.carbsG}g   Fat: ${totals.fatG}g`,
    ];

    for (const mealType of MEAL_TYPES) {
      const entries = diary?.meals[mealType] ?? [];
      if (entries.length === 0) continue;
      lines.push("", `${MEAL_TYPE_LABELS[mealType]}:`);
      for (const entry of entries) {
        lines.push(`• ${entry.foodName} (${entry.calories} cal)`);
      }
    }

    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // User backed out of the share sheet or the OS share call failed —
      // nothing in the app's own state needs to react either way.
    }
  };

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

        {hasGoal && (
          <View style={styles.recapButtonRow}>
            <TouchableOpacity
              style={styles.recapButton}
              onPress={() => router.push("/nutrition-history")}
            >
              <Feather
                name="trending-up"
                size={14}
                color={colors.primaryBlue}
              />
              <Text style={styles.recapButtonText}>Macro Trends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recapButton}
              onPress={() => router.push("/weight-trend")}
            >
              <Feather
                name="activity"
                size={14}
                color={colors.primaryBlue}
              />
              <Text style={styles.recapButtonText}>Weight Trend</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recapButton}
              onPress={() => {
                setDailyAnalysisDateToFetch(null);
                resetDailyAnalysis();
                setIsDailyAnalysisOpen(true);
                runDailyAnalysis(selectedDateKey);
              }}
            >
              <Feather name="zap" size={14} color={colors.primaryBlue} />
              <Text style={styles.recapButtonText}>Progress Check</Text>
            </TouchableOpacity>
          </View>
        )}

        {isProfileLoading ? (
          <ActivityIndicator style={{ marginVertical: spacing.lg }} />
        ) : !hasGoal ? (
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
              <View style={styles.calorieRowActions}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareNutrition}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="share" size={14} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editGoalButton}
                  onPress={() => setIsSetupOpen(true)}
                >
                  <Feather name="edit-2" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
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

        <TouchableOpacity
          style={styles.voiceTipBanner}
          onPress={() => router.push("/ai-chat")}
        >
          <Feather name="mic" size={16} color={colors.primaryBlue} />
          <Text style={styles.voiceTipBannerText}>
            Tip: tell your AI coach what you ate instead of typing it — tap
            to open the chat and use the mic.
          </Text>
        </TouchableOpacity>

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
                    <TouchableOpacity
                      key={entry.id}
                      style={styles.entryRow}
                      onPress={() => handleOpenEdit(entry)}
                    >
                      <View style={styles.entryTextGroup}>
                        <View style={styles.entryNameRow}>
                          <Text style={styles.entryName} numberOfLines={1}>
                            {entry.foodName}
                          </Text>
                          {entry.source === "ai_estimated" && (
                            <View style={styles.estimatedBadge}>
                              <Text style={styles.estimatedBadgeText}>
                                estimated
                              </Text>
                            </View>
                          )}
                        </View>
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
                    </TouchableOpacity>
                  ))
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title={editingEntry?.foodName}
        titleStyle={styles.detailName}
      >
        {editingEntry && (
          <View>
            {editingEntry.source === "ai_estimated" && (
              <Text style={styles.aiEstimateBadge}>
                AI-estimated — adjust these if they're off
              </Text>
            )}

            <View style={styles.macroFieldsGrid}>
              <View style={styles.macroField}>
                <Text style={styles.macroFieldLabel}>Calories</Text>
                <Input
                  keyboardType="numeric"
                  value={editFields.calories}
                  onChangeText={(value) =>
                    setEditFields((prev) => ({ ...prev, calories: value }))
                  }
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.macroFieldLabel}>Protein (g)</Text>
                <Input
                  keyboardType="numeric"
                  value={editFields.proteinG}
                  onChangeText={(value) =>
                    setEditFields((prev) => ({ ...prev, proteinG: value }))
                  }
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.macroFieldLabel}>Carbs (g)</Text>
                <Input
                  keyboardType="numeric"
                  value={editFields.carbsG}
                  onChangeText={(value) =>
                    setEditFields((prev) => ({ ...prev, carbsG: value }))
                  }
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.macroFieldLabel}>Fat (g)</Text>
                <Input
                  keyboardType="numeric"
                  value={editFields.fatG}
                  onChangeText={(value) =>
                    setEditFields((prev) => ({ ...prev, fatG: value }))
                  }
                />
              </View>
            </View>

            <Button
              title={isUpdatingEntry ? "Saving..." : "Save Changes"}
              onPress={handleSaveEdit}
              disabled={isUpdatingEntry}
              style={styles.addButton}
            />
          </View>
        )}
      </Modal>

      <Modal
        visible={isDailyAnalysisOpen}
        onClose={() => setIsDailyAnalysisOpen(false)}
        title="Progress Check"
        titleStyle={styles.recapTitle}
      >
        {isRunningDailyAnalysis || (!!dailyAnalysisDateToFetch && isFetchingDailyAnalysis) ? (
          <ActivityIndicator style={{ marginVertical: spacing.lg }} />
        ) : dailyAnalysis ? (
          <View>
            <View
              style={[
                styles.verdictBanner,
                dailyAnalysis.netContribution === "positive"
                  ? styles.verdictGood
                  : dailyAnalysis.netContribution === "negative"
                    ? styles.verdictBad
                    : styles.verdictNeutral,
              ]}
            >
              <Feather
                name={
                  dailyAnalysis.netContribution === "positive"
                    ? "check-circle"
                    : dailyAnalysis.netContribution === "negative"
                      ? "alert-circle"
                      : "info"
                }
                size={18}
                color={
                  dailyAnalysis.netContribution === "positive"
                    ? colors.completedGreen
                    : dailyAnalysis.netContribution === "negative"
                      ? colors.dangerRed
                      : colors.pendingAmber
                }
              />
              <Text style={styles.verdictText}>{dailyAnalysis.headline}</Text>
            </View>

            <Text style={styles.dailyAnalysisExplanation}>
              {dailyAnalysis.explanation}
            </Text>

            {dailyAnalysis.adjustments.length > 0 && (
              <>
                <Text style={styles.recapTitle}>Adjust for tomorrow</Text>
                {dailyAnalysis.adjustments.map((adjustment, index) => (
                  <View key={index} style={styles.adjustmentRow}>
                    <View style={styles.adjustmentBullet} />
                    <Text style={styles.adjustmentText}>{adjustment}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        ) : (
          <Text style={styles.recapDisclaimer}>Couldn't run today's check — try again.</Text>
        )}
      </Modal>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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
  voiceTipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  voiceTipBannerText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
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
  calorieRowActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shareButton: {
    padding: spacing.xs,
  },
  editGoalButton: {
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
  entryNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  entryName: {
    flexShrink: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  estimatedBadge: {
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  estimatedBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
    textTransform: "uppercase",
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
  detailName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  aiEstimateBadge: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  macroFieldsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  macroField: {
    width: "47%",
  },
  macroFieldLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  addButton: {
    marginTop: spacing.lg,
  },
  recapButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.xs,
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
  verdictBad: {
    backgroundColor: "#FEF2F2",
  },
  verdictText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  dailyAnalysisExplanation: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  adjustmentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  adjustmentBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primaryBlue,
    marginTop: 7,
  },
  adjustmentText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  recapDisclaimer: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});
