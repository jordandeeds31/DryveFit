import { useState } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { spacing } from "@/constants/spacing";
import { GraphProps } from "./Graph.types";

const screenWidth = Dimensions.get("window").width;

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

  console.log("history:", JSON.stringify(history, null, 2));

  const chartData = {
    labels: history.map((entry) =>
      new Date(entry.date).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
      }),
    ),
    datasets: [
      {
        data: history.map((entry) => entry.estimated1RM),
      },
    ],
  };

  return (
    <View>
      <LineChart
        data={chartData}
        width={screenWidth - spacing.sm * 2}
        height={240}
        yAxisSuffix=" lbs"
        fromZero
        segments={5}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
          propsForDots: {
            r: "5",
            strokeWidth: "2",
            stroke: "#2563eb",
          },
        }}
        bezier
        style={{ marginTop: spacing.md, borderRadius: 8 }}
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
