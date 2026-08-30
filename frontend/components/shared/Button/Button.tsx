import { Pressable, Text, View, ActivityIndicator } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import styles from "./Button.styles";
import { ButtonTypes } from "./Button.types";

const Button = ({
  title,
  onPress,
  variant = "primary",
  backgroundColor,
  disabled,
  icon,
  iconSize = 14,
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
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.content}>
        {icon && (
          <Feather
            name={icon}
            size={iconSize}
            color={isOutline ? colors.primaryBlue : "white"}
          />
        )}
        <Text style={[styles.text, isOutline && styles.textOutline, textStyle]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

export default Button;
