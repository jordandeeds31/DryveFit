import { Text, TextInput } from "react-native";

// Poppins doesn't respond to the `fontWeight` CSS-style property the way
// system fonts do — a custom TTF has to be addressed by its exact
// PostScript family name per weight (there's no single "Poppins" family
// that auto-picks a bold variant). These names are the fonts' own
// embedded PostScript names (verified directly from each .ttf's `name`
// table — "Poppins-Regular", "Poppins-SemiBold", etc.), NOT the
// "Poppins_400Regular"-style keys @expo-google-fonts/poppins uses in its
// own useFonts() hook API — that naming is just an arbitrary JS-side
// alias created by Font.loadAsync() and only exists when fonts are loaded
// that way. Since these are instead bundled as native resources via the
// expo-font config plugin in app.json (same mechanism as the vector icon
// fonts), iOS/Android resolve fontFamily by the font's real embedded
// name, and "Poppins_400Regular" simply doesn't match anything —
// react-native-google-fonts using that string looked like a valid font
// but silently fell back to the system font on every use.
const WEIGHT_TO_FONT_FAMILY: Record<string, string> = {
  "400": "Poppins-Regular",
  normal: "Poppins-Regular",
  "600": "Poppins-SemiBold",
  "700": "Poppins-Bold",
  bold: "Poppins-Bold",
  "800": "Poppins-ExtraBold",
};
const DEFAULT_FONT_FAMILY = "Poppins-Regular";

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : ((style as Record<string, unknown>) ?? {});

// Patches Text/TextInput's own render rather than wrapping every one of
// the hundreds of existing <Text>/<Input> usages across the app. Both are
// React.forwardRef components in this RN version (0.76), whose `.render`
// is the (props, ref) => ReactNode function React actually calls — so the
// fix has to modify the INCOMING props before delegating to the original
// render, not inspect the react element it returns afterward (that
// returned element is often a different, internal component — e.g. Text
// renders into a NativePressableText/NativeText — whose own props don't
// correspond to what the app's <Text style={...}> call site passed in;
// mutating that was a no-op that looked like nothing happened).
const patchDefaultFont = (Component: any) => {
  const originalRender = Component.render;
  Component.render = function (props: any, ref: unknown) {
    const flatStyle = flattenStyle(props.style);
    if (flatStyle.fontFamily) {
      return originalRender.call(this, props, ref);
    }

    const fontFamily =
      WEIGHT_TO_FONT_FAMILY[String(flatStyle.fontWeight)] ?? DEFAULT_FONT_FAMILY;

    return originalRender.call(
      this,
      { ...props, style: [{ fontFamily }, props.style] },
      ref,
    );
  };
};

patchDefaultFont(Text);
patchDefaultFont(TextInput);
