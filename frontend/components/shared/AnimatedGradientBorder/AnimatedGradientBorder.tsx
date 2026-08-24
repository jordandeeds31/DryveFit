import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
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

// A reasonable guess before the real size is measured via onLayout —
// only visible for a single frame, so it doesn't need to be exact.
const FALLBACK_SPINNER_SIZE = 140;

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
  // Rotates an oversized gradient square behind a masked inner area, so
  // only a thin ring around the edge is visible — RN has no native conic
  // gradient, so a spinning linear one is the standard stand-in. The
  // spinner has to scale with the wrapped element's own size: too large
  // relative to it (e.g. a single large fixed constant used for every
  // button regardless of size) and the visible ring only ever samples a
  // narrow band right around the gradient's midpoint no matter the
  // rotation angle, since it never gets far enough from center to reach
  // the gradient's other stops — the ring barely changes color as it
  // spins. Sizing it off the element's own measured diagonal keeps the
  // ring sweeping through the gradient's full range.
  const [spinnerSize, setSpinnerSize] = useState(FALLBACK_SPINNER_SIZE);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const diagonal = Math.sqrt(width * width + height * height);
    setSpinnerSize(diagonal * 1.6);
  };

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
    <View
      style={[styles.outer, { borderRadius }, style]}
      onLayout={handleLayout}
    >
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            marginLeft: -spinnerSize / 2,
            marginTop: -spinnerSize / 2,
            transform: [{ rotate: spin }],
          },
        ]}
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
    top: "50%",
    left: "50%",
  },
  inner: {
    overflow: "hidden",
  },
});

export default AnimatedGradientBorder;
