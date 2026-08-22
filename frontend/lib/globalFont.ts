import { Text, TextInput } from "react-native";

// Poppins doesn't respond to the `fontWeight` CSS-style property the way
// system fonts do — a custom TTF has to be addressed by its exact
// PostScript family name per weight (there's no single "Poppins" family
// that auto-picks a bold variant). This maps this app's existing
// fontWeights scale (constants/typography.ts) to the matching bundled
// file, loaded via the expo-font config plugin in app.json.
const WEIGHT_TO_FONT_FAMILY: Record<string, string> = {
  "400": "Poppins_400Regular",
  normal: "Poppins_400Regular",
  "600": "Poppins_600SemiBold",
  "700": "Poppins_700Bold",
  bold: "Poppins_700Bold",
  "800": "Poppins_800ExtraBold",
};
const DEFAULT_FONT_FAMILY = "Poppins_400Regular";

// Patches Text/TextInput's own render rather than wrapping every one of
// the hundreds of existing <Text>/<Input> usages across the app — this
// applies Poppins everywhere with no changes needed anywhere else,
// automatically picking the correct weight-specific file from whatever
// `fontWeight` a screen's own StyleSheet already sets. A screen can still
// override with its own explicit `fontFamily` if it ever needs to.
const patchDefaultFont = (Component: any) => {
  const originalRender = Component.render;
  Component.render = function (...args: unknown[]) {
    const origin = originalRender.apply(this, args);
    const existingStyle = origin.props.style;
    const flatStyle: Record<string, unknown> = Array.isArray(existingStyle)
      ? Object.assign({}, ...existingStyle.filter(Boolean))
      : existingStyle || {};
    if (flatStyle.fontFamily) return origin;

    const fontFamily =
      WEIGHT_TO_FONT_FAMILY[String(flatStyle.fontWeight)] ?? DEFAULT_FONT_FAMILY;

    return {
      ...origin,
      props: {
        ...origin.props,
        style: [{ fontFamily }, existingStyle],
      },
    };
  };
};

patchDefaultFont(Text);
patchDefaultFont(TextInput);
