import { View, Text, TouchableOpacity } from "react-native";
import styles from "./TrainingGoal.styles";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { TRAINING_GOALS } from "@/types/programs.types";
import { TrainingGoalProps } from "./TrainingGoal.types";

const TrainingGoal = ({ trainingGoal, setTrainingGoal }: TrainingGoalProps) => {
  return (
    <View style={styles.container}>
      <Text style={programBuilderStyles.label}>PRIMARY TRAINING GOAL?</Text>
      <View style={styles.optionsRow}>
        {TRAINING_GOALS.map((option) => {
          const isSelected = trainingGoal === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => setTrainingGoal(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default TrainingGoal;
