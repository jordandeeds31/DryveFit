import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import Feather from "@expo/vector-icons/Feather";
import { useWeightTrend } from "@/hooks/useNutrition";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const GRAPH_BG = "#f7f9fc";
const GRID_LINE = "#e2e6ec";
const CARD_BORDER = "#e2e6ec";
const CHART_HEIGHT = 220;

const screenWidth = Dimensions.get("window").width;
const SCREEN_HORIZONTAL_PADDING = spacing.sm;
const CARD_HORIZONTAL_PADDING = spacing.sm;
const chartWidth =
  screenWidth - SCREEN_HORIZONTAL_PADDING * 2 - CARD_HORIZONTAL_PADDING * 2;

const WeightTrendScreen = () => {
  const { data: trend, isLoading } = useWeightTrend();

  // Only every other week gets a real label (chart-kit still needs one
  // string per data point) — 13 points' worth of "0w 1w 2w ... 12w" all
  // at once would overlap into unreadable clutter at this chart width.
  const chartLabels =
    trend?.projection.map((point) =>
      point.weeksFromNow === 0
        ? "Now"
        : point.weeksFromNow % 2 === 0
          ? `${point.weeksFromNow}w`
          : "",
    ) ?? [];

  const chartValues = trend?.projection.map((point) => point.projectedWeightLbs) ?? [];

  const finalProjection = trend?.projection[trend.projection.length - 1];
  const totalChangeLbs = finalProjection
    ? Math.round((finalProjection.projectedWeightLbs - trend!.currentWeightLbs) * 10) / 10
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Trend</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          A rough estimate, not a guarantee — based on your average logged
          calories versus your estimated maintenance, using the standard
          "3,500 calories ≈ 1 lb" rule. Actual results depend on a lot this
          can't account for.
        </Text>

        {isLoading && <ActivityIndicator style={{ marginTop: spacing.xl }} />}

        {!isLoading && trend && !trend.hasEnoughData && (
          <View style={styles.notEnoughDataCard}>
            <Feather name="bar-chart-2" size={20} color={colors.textMuted} />
            <Text style={styles.notEnoughDataText}>
              Log at least {trend.minLoggedDays} days of food in the last 30
              days to see a projection — you've logged {trend.loggedDayCount}{" "}
              so far.
            </Text>
          </View>
        )}

        {!isLoading && trend && trend.hasEnoughData && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{trend.currentWeightLbs}</Text>
                <Text style={styles.statLabel}>Current lbs</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{trend.avgDailyCalories}</Text>
                <Text style={styles.statLabel}>Avg cal/day</Text>
              </View>
              <View style={styles.statCard}>
                <Text
                  style={[
                    styles.statValue,
                    trend.dailyBalance! < 0
                      ? styles.statValueDeficit
                      : trend.dailyBalance! > 0
                        ? styles.statValueSurplus
                        : undefined,
                  ]}
                >
                  {trend.dailyBalance! > 0 ? "+" : ""}
                  {trend.dailyBalance}
                </Text>
                <Text style={styles.statLabel}>Cal balance</Text>
              </View>
            </View>

            <View style={styles.card}>
              <LineChart
                data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
                width={chartWidth}
                height={CHART_HEIGHT}
                yAxisSuffix=" lb"
                segments={4}
                chartConfig={{
                  backgroundColor: GRAPH_BG,
                  backgroundGradientFrom: GRAPH_BG,
                  backgroundGradientTo: GRAPH_BG,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(2, 44, 250, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                  strokeWidth: 3,
                  propsForBackgroundLines: {
                    stroke: GRID_LINE,
                    strokeDasharray: "4",
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "white",
                    fill: colors.primaryBlue,
                  },
                  fillShadowGradientFrom: colors.primaryBlue,
                  fillShadowGradientFromOpacity: 0.2,
                  fillShadowGradientTo: colors.primaryBlue,
                  fillShadowGradientToOpacity: 0,
                }}
                bezier
                withOuterLines={false}
                style={styles.chart}
              />

              {totalChangeLbs != null && (
                <Text style={styles.projectionSummary}>
                  At this pace, in {trend.projection.length - 1} weeks you'd
                  be around{" "}
                  <Text style={styles.projectionSummaryBold}>
                    {finalProjection!.projectedWeightLbs} lbs
                  </Text>{" "}
                  ({totalChangeLbs > 0 ? "+" : ""}
                  {totalChangeLbs} lbs from today).
                </Text>
              )}
            </View>

            {trend.history.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Actual Weigh-Ins</Text>
                {[...trend.history].reverse().map((point) => (
                  <View key={point.date} style={styles.historyRow}>
                    <Text style={styles.historyDate}>
                      {formatCalendarDate(point.date, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <Text style={styles.historyWeight}>
                      {point.weightLbs} lbs
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default WeightTrendScreen;

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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  notEnoughDataCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  notEnoughDataText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
  },
  statValueDeficit: {
    color: colors.completedGreen,
  },
  statValueSurplus: {
    color: colors.pendingAmber,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: GRAPH_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: spacing.md,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    marginBottom: spacing.lg,
  },
  chart: {
    borderRadius: 8,
  },
  projectionSummary: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  projectionSummaryBold: {
    fontWeight: fontWeights.bold,
    color: "#000",
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  historyDate: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  historyWeight: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});
