import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useMacroHistory } from "@/hooks/useNutrition";
import {
  MACRO_HISTORY_RANGES,
  MACRO_HISTORY_RANGE_LABELS,
  MacroHistoryRange,
  MacroHistoryBucket,
} from "@/types/nutrition.types";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const GRAPH_BG = "#f7f9fc";
const CARD_BORDER = "#e2e6ec";

// Order matches the legend/stack order everywhere below — protein, then
// fat, then carbs, bottom to top in the bar.
const MACRO_COLORS = {
  protein: colors.completedGreen,
  fat: colors.pendingAmber,
  carbs: colors.primaryBlue,
};

const screenWidth = Dimensions.get("window").width;
const SCREEN_HORIZONTAL_PADDING = spacing.sm;
const CARD_HORIZONTAL_PADDING = spacing.sm;
const chartWidth =
  screenWidth - SCREEN_HORIZONTAL_PADDING * 2 - CARD_HORIZONTAL_PADDING * 2;

// Hand-built bars, not react-native-chart-kit's StackedBarChart — that
// component only draws static SVG rects with no touch handling at all
// (confirmed by reading its source), so there's no way to hook a tap
// into it. Building the bars from plain Views gives every segment (and
// the whole-bar tooltip below) a real touch target.
const Y_AXIS_WIDTH = 36;
const CHART_AREA_HEIGHT = 200;
const BAR_WIDTH = 28;
const BAR_GAP = 14;
const BAR_STEP = BAR_WIDTH + BAR_GAP;
const TOOLTIP_WIDTH = 190;
// Rounding the chart's max up to a multiple of 400 (instead of just using
// the raw data max) means dividing it into 4 gridlines always lands on a
// multiple of 100 — every y-axis label ends in 0.
const NICE_MAX_STEP = 400;

