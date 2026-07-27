import { Pressable, Text, ActivityIndicator } from "react-native";
import styles from "./Button.styles";
import { ButtonTypes } from "./Button.types";

const Button = ({
  title,
  onPress,
  backgroundColor,
  style,
  textStyle,
}: ButtonTypes) => {
  return (
    <Pressable
      style={[
        styles.button,
        backgroundColor !== undefined && { backgroundColor },
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </Pressable>
  );
};

export default Button;
