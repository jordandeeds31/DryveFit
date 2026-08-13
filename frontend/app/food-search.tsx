import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import {
  useFoodSearch,
  useFoodDetail,
  useLogFood,
  useNutritionProfile,
} from "@/hooks/useNutrition";
import { FoodSearchHit, MealType, MEAL_TYPE_LABELS } from "@/types/nutrition.types";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const useDebouncedValue = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
};

const FoodSearchScreen = () => {
  const { mealType, date } = useLocalSearchParams<{
    mealType: MealType;
    date: string;
  }>();

  const { data: profile, isLoading: isProfileLoading } = useNutritionProfile();
  const hasGoal = !!profile?.dailyCalorieGoal;

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: results, isLoading: isSearching } = useFoodSearch(debouncedQuery);

  const [selectedHit, setSelectedHit] = useState<FoodSearchHit | null>(null);
  const [servings, setServings] = useState("1");
  const {
    mutate: fetchDetail,
    data: detail,
    isPending: isLoadingDetail,
    isError: isDetailError,
    reset: resetDetail,
  } = useFoodDetail();
  const { mutate: log, isPending: isLogging } = useLogFood();

  const handleSelectHit = (hit: FoodSearchHit) => {
    setSelectedHit(hit);
    setServings("1");
    fetchDetail({ type: hit.type, id: hit.id });
  };

  const handleClose = () => {
    setSelectedHit(null);
    resetDetail();
  };

  const servingsMultiplier = parseFloat(servings) || 0;

  const handleAdd = () => {
    if (!detail || servingsMultiplier <= 0) return;

    log(
      {
        date,
        mealType,
        foodName: detail.foodName,
        brandName: detail.brandName,
        servingQty: detail.servingQty * servingsMultiplier,
        servingUnit: detail.servingUnit,
        calories: Math.round(detail.calories * servingsMultiplier),
        proteinG: Math.round(detail.proteinG * servingsMultiplier * 10) / 10,
        carbsG: Math.round(detail.carbsG * servingsMultiplier * 10) / 10,
        fatG: Math.round(detail.fatG * servingsMultiplier * 10) / 10,
      },
      { onSuccess: () => router.back() },
    );
  };

  const renderHit = (hit: FoodSearchHit) => (
    <TouchableOpacity
      key={`${hit.type}:${hit.id}`}
      style={styles.hitRow}
      onPress={() => handleSelectHit(hit)}
    >
      <View style={styles.hitTextGroup}>
        <Text style={styles.hitName} numberOfLines={1}>
          {hit.foodName}
        </Text>
        <Text style={styles.hitServing}>
          {hit.brandName ? `${hit.brandName} · ` : ""}
          {hit.servingQty} {hit.servingUnit}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (isProfileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // Logging without a goal would just create diary entries with nothing to
  // compare against — the whole point of this screen is tracking progress
  // toward a target, so it doesn't make sense to allow it until one exists.
  if (!hasGoal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => router.back()}
          >
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.blockedContainer}>
          <Feather name="target" size={32} color={colors.primaryBlue} />
          <Text style={styles.blockedTitle}>
            Set up your nutrition goals first
          </Text>
          <Text style={styles.blockedText}>
            You need a daily calorie and macro goal before you can log food.
          </Text>
          <Button
            title="Set Up Goals"
            onPress={() =>
              router.replace({
                pathname: "/(tabs)/Nutrition",
                params: { openSetup: "1" },
              })
            }
            style={styles.blockedButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => router.back()}
          >
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log {MEAL_TYPE_LABELS[mealType]}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <Input
            placeholder="Search for a food"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />
        </View>

        {isSearching ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} />
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          >
            {query.trim().length <= 1 ? (
              <Text style={styles.hintText}>
                Start typing to search for a food.
              </Text>
            ) : (
              <>
                {(results?.common.length ?? 0) > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Foods</Text>
                    {results!.common.map(renderHit)}
                  </>
                )}
                {(results?.branded.length ?? 0) > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Branded & Restaurant</Text>
                    {results!.branded.map(renderHit)}
                  </>
                )}
                {results &&
                  results.common.length === 0 &&
                  results.branded.length === 0 && (
                    <Text style={styles.hintText}>
                      No results for "{debouncedQuery}"
                    </Text>
                  )}
              </>
            )}
          </ScrollView>
        )}

        <Modal visible={!!selectedHit} onClose={handleClose}>
          {isLoadingDetail ? (
            <ActivityIndicator style={{ paddingVertical: spacing.xl }} />
          ) : isDetailError ? (
            <View style={styles.detailErrorState}>
              <Text style={styles.hintText}>
                Couldn't load this food. Please try again.
              </Text>
              <Button
                title="Retry"
                variant="outline"
                style={styles.retryButton}
                onPress={() =>
                  selectedHit &&
                  fetchDetail({ type: selectedHit.type, id: selectedHit.id })
                }
              />
            </View>
          ) : !detail ? (
            <ActivityIndicator style={{ paddingVertical: spacing.xl }} />
          ) : (
            <View>
              <Text style={styles.detailName}>{detail.foodName}</Text>
              {detail.brandName && (
                <Text style={styles.detailBrand}>{detail.brandName}</Text>
              )}

              <View style={styles.servingsRow}>
                <Text style={styles.servingsLabel}>Servings</Text>
                <View style={styles.servingsInput}>
                  <Input
                    keyboardType="numeric"
                    value={servings}
                    onChangeText={setServings}
                  />
                </View>
              </View>
              <Text style={styles.baseServingText}>
                1 serving = {detail.servingQty} {detail.servingUnit}
              </Text>

              <View style={styles.macroSummary}>
                <Text style={styles.macroSummaryCalories}>
                  {Math.round(detail.calories * servingsMultiplier)} cal
                </Text>
                <Text style={styles.macroSummaryLine}>
                  Protein: {Math.round(detail.proteinG * servingsMultiplier * 10) / 10}g
                  {"  ·  "}
                  Carbs: {Math.round(detail.carbsG * servingsMultiplier * 10) / 10}g
                  {"  ·  "}
                  Fat: {Math.round(detail.fatG * servingsMultiplier * 10) / 10}g
                </Text>
              </View>

              <Button
                title={isLogging ? "Adding..." : `Add to ${MEAL_TYPE_LABELS[mealType]}`}
                onPress={handleAdd}
                disabled={isLogging || servingsMultiplier <= 0}
                style={styles.addButton}
              />
            </View>
          )}
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default FoodSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  detailErrorState: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  retryButton: {
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  hitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  hitTextGroup: {
    flex: 1,
  },
  hitName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    textTransform: "capitalize",
  },
  hitServing: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    textTransform: "capitalize",
  },
  detailBrand: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  servingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  servingsLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  servingsInput: {
    width: 80,
  },
  baseServingText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  macroSummary: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.lightGraySoft,
    borderRadius: 8,
  },
  macroSummaryCalories: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
  },
  macroSummaryLine: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButton: {
    marginTop: spacing.lg,
  },
  blockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  blockedTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  blockedText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  blockedButton: {
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
});