const NutritionHistoryScreen = () => {
  const [range, setRange] = useState<MacroHistoryRange>("1w");
  const { data: history, isLoading } = useMacroHistory(range);
  const [selected, setSelected] = useState<{
    bucket: MacroHistoryBucket;
    index: number;
  } | null>(null);
  const [scrollX, setScrollX] = useState(0);

  const isWeeklyBucketed = range === "3m" || range === "6m" || range === "1y" || range === "all";

  const buckets = history ?? [];
  const maxTotal = Math.max(
    1,
    ...buckets.map((b) => b.proteinCal + b.fatCal + b.carbsCal),
  );
  const niceMax = Math.max(
    NICE_MAX_STEP,
    Math.ceil(maxTotal / NICE_MAX_STEP) * NICE_MAX_STEP,
  );
  const yTicks = [4, 3, 2, 1, 0].map((n) => Math.round((niceMax * n) / 4));

  const chartViewportWidth = chartWidth - Y_AXIS_WIDTH;
  const barsContentWidth = Math.max(
    chartViewportWidth,
    buckets.length * BAR_STEP,
  );

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  };

  const handleSelectBar = (bucket: MacroHistoryBucket, index: number) => {
    setSelected((prev) => (prev?.index === index ? null : { bucket, index }));
  };

  // Tooltip tracks the tapped bar's position in VIEWPORT coordinates (bar's
  // position in the scrollable content, minus how far that content has
  // scrolled) so it stays correctly anchored above the bar even after
  // scrolling a long (1M/1Y) range, then clamps so it never runs off
  // either edge of the card.
  const tooltipLeft = selected
    ? Math.min(
        Math.max(
          Y_AXIS_WIDTH +
            selected.index * BAR_STEP +
            BAR_WIDTH / 2 -
            scrollX -
            TOOLTIP_WIDTH / 2,
          0,
        ),
        chartWidth - TOOLTIP_WIDTH,
      )
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Macro Trends</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          {isWeeklyBucketed
            ? "Each bar is a weekly average of the days you logged."
            : "Each bar is one day you logged."}
        </Text>

        <View style={styles.rangeRow}>
          {MACRO_HISTORY_RANGES.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.rangePill,
                range === option && styles.rangePillActive,
              ]}
              onPress={() => setRange(option)}
            >
              <Text
                style={[
                  styles.rangePillText,
                  range === option && styles.rangePillTextActive,
                ]}
              >
                {MACRO_HISTORY_RANGE_LABELS[option]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} />
        ) : !history || history.length === 0 ? (
          <Text style={styles.emptyText}>
            No food logged in this range yet.
          </Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.chartRow}>
                <View style={styles.yAxis}>
                  {yTicks.map((value) => (
                    <Text key={value} style={styles.yAxisLabel}>
                      {value}
                    </Text>
                  ))}
                </View>

                <View style={{ flex: 1 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    // A tap anywhere in the chart area outside a bar (not
                    // just tapping another bar) dismisses the tooltip.
                    onScrollBeginDrag={() => setSelected(null)}
                  >
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => setSelected(null)}
                      style={[
                        styles.barsArea,
                        { width: barsContentWidth },
                      ]}
                    >
                      {buckets.map((bucket, index) => {
                        const total =
                          bucket.proteinCal + bucket.fatCal + bucket.carbsCal;
                        const barHeight = Math.max(
                          2,
                          (total / niceMax) * CHART_AREA_HEIGHT,
                        );
                        const isSelected = selected?.index === index;
                        return (
                          <TouchableOpacity
                            key={bucket.bucketStart}
                            style={styles.barColumn}
                            onPress={() => handleSelectBar(bucket, index)}
                          >
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    height: barHeight,
                                    opacity:
                                      selected && !isSelected ? 0.4 : 1,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.barSegment,
                                    {
                                      flex: bucket.carbsCal || 0.0001,
                                      backgroundColor: MACRO_COLORS.carbs,
                                    },
                                  ]}
                                />
                                <View
                                  style={[
                                    styles.barSegment,
                                    {
                                      flex: bucket.fatCal || 0.0001,
                                      backgroundColor: MACRO_COLORS.fat,
                                    },
                                  ]}
                                />
                                <View
                                  style={[
                                    styles.barSegment,
                                    {
                                      flex: bucket.proteinCal || 0.0001,
                                      backgroundColor: MACRO_COLORS.protein,
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                            <Text style={styles.barLabel} numberOfLines={1}>
                              {/* bucketEnd, not bucketStart — for a weekly
                                  bucket, bucketStart is just the
                                  Sunday-anchor date and may have no logged
                                  entry at all, while bucketEnd is always
                                  the actual last logged day in that bucket
                                  (see nutrition.service.ts's
                                  getMacroHistory). For a daily bucket the
                                  two are identical, so this is always the
                                  real logged date either way. */}
                              {formatCalendarDate(bucket.bucketEnd, {
                                month: "numeric",
                                day: "numeric",
                              })}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </TouchableOpacity>
                  </ScrollView>

                  {selected && (
                    <View
                      style={[styles.tooltip, { left: tooltipLeft }]}
                      pointerEvents="none"
                    >
                      <Text style={styles.tooltipTitle}>
                        {isWeeklyBucketed ? "Weekly Average" : "Daily Total"}
                      </Text>
                      <Text style={styles.tooltipDate}>
                        {selected.bucket.bucketStart ===
                        selected.bucket.bucketEnd
                          ? formatCalendarDate(selected.bucket.bucketStart, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : `${formatCalendarDate(selected.bucket.bucketStart, { month: "short", day: "numeric" })} – ${formatCalendarDate(selected.bucket.bucketEnd, { month: "short", day: "numeric" })}`}
                      </Text>
                      <Text style={styles.tooltipLine}>
                        Calories: {selected.bucket.calories}
                      </Text>
                      <Text style={styles.tooltipLine}>
                        Protein: {selected.bucket.proteinG}g (
                        {selected.bucket.proteinPercent}%)
                      </Text>
                      <Text style={styles.tooltipLine}>
                        Fat: {selected.bucket.fatG}g (
                        {selected.bucket.fatPercent}%)
                      </Text>
                      <Text style={styles.tooltipLine}>
                        Carbs: {selected.bucket.carbsG}g (
                        {selected.bucket.carbsPercent}%)
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendSwatch,
                      { backgroundColor: MACRO_COLORS.protein },
                    ]}
                  />
                  <Text style={styles.legendText}>Protein</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendSwatch,
                      { backgroundColor: MACRO_COLORS.fat },
                    ]}
                  />
                  <Text style={styles.legendText}>Fat</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendSwatch,
                      { backgroundColor: MACRO_COLORS.carbs },
                    ]}
                  />
                  <Text style={styles.legendText}>Carbs</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionLabel}>
              {isWeeklyBucketed ? "Weekly Averages" : "Daily Breakdown"}
            </Text>
            {[...history].reverse().map((bucket) => (
              <View key={bucket.bucketStart} style={styles.bucketRow}>
                <View style={styles.bucketHeaderRow}>
                  <Text style={styles.bucketDate}>
                    {bucket.bucketStart === bucket.bucketEnd
                      ? formatCalendarDate(bucket.bucketStart, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : `${formatCalendarDate(bucket.bucketStart, { month: "short", day: "numeric" })} – ${formatCalendarDate(bucket.bucketEnd, { month: "short", day: "numeric" })}`}
                  </Text>
                  <Text style={styles.bucketCalories}>
                    {bucket.calories} cal/day
                  </Text>
                </View>
                <View style={styles.percentBar}>
                  <View
                    style={[
                      styles.percentSegment,
                      {
                        flex: bucket.proteinPercent || 0.0001,
                        backgroundColor: MACRO_COLORS.protein,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.percentSegment,
                      {
                        flex: bucket.fatPercent || 0.0001,
                        backgroundColor: MACRO_COLORS.fat,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.percentSegment,
                      {
                        flex: bucket.carbsPercent || 0.0001,
                        backgroundColor: MACRO_COLORS.carbs,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.bucketPercentText}>
                  {bucket.proteinPercent}% P · {bucket.fatPercent}% F ·{" "}
                  {bucket.carbsPercent}% C
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NutritionHistoryScreen;

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
  rangeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  rangePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  rangePillActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  rangePillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  rangePillTextActive: {
    color: "white",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginTop: spacing.xl,
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
  chartRow: {
    flexDirection: "row",
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: CHART_AREA_HEIGHT,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: spacing.xs,
  },
  yAxisLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  barsArea: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  barColumn: {
    width: BAR_WIDTH + BAR_GAP,
    alignItems: "center",
  },
  // Fixed-height track (matching the y-axis column's height) that every
  // bar sits at the bottom of — without this, a short bar and a tall bar
  // would just be top-aligned within their own intrinsic-height column
  // instead of sharing the same 0 baseline.
  barTrack: {
    height: CHART_AREA_HEIGHT,
    justifyContent: "flex-end",
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 4,
    overflow: "hidden",
    // Children render top-to-bottom in JSX order — carbs segment is
    // written first (top of the bar), then fat, then protein last
    // (bottom), matching the green(protein)/yellow(fat)/orange(carbs)
    // bottom-to-top stacking used everywhere else on this screen.
    flexDirection: "column",
  },
  barSegment: {
    width: "100%",
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  tooltip: {
    position: "absolute",
    top: 0,
    width: TOOLTIP_WIDTH,
    backgroundColor: "#1c2333",
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tooltipTitle: {
    color: "white",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  tooltipDate: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  tooltipLine: {
    color: "white",
    fontSize: fontSizes.xs,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  bucketRow: {
    marginBottom: spacing.md,
  },
  bucketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  bucketDate: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  bucketCalories: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  percentBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.borderGray,
  },
  percentSegment: {
    height: "100%",
  },
  bucketPercentText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
