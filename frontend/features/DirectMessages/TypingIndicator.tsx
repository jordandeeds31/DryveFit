import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import styles from "./TypingIndicator.styles";

const DOT_COUNT = 3;
const CYCLE_MS = 900;

// Three dots pulsing in a staggered loop — a fixed CSS-style animation
// rather than anything driven by real typing-speed data, just a standard
// "someone is typing" affordance.
const TypingIndicator = () => {
  const dotAnimations = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    const animations = dotAnimations.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((index * CYCLE_MS) / DOT_COUNT),
          Animated.timing(value, {
            toValue: 1,
            duration: CYCLE_MS / 2,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: CYCLE_MS / 2,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dotAnimations]);

  return (
    <View style={styles.container}>
      {dotAnimations.map((value, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity: value }]} />
      ))}
    </View>
  );
};

export default TypingIndicator;
