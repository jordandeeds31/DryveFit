import { Exercise } from "@/types/exercise.types";

export interface DropdownExerciseSelectProps {
  // Single-select mode (the original/default) — every existing call site
  // keeps working unchanged.
  selectedExercise?: Exercise | null;
  setSelectedExercise?: (exercise: Exercise | null) => void;
  // Multi-select mode — pass `multiple` plus these instead. Tapping a row
  // toggles it in/out of `selectedExercises` rather than replacing a
  // single selection and closing the dropdown.
  multiple?: boolean;
  selectedExercises?: Exercise[];
  onToggleExercise?: (exercise: Exercise) => void;
  // Renders the results list as an absolutely-positioned overlay (above
  // everything below it, via zIndex/elevation) instead of the default
  // inline behavior, which pushes subsequent content down.
  overlay?: boolean;
  // Fires right as the results list opens — a caller embedded further
  // down a long scrollable screen (e.g. a later exercise entry in
  // WorkoutLogger) can use this to scroll itself into view, since this
  // component has no way to know about (or reach) whatever scroll
  // container it's sitting inside of.
  onOpen?: () => void;
}
