import { ReactNode, RefObject } from "react";
import { StyleProp, TextStyle, View } from "react-native";

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  closable?: boolean;
  // Rendered in the top row, to the left of the close (x) button — a
  // heading for the modal's content so it sits in the same row as the X
  // instead of scrolling away as part of children. Truncates to one line
  // to leave room for headerAction/the X alongside it.
  title?: string;
  titleStyle?: StyleProp<TextStyle>;
  // Rendered in the top row too, grouped with the close (x) button on the
  // right (when title is also given) or occupying the left slot itself
  // (when it isn't) — for an action (e.g. a Save button) that needs to
  // stay pinned at the top of the card, always visible, instead of
  // scrolling away with the rest of the modal's content.
  headerAction?: ReactNode;
  // Rendered below the scrollable content, still inside the card — for an
  // action (e.g. an "Add" button) that needs to stay pinned at the bottom,
  // always visible, instead of scrolling away with the rest of the
  // modal's content. Same reasoning as headerAction, just anchored to the
  // opposite edge.
  footer?: ReactNode;
  // "default" is the original vertically-centered, ~88%-height card.
  // "large" pins the card to the top of the screen (below the safe area)
  // and gives it more height — for content that tends to run long (lots
  // of exercises/sets) where centering just wastes space above and below.
  size?: "default" | "large";
  // Whether the scroll area auto-scrolls to keep a focused input above the
  // keyboard. Default true. RNModal renders in its own native window, and
  // that combination with react-native-keyboard-controller's position
  // tracking can misfire — for content that's already short enough to
  // never need it (a search field near the very top of a small card),
  // turning it off avoids the misfire entirely rather than trying to
  // out-tune it.
  keyboardAware?: boolean;
  // How much space (px) the keyboard-aware auto-scroll keeps clear below a
  // focused input, above the keyboard. Default 60 is plenty for a bare
  // input, but a modal whose focused input opens something tall right
  // below it (e.g. a dropdown's results list) needs a bigger reserve, or
  // the keyboard covers nearly all of that content the instant it opens,
  // leaving no visible/touchable area to scroll within.
  bottomOffset?: number;
  // Narrows the card's own horizontal padding (and the overlay's outer
  // margin around it) so the card spans closer to the full screen width —
  // for content that's mostly buttons/selectors needing real horizontal
  // room (e.g. a day-of-week picker), rather than prose that reads better
  // narrower.
  wide?: boolean;
  // Anchors the card to the bottom of the screen (edge-to-edge, only the
  // top corners rounded, with a drag handle) and slides it up from below
  // instead of fading in centered — the bottom-sheet treatment, for
  // content reached from a "+"/action button rather than an alert-style
  // confirmation.
  bottom?: boolean;
}

export interface ModalHandle {
  // Scrolls the card's internal content area to the bottom — for a caller
  // that just added something off the bottom of the visible area (e.g. a
  // new blank exercise entry appended below a long list) and wants it
  // brought into view instead of leaving the viewer to scroll manually.
  scrollToEnd: () => void;
  // Scrolls just far enough to bring a specific descendant (e.g. an
  // exercise entry whose dropdown just opened, further down a long list)
  // into view, rather than jumping all the way to the end — for content
  // opening somewhere in the middle, not necessarily at the bottom.
  scrollToView: (nodeRef: RefObject<View | null>, extraOffset?: number) => void;
}
