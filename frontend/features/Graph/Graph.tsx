import { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";
import Feather from "@expo/vector-icons/Feather";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { displayWeight, weightUnitLabel } from "@/lib/utils/units";
import { GraphProps } from "./Graph.types";

// Very light background — the earlier dark-mode version made the line/grid
// hard to read at a glance, so contrast/legibility takes priority over the
// glow effects (which only read as "glowing" on a dark surface anyway).
const GRAPH_BG = "#f7f9fc";
const GRID_LINE = "#e2e6ec";
const CARD_BORDER = "#e2e6ec";
const CHART_HEIGHT = 320;

const screenWidth = Dimensions.get("window").width;
const CARD_HORIZONTAL_PADDING = spacing.sm;
// Matches cardCompact's own paddingHorizontal below — kept as its own
// constant since chartWidth's math needs to subtract whichever of the two
// actually applies, not always CARD_HORIZONTAL_PADDING.
const COMPACT_CARD_HORIZONTAL_PADDING = spacing.xs;
const SCREEN_HORIZONTAL_PADDING = spacing.sm;
// `width` (prop or this default) always means the outer card's width —
// the actual chart's pixel width still needs the card's own horizontal
// padding subtracted from it either way, done once below.
const DEFAULT_CARD_WIDTH = screenWidth - SCREEN_HORIZONTAL_PADDING * 2;

interface SelectedPoint {
  value: number;
  label: string;
  x: number;
  y: number;
}

const Graph = ({
  history,
  title,
  width,
  compact = false,
  onRemove,
  onPress,
}: GraphProps) => {
  const unitSystem = useUnitSystem();
  const horizontalPadding = compact
    ? COMPACT_CARD_HORIZONTAL_PADDING
    : CARD_HORIZONTAL_PADDING;
  const chartWidth = (width ?? DEFAULT_CARD_WIDTH) - horizontalPadding * 2;
  // Roughly square in compact/grid mode — chart-kit needs some headroom
  // below the card's own width for its axis labels, so this isn't the
  // card's literal height, just close enough to read as "square" rather
  // than the tall, wide-screen proportions the standalone graph uses.
  const chartHeight = compact ? Math.max(chartWidth * 0.85, 120) : CHART_HEIGHT;
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null,
  );

  // Defensive sort — the chart draws a connected line, so out-of-order
  // entries (from any source) would otherwise zig-zag instead of trending.
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const chartData = {
    labels: sortedHistory.map((entry) =>
      formatCalendarDate(entry.date, { month: "numeric", day: "numeric" }),
    ),
    datasets: [
      {
        // Stored/loaded in lbs always — converted here so the plotted
        // values (and anything read back off them, e.g. onDataPointClick
        // below) are already in the viewer's own unit.
        data: sortedHistory.map((entry) =>
          displayWeight(entry.estimated1RM, unitSystem),
        ),
      },
    ],
  };

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[
        styles.card,
        compact && styles.cardCompact,
        width != null && { width },
      ]}
      onPress={onPress}
      // Data-point taps on the chart below already have their own
      // handling (onDataPointClick) — this only fires for the rest of
      // the card, so the two don't fight over the same tap.
      activeOpacity={onPress ? 0.7 : 1}
    >
      {onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      <Text
        style={[styles.exerciseTitle, compact && styles.exerciseTitleCompact]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {!compact && <Text style={styles.title}>ESTIMATED 1-REP MAX</Text>}
      <LineChart
        data={chartData}
        width={chartWidth}
        height={chartHeight}
        yAxisSuffix={` ${weightUnitLabel(unitSystem)}`}
        fromZero
        segments={compact ? 3 : 5}
        chartConfig={{
          backgroundColor: GRAPH_BG,
          backgroundGradientFrom: GRAPH_BG,
          backgroundGradientTo: GRAPH_BG,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(2, 44, 250, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
          strokeWidth: compact ? 2 : 3,
          propsForBackgroundLines: {
            stroke: GRID_LINE,
            strokeDasharray: "4",
          },
          propsForDots: {
            r: compact ? "3" : "5",
            strokeWidth: "2",
            stroke: "white",
            fill: colors.primaryBlue,
          },
          fillShadowGradientFrom: colors.primaryBlue,
          fillShadowGradientFromOpacity: 0.25,
          fillShadowGradientTo: colors.primaryBlue,
          fillShadowGradientToOpacity: 0,
        }}
        bezier
        withOuterLines={false}
        style={styles.chart}
        onDataPointClick={({ value, index, x, y }) => {
          setSelectedPoint({
            value,
            label: chartData.labels[index],
            x,
            y,
          });
        }}
      />

      {selectedPoint && (
        <View
          style={[
            styles.tooltip,
            { left: selectedPoint.x - 44, top: selectedPoint.y - 14 },
          ]}
        >
          <Text style={styles.tooltipText}>
            {selectedPoint.value} {weightUnitLabel(unitSystem)} ·{" "}
            {selectedPoint.label}
          </Text>
        </View>
      )}
    </Wrapper>
  );
};

export default Graph;

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xs,
    backgroundColor: GRAPH_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: spacing.md,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompact: {
    marginTop: 0,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  removeButton: {
    position: "absolute",
    // Sits right at the corner, half over the card's own border — not
    // inset from it — per feedback that an inset X read as floating
    // inside the card instead of a "remove this card" control on it.
    top: -8,
    right: -8,
    zIndex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  exerciseTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: "#000",
    textAlign: "center",
  },
  exerciseTitleCompact: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 2,
    color: colors.primaryBlue,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  chart: {
    borderRadius: 8,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "#1c2333",
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tooltipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
