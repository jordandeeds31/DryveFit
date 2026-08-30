import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "@/constants/colors";
import { useExercises } from "@/hooks/useExercises";
import { Exercise } from "@/types/exercise.types";
import styles from "./DropdownExerciseSelect.styles";
import { DropdownExerciseSelectProps } from "./DropdownExerciseSelect.types";

// Broader groupings over the catalog's fine-grained muscleGroup values
// (e.g. "lats"/"traps"/"lower back" all read as "Back" here) — a tab per
// exact muscleGroup would be 15 of them, which browses worse than it
// filters. "All" always comes first and clears the filter entirely.
const BODY_PART_CATEGORIES: { label: string; muscleGroups: string[] | null }[] = [
  { label: "All", muscleGroups: null },
  { label: "Chest", muscleGroups: ["chest"] },
  { label: "Back", muscleGroups: ["back", "lats", "traps", "lower back"] },
  { label: "Shoulders", muscleGroups: ["shoulders"] },
  { label: "Arms", muscleGroups: ["biceps", "triceps", "forearms"] },
  { label: "Legs", muscleGroups: ["quads", "hamstrings", "calves", "glutes"] },
  { label: "Core", muscleGroups: ["abs", "obliques"] },
];

const DropdownExerciseSelect = ({
  selectedExercise = null,
  setSelectedExercise,
  multiple = false,
  selectedExercises = [],
  onToggleExercise,
  overlay = false,
  onOpen,
}: DropdownExerciseSelectProps) => {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  // Blurring on the way out (below) isn't always enough by itself — the
  // TextInput can still silently regain native focus and re-fire onFocus
  // right as this screen comes back into view, reopening the dropdown
  // before the user has touched anything. This blocks openDropdown for a
  // brief window right after regaining focus, since no real tap could
  // land that fast.
  const suppressAutoOpenRef = useRef(false);

  // Every path that opens the dropdown goes through this instead of
  // setIsOpen(true) directly, so onOpen can't be missed from one of them.
  const openDropdown = () => {
    if (suppressAutoOpenRef.current) return;
    setIsOpen(true);
    onOpen?.();
  };
  const [selectedCategory, setSelectedCategory] = useState(
    BODY_PART_CATEGORIES[0].label,
  );
  const inputRef = useRef<TextInput>(null);

  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      setIsOpen(false);
      // Screens stay mounted across tab switches, so a still-focused
      // TextInput can silently regain focus when this screen comes back
      // and re-fire onFocus, reopening the dropdown right away — blur it
      // explicitly so that can't happen.
      inputRef.current?.blur();
      return;
    }

    suppressAutoOpenRef.current = true;
    const timeout = setTimeout(() => {
      suppressAutoOpenRef.current = false;
    }, 300);
    return () => clearTimeout(timeout);
  }, [isFocused]);

  const { data: exercises, isLoading } = useExercises();

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];

    const category = BODY_PART_CATEGORIES.find(
      (c) => c.label === selectedCategory,
    );
    const byCategory = !category?.muscleGroups
      ? exercises
      : exercises.filter((exercise: Exercise) =>
          category.muscleGroups!.includes(exercise.muscleGroup),
        );

    if (searchText.length === 0) return byCategory;
    return byCategory.filter((exercise: Exercise) =>
      exercise.name.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [exercises, searchText, selectedCategory]);

  const isExerciseSelected = (exercise: Exercise) =>
    multiple
      ? selectedExercises.some((selected) => selected.id === exercise.id)
      : selectedExercise?.id === exercise.id;

  const handleSelect = (exercise: Exercise) => {
    if (multiple) {
      onToggleExercise?.(exercise);
      setSearchText("");
      // Stays open — multi-select is about picking several in a row
      // without having to reopen the dropdown after each tap.
      return;
    }
    setSelectedExercise?.(exercise);
    setSearchText("");
    setIsOpen(false);
  };

  const handleChangeText = (text: string) => {
    setSearchText(text);
    openDropdown();
  };

  const hasSelection = multiple ? selectedExercises.length > 0 : !!selectedExercise;
  const placeholder = multiple
    ? selectedExercises.length > 0
      ? `${selectedExercises.length} exercise${selectedExercises.length === 1 ? "" : "s"} selected`
      : "Search for exercises"
    : selectedExercise
      ? selectedExercise.name
      : "Search for an exercise";

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[styles.input, hasSelection && styles.inputSelected]}
          placeholder={placeholder}
          placeholderTextColor={hasSelection ? "#000000" : colors.textMuted}
          value={searchText}
          onChangeText={handleChangeText}
          onFocus={openDropdown}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => (isOpen ? setIsOpen(false) : openDropdown())}
        >
          <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} />
        </TouchableOpacity>
      </View>

      {/* Always visible (not just once the dropdown is open) — browsing by
          body part shouldn't require opening the search results first, and
          this same row keeps filtering them once it is open, rather than
          hiding or duplicating itself. */}
      <View style={styles.categoryRow}>
        {BODY_PART_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.label}
            style={[
              styles.categoryChip,
              selectedCategory === category.label &&
                styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category.label)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.label &&
                  styles.categoryChipTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isOpen && (
        <View style={[styles.dropdown, overlay && styles.dropdownOverlay]}>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            // "always" (not "handled") — multi-select keeps this list open
            // across several taps in a row, so the search input staying
            // focused/the keyboard staying up between taps actually
            // matters here, unlike single-select's one-tap-then-close.
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {isLoading && (
              <Text style={styles.loadingText}>Loading exercises...</Text>
            )}
            {!isLoading && filteredExercises.length === 0 && (
              <Text style={styles.loadingText}>No exercises found</Text>
            )}
            {filteredExercises.map((exercise) => {
              const isSelected = isExerciseSelected(exercise);
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => handleSelect(exercise)}
                >
                  <View style={styles.itemTextGroup}>
                    <Text style={styles.itemName}>{exercise.name}</Text>
                    <Text style={styles.itemMeta}>
                      {exercise.muscleGroup} • {exercise.equipment}
                    </Text>
                  </View>
                  {multiple && (
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxChecked,
                      ]}
                    >
                      {isSelected && (
                        <Feather name="check" size={12} color="white" />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {multiple && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsOpen(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default DropdownExerciseSelect;
