import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";

interface GlassCardProps {
  children: React.ReactNode;
  // Applied to the outer wrapper — layout/positioning (margin, width,
  // flex), not internal spacing.
  style?: StyleProp<ViewStyle>;
  // Applied to the inner content view (padding, gap between children) —
  // separate from `style` since the outer wrapper also carries the
  // shadow/border, and padding there would just push those outward
  // instead of padding the actual visible card content.
  contentStyle?: StyleProp<ViewStyle>;
  // Lower for a barely-there pane (e.g. a banner), higher for a card meant
  // to visually separate from busy content behind it (e.g. over the map
  // on Cardio). Kept in a narrow range on purpose — this app's glass
  // treatment is meant to read as minimal, not heavy/frosted-to-opacity.
  intensity?: number;
}

// The one shared "frosted glass" surface used across the app instead of a
// plain white card — a translucent white base (so it still reads as a
// card even where BlurView's blur itself is unsupported/weak, e.g. older
// Android) with a real blur layered on top, a hairline light border, and
// a soft shadow standing in for depth instead of a harder drop shadow.
const GlassCard = ({
  children,
  style,
  contentStyle,
  intensity = 40,
}: GlassCardProps) => {
  return (
    <View style={[styles.shadowWrapper, style]}>
      <View style={styles.clip}>
        <BlurView
          intensity={intensity}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tint} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
};

export default GlassCard;

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  clip: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  // Sits between the blur and the content — a low-opacity white wash that
  // keeps text legible over busy backgrounds and is what actually reads
  // as "glass" on platforms/devices where the blur itself is subtle.
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  content: {
    padding: 16,
  },
});
