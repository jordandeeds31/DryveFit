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
  selectedExercise,
  setSelectedExercise,
}: DropdownExerciseSelectProps) => {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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
    }
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

  const handleSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setSearchText("");
    setIsOpen(false);
  };

  const handleChangeText = (text: string) => {
    setSearchText(text);
    setIsOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[styles.input, selectedExercise && styles.inputSelected]}
          placeholder={
            selectedExercise ? selectedExercise.name : "Search for an exercise"
          }
          placeholderTextColor={
            selectedExercise ? "#000000" : colors.textMuted
          }
          value={searchText}
          onChangeText={handleChangeText}
          onFocus={() => setIsOpen(true)}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setIsOpen((prev) => !prev)}>
          <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} />
        </TouchableOpacity>
      </View>

      {isOpen && (
        <View style={styles.dropdown}>
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
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {isLoading && (
              <Text style={styles.loadingText}>Loading exercises...</Text>
            )}
            {!isLoading && filteredExercises.length === 0 && (
              <Text style={styles.loadingText}>No exercises found</Text>
            )}
            {filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.item}
                onPress={() => handleSelect(exercise)}
              >
                <Text style={styles.itemName}>{exercise.name}</Text>
                <Text style={styles.itemMeta}>
                  {exercise.muscleGroup} • {exercise.equipment}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default DropdownExerciseSelect;
