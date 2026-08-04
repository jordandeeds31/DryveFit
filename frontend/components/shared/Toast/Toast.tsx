import { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";
import styles from "./Toast.styles";

interface ToastProps {
  visible: boolean;
  message: string;
  onHide: () => void;
}

const Toast = ({ visible, message, onHide }: ToastProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onHide();
    });

    return () => animation.stop();
  }, [visible, opacity, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

export default Toast;
