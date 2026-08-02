import { View, Text, TouchableOpacity } from "react-native";
import styles from "./EquipmentAccess.styles";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { EQUIPMENT_ACCESS } from "@/types/programs.types";
import { EquipmentAccessProps } from "./EquipmentAccess.types";

const EquipmentAccess = ({
  equipmentAccess,
  setEquipmentAccess,
}: EquipmentAccessProps) => {
  return (
    <View style={styles.container}>
      <Text style={programBuilderStyles.label}>EQUIPMENT ACCESS?</Text>
      <View style={styles.optionsRow}>
        {EQUIPMENT_ACCESS.map((option) => {
          const isSelected = equipmentAccess === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => setEquipmentAccess(option)}
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

export default EquipmentAccess;
