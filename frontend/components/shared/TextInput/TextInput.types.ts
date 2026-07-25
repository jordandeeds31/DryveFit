import { TextInputProps as RNTextInputProps } from "react-native";

export interface TextInputTypes extends Omit<RNTextInputProps, "style"> {
  label?: string;
  error?: string | null;
  isPassword?: boolean;
}
