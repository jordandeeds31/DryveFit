import type { ComponentProps } from "react";
import { PressableProps, StyleProp, TextStyle, ViewStyle } from "react-native";
import Feather from "@expo/vector-icons/Feather";

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
  icon?: ComponentProps<typeof Feather>["name"];
  iconSize?: number;

  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}
