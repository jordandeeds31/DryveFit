import { useState } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";
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
const SCREEN_HORIZONTAL_PADDING = spacing.sm;
const chartWidth =
  screenWidth -
  SCREEN_HORIZONTAL_PADDING * 2 -
  CARD_HORIZONTAL_PADDING * 2;

interface SelectedPoint {
  value: number;
  label: string;
  x: number;
  y: number;
}

const Graph = ({ history }: GraphProps) => {
  const unitSystem = useUnitSystem();
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

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ESTIMATED 1-REP MAX</Text>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={CHART_HEIGHT}
        yAxisSuffix={` ${weightUnitLabel(unitSystem)}`}
        fromZero
        segments={5}
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
            r: "5",
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
    </View>
  );
};

export default Graph;

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
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
