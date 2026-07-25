import { PressableProps, StyleProp, TextStyle, ViewStyle } from "react-native";

export type ButtonVariant = "primary" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonTypes extends Omit<PressableProps, "style"> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;

  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;

  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}
