import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/colors";

interface AnimatedGradientBorderProps {
  children: React.ReactNode;
  borderRadius: number;
  borderWidth?: number;
  gradientColors?: readonly [string, string, ...string[]];
  gradientLocations?: readonly [number, number, ...number[]];
  innerBackgroundColor?: string;
  // Freezes the rotation (no reset) — for pausing it while the modal the
  // button opens is covering it, rather than spinning uselessly underneath.
  isAnimating?: boolean;
  style?: ViewStyle;
}

// Rotates an oversized gradient square behind a masked inner area, so
// only a thin ring around the edge is visible — RN has no native conic
// gradient, so a spinning linear one is the standard stand-in; the sweep
// still reads as a moving highlight traveling around the border.
const SPINNER_SIZE = 300;

const AnimatedGradientBorder = ({
  children,
  borderRadius,
  borderWidth = 1.5,
  // The base color never dips below primaryBlue — a full ring stays
  // visibly there on every side at all times; only the highlight
  // brightens above that floor as it sweeps around, rather than the
  // whole ring dimming toward near-invisible on the opposite side.
  gradientColors = [
    colors.primaryBlue,
    colors.primaryBlue,
    "#9FE8FF",
    colors.primaryBlue,
    colors.primaryBlue,
  ] as const,
  gradientLocations = [0, 0.3, 0.5, 0.7, 1] as const,
  innerBackgroundColor = "white",
  isAnimating = true,
  style,
}: AnimatedGradientBorderProps) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAnimating) return;
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation, isAnimating]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.outer, { borderRadius }, style]}>
      <Animated.View
        style={[styles.spinner, { transform: [{ rotate: spin }] }]}
      >
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <View
        style={[
          styles.inner,
          {
            margin: borderWidth,
            borderRadius: Math.max(borderRadius - borderWidth, 0),
            backgroundColor: innerBackgroundColor,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    alignSelf: "flex-start",
    overflow: "hidden",
    // A transparent overflow:hidden View clipping an absolutely-positioned
    // animated child can clip unreliably on iOS without a real
    // compositing layer — an explicit (even transparent) background
    // forces one, instead of leaving it to hidden defaults.
    backgroundColor: "rgba(0,0,0,0.001)",
  },
  spinner: {
    position: "absolute",
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    top: "50%",
    left: "50%",
    marginLeft: -SPINNER_SIZE / 2,
    marginTop: -SPINNER_SIZE / 2,
  },
  inner: {
    overflow: "hidden",
  },
});

export default AnimatedGradientBorder;
