import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import styles from "./AnimatedProgressBar.styles";

interface AnimatedProgressBarProps {
  percent: number;
  color: string;
}

// Eases toward the new percent instead of snapping instantly — runs on the
// UI thread via Reanimated, so it stays smooth even while the JS thread is
// busy (e.g. a diary re-fetch landing right as the user switches days).
const AnimatedProgressBar = ({ percent, color }: AnimatedProgressBarProps) => {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clampedPercent, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedPercent, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: color,
  }));

  return (
    <View style={styles.track}>
      {/* Not rendered at all when there's genuinely nothing to show, rather
          than trusting a `width: "0%"` animated style to be invisible —
          guarantees an empty diary can never show a sliver of fill. */}
      {clampedPercent > 0 && (
        <Animated.View style={[styles.fill, animatedStyle]} />
      )}
    </View>
  );
};

export default AnimatedProgressBar;
