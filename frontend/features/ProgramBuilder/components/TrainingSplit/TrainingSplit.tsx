import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import styles from "./TrainingSplit.styles";
import programBuilderStyles from "../../ProgramBuilder.styles";
import Modal from "@/components/shared/Modal/Modal";
import { colors } from "@/constants/colors";
import { TRAINING_SPLITS, TrainingSplit as TrainingSplitType } from "@/types/programs.types";
import { TrainingSplitProps } from "./TrainingSplit.types";

const SPLIT_DESCRIPTIONS: Record<TrainingSplitType, string> = {
  "full body": "Every workout trains your whole body — chest, back, legs, and shoulders all in the same session. Great if you're just starting out or can only train a few days a week, since nothing gets left out no matter how many sessions you fit in.",
  "upper / lower": "Your training days alternate between upper body (chest, back, shoulders, arms) and lower body (legs). A good next step once full-body sessions start to feel rushed — each half of your body gets more focused time.",
  "push / pull / legs": "Days are grouped by movement: \"push\" days work muscles used to push weight away from you (chest, shoulders, triceps), \"pull\" days work muscles used to pull weight toward you (back, biceps), and leg days cover everything below the waist. Lets you train more often while still giving each muscle group time to recover between sessions.",
  "bro split": "Each training day is dedicated to one main muscle group — for example chest one day, back the next, legs another day. Popular when you're training frequently and want to give full attention, and more total work, to one area at a time.",
};

const TrainingSplit = ({ trainingSplit, setTrainingSplit }: TrainingSplitProps) => {
  const [descriptionOption, setDescriptionOption] =
    useState<TrainingSplitType | null>(null);

  return (
    <View style={styles.container}>
      <Text style={programBuilderStyles.label}>TRAINING SPLIT?</Text>
      <View style={styles.optionsRow}>
        {TRAINING_SPLITS.map((option) => {
          const isSelected = trainingSplit === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => setTrainingSplit(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.toUpperCase()}
              </Text>
              <TouchableOpacity onPress={() => setDescriptionOption(option)}>
                <Feather
                  name="info"
                  size={14}
                  color={isSelected ? "white" : colors.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>
      <Modal
        visible={!!descriptionOption}
        onClose={() => setDescriptionOption(null)}
        title={descriptionOption?.toUpperCase()}
        titleStyle={styles.descriptionModalTitle}
      >
        <Text style={styles.descriptionModalBody}>
          {descriptionOption ? SPLIT_DESCRIPTIONS[descriptionOption] : null}
        </Text>
      </Modal>
    </View>
  );
};

export default TrainingSplit;
