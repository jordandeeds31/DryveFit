import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface GlassBackgroundProps {
  children: React.ReactNode;
}

// A very soft, barely-there wash behind a screen's content — glass panels
// over a flat white background just look like plain gray boxes, since
// there's nothing behind them for the blur to actually pick up. Kept
// minimal on purpose: a subtle blue-to-lavender gradient using colors
// already in the app's own palette (colors.surfaceBlueLight,
// colors.purpleLight), not a vibrant/decorative one.
const GlassBackground = ({ children }: GlassBackgroundProps) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#EFF6FF", "#FBFBFE", "#F5F3FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
};

export default GlassBackground;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
