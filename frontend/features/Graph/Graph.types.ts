import { OneRepMaxEntry } from "@/types/exercise.types";

export interface GraphProps {
  history: OneRepMaxEntry[];
  // Shown at the top of the card — the exercise this history belongs to,
  // so a grid of several graphs can tell them apart at a glance.
  title: string;
  // Overrides the card's own full-screen-width default — needed once more
  // than one of these renders side by side in a grid instead of alone,
  // full-width, down the screen.
  width?: number;
  // Trims the chart toward a roughly square card (smaller height, no
  // "ESTIMATED 1-REP MAX" subtitle, tighter padding) — used once several
  // of these sit side by side in a grid instead of one full-width.
  compact?: boolean;
  // Shows a small X in the card's top-right corner when provided — lets
  // the viewer drop this exercise from the selection without reopening
  // the dropdown.
  onRemove?: () => void;
  // Makes the whole card tappable — used in the compact grid to open this
  // same graph full-size in a modal, since a grid card is too small to
  // read the trend clearly on its own.
  onPress?: () => void;
}
