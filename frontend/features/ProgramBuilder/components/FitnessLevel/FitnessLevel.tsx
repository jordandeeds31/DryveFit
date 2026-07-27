import { View, Text, TouchableOpacity } from "react-native";
import styles from "./FitnessLevel.styles";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { FITNESS_LEVELS } from "@/types/programs.types";
import { FitnessLevelProps } from "./FitnessLevel.types";

const FitnessLevel = ({ fitnessLevel, setFitnessLevel }: FitnessLevelProps) => {
  return (
    <View style={styles.container}>
      <Text style={programBuilderStyles.label}>FITNESS LEVEL?</Text>
      <View style={styles.levelRow}>
        {FITNESS_LEVELS.map((level) => {
          const isSelected = fitnessLevel === level;
          return (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelButton,
                isSelected && styles.levelButtonSelected,
              ]}
              onPress={() => setFitnessLevel(level)}
            >
              <Text
                style={[
                  styles.levelText,
                  isSelected && styles.levelTextSelected,
                ]}
              >
                {level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default FitnessLevel;
