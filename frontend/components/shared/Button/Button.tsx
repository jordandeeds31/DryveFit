import { Pressable, Text, ActivityIndicator } from "react-native";
import styles from "./Button.styles";
import { ButtonTypes } from "./Button.types";

const Button = ({
  title,
  onPress,
  variant = "primary",
  backgroundColor,
  style,
  textStyle,
}: ButtonTypes) => {
  const isOutline = variant === "outline";

  return (
    <Pressable
      style={[
        styles.button,
        isOutline && styles.buttonOutline,
        backgroundColor !== undefined && { backgroundColor },
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, isOutline && styles.textOutline, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
};

export default Button;
