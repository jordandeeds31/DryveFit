import { View, TouchableOpacity, Text } from "react-native";
import styles from "./SelectedDays.styles";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { DAYS_OF_WEEK } from "@/types/programs.types";
import { SelectedDaysProps } from "./SelectedDays.types";

const SelectedDays = ({ selectedDays, setSelectedDays }: SelectedDaysProps) => {
    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter((d) => d !== day));
        } else {
            setSelectedDays([...selectedDays, day])
        }
    }

    return (
        <View style={styles.container}>
            <Text style={programBuilderStyles.label}>WORKOUT FREQUENCY (DAYS/WEEK)?</Text>
            <View style={styles.selectedDaysContainer}>
                {DAYS_OF_WEEK.map((day, index) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                        <TouchableOpacity key={index} style={[styles.dayButton, isSelected && styles.dayButtonSelected]} onPress={() => toggleDay(day)}>
                            <Text style={[styles.day, isSelected && styles.daySelected]}>{day.toUpperCase()}</Text>
                        </TouchableOpacity>
                    )
                })}
            </View>
        </View>
    )
}

export default SelectedDays;