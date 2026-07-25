import { BodyPart } from "@/types/programs.types";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import styles from "./DropdownFocusAreas.style";

interface DropdownFocusAreasProps {
    data: BodyPart[];
    selectedFocusAreas: BodyPart[];
    onSelect: (bodyPart: BodyPart) => void;
}

const DropdownFocusAreas = ({ data, selectedFocusAreas, onSelect }: DropdownFocusAreasProps) => {
    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
            >
                {data.map((bodyPart) => {
                    const isSelected = selectedFocusAreas.includes(bodyPart);
                    return (
                        <TouchableOpacity
                            key={bodyPart}
                            style={styles.item}
                            onPress={() => onSelect(bodyPart)}
                        >
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                                {bodyPart}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

export default DropdownFocusAreas;

