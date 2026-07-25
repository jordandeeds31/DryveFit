import styles from "./SessionMinutes.styles";
import { SessionMinutesProps } from "./SessionMinutes.types";
import { View, Text, TouchableOpacity } from "react-native";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { SESSION_MINUTES_OPTIONS } from "@/types/programs.types";

const SessionMinutes = ({ sessionMinutes, setSessionMinutes }: SessionMinutesProps) => {
    return (
        <View style={styles.container}>
            <Text style={programBuilderStyles.label}>TARGET SESSION DURATION?</Text>
            <View style={styles.sessionRow}>
                {SESSION_MINUTES_OPTIONS.map((minutes, index) => (
                    <TouchableOpacity key={index} style={[styles.sessionButton, sessionMinutes === minutes && styles.sessionButtonSelected]} onPress={() => setSessionMinutes(minutes)}>
                        <Text style={[styles.session, sessionMinutes === minutes && styles.sessionSelected]}>{minutes} MINS</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )
}

export default SessionMinutes;