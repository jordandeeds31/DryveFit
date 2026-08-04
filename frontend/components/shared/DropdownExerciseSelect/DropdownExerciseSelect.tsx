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

const DropdownExerciseSelect = ({
  selectedExercise,
  setSelectedExercise,
}: DropdownExerciseSelectProps) => {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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
    if (searchText.length === 0) return exercises;
    return exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [exercises, searchText]);

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
