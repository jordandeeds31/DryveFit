import { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import styles from "./StartDate.styles";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { colors } from "@/constants/colors";
import { StartDateProps } from "./StartDate.types";

const formatDate = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const StartDate = ({ startDate, setStartDate }: StartDateProps) => {
  const [showPicker, setShowPicker] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (event.type !== "dismissed" && date) {
      setStartDate(date);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={programBuilderStyles.label}>START DATE?</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowPicker((prev) => !prev)}
      >
        <Feather name="calendar" size={16} color={colors.textSecondary} />
        <Text style={styles.dateText}>{formatDate(startDate)}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={today}
          onChange={handleChange}
        />
      )}
    </View>
  );
};

export default StartDate;
