import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes } from "@/constants/typography";

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
    maxWidth: "78%",
  },
  rowOwn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  rowOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  // A photo should fill the bubble completely edge-to-edge, not sit inside
  // the same text padding — overflow:hidden so the bubble's own rounded
  // corners clip the image, instead of the bubble's background color
  // (blue for bubbleOwn) showing through as a border around it.
  //
  // Explicit paddingHorizontal/paddingVertical here, NOT the `padding`
  // shorthand — RN resolves the more-specific paddingHorizontal/Vertical
  // from `bubble` ahead of a later, less-specific `padding` regardless of
  // style-array order, so a bare `padding: 0` here silently loses to
  // bubble's `paddingHorizontal: spacing.sm` and does nothing.
  bubbleWithImage: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden",
  },
  image: {
    width: 200,
    height: 200,
    backgroundColor: colors.borderGray,
  },
  imageWithCaption: {
    marginBottom: 4,
  },
  textUnderImage: {
    paddingHorizontal: spacing.xs,
    paddingTop: 6,
    paddingBottom: 2,
  },
  bubbleOwn: {
    backgroundColor: colors.primaryBlue,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.lightGraySoft,
    borderBottomLeftRadius: 4,
  },
  bubblePending: {
    opacity: 0.6,
  },
  textOwn: {
    fontSize: fontSizes.sm,
    color: "white",
  },
  textOther: {
    fontSize: fontSizes.sm,
    color: "#000",
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    marginHorizontal: 4,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
  viewerCloseButton: {
    position: "absolute",
    right: 16,
    padding: spacing.xs,
  },
});

export default styles;
