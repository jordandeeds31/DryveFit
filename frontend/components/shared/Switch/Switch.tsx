import { Switch as RNSwitch, SwitchProps, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";

// RN's Switch has no size prop — scaling it down is the standard way to
// shrink it. Centralized here (rather than each screen setting its own
// transform/colors) so every toggle in the app stays the same smaller size
// without needing to remember to add it at each call site.
const Switch = ({ style, ...props }: SwitchProps) => (
  <RNSwitch
    trackColor={{ false: colors.lightGray, true: colors.primaryBlue }}
    thumbColor="white"
    style={[styles.switch, style]}
    {...props}
  />
);

const styles = StyleSheet.create({
  switch: {
    transform: [{ scale: 0.8 }],
  },
});

export default Switch;
