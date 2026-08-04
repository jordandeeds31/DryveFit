import { useState } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { GraphProps } from "./Graph.types";

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
        data: sortedHistory.map((entry) => entry.estimated1RM),
      },
    ],
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Estimated 1-Rep Max</Text>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        yAxisSuffix=" lbs"
        fromZero
        segments={5}
        chartConfig={{
          backgroundColor: "white",
          backgroundGradientFrom: "white",
          backgroundGradientTo: "white",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(2, 44, 250, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
          propsForBackgroundLines: {
            stroke: colors.borderGray,
            strokeDasharray: "4",
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: colors.primaryBlue,
            fill: "white",
          },
          fillShadowGradient: colors.primaryBlue,
          fillShadowGradientOpacity: 0.15,
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
            { left: selectedPoint.x - 40, top: selectedPoint.y - 10 },
          ]}
        >
          <Text style={styles.tooltipText}>
            {selectedPoint.value} lbs on {selectedPoint.label}
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
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderGray,
    paddingVertical: spacing.sm,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    paddingTop: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  chart: {
    borderRadius: 8,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tooltipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
