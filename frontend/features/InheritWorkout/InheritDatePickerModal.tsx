import { useState } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { toDateKey } from "@/lib/utils/date.utils";

interface InheritDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dateKey: string) => void;
  isSubmitting?: boolean;
}

const formatDate = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// Asks which date to place an inherited workout on, for a viewer with no
// active program of their own — the calendar populates with the exercise
// list on that date, unlogged, exactly like a real scheduled program day.
// Same DateTimePicker pattern as ProgramBuilder's StartDate picker: a
// button showing the current selection that toggles a picker (rather than
// always rendering one), since Android's "default" display is itself a
// native dialog and doesn't need to sit inline on the card underneath it.
const InheritDatePickerModal = ({
  visible,
  onClose,
  onConfirm,
  isSubmitting,
}: InheritDatePickerModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== "dismissed" && date) setSelectedDate(date);
    setShowPicker(false);
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Schedule this workout</Text>
          <Text style={styles.subtitle}>
            Pick which day you want it to show up on. It'll be there unlogged
            — you fill in your own sets when you actually do it.
          </Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker((prev) => !prev)}
          >
            <Feather name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              minimumDate={today}
              onChange={handleChange}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => onConfirm(toDateKey(selectedDate))}
              disabled={isSubmitting}
            >
              <Text style={styles.confirmButtonText}>
                {isSubmitting ? "Scheduling..." : "Schedule It"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

export default InheritDatePickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: spacing.lg,
    width: "100%",
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.sm,
  },
  confirmButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: "white",
    fontWeight: fontWeights.extrabold,
    fontSize: fontSizes.sm,
  },
});
