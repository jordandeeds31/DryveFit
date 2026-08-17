import { ReactNode } from "react";

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  closable?: boolean;
  // Rendered in the same top row as the close (x) button, to its left —
  // for an action (e.g. a Save button) that needs to stay pinned at the
  // top of the card, always visible, instead of scrolling away with the
  // rest of the modal's content.
  headerAction?: ReactNode;
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
}
