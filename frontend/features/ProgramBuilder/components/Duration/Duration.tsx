import styles from "./Duration.styles";
import { View, TouchableOpacity, Text } from "react-native";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { DurationProps } from "./Duration.types";

const durations = [30, 60, 90] as const;

const Duration = ({ durationDays, setDurationDays }: DurationProps) => {
    return (
        <View style={styles.container}>
            <Text style={programBuilderStyles.label}>PROGRAM CYCLE DURATION?</Text>
            <View style={styles.durationsContainer}>
                {durations.map((duration, index) => (
                    <TouchableOpacity style={[styles.durationButton, duration === durationDays && styles.durationButtonSelected]} key={index} onPress={() => setDurationDays(duration)}>
                        <Text style={[styles.duration, duration === durationDays && styles.durationSelected]}>{duration} DAYS</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )
}

export default Duration;