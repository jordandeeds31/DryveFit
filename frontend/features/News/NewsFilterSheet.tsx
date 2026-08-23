import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { NewsCategory } from "@/types/news.types";

export const CATEGORY_OPTIONS: { value: NewsCategory; label: string }[] = [
  { value: "top_stories", label: "Top Stories" },
  { value: "sports", label: "Sports" },
  { value: "politics", label: "Politics & Government" },
  { value: "world", label: "World & Geopolitics" },
  { value: "crime", label: "Crime" },
  { value: "local", label: "Local" },
  { value: "fitness_nutrition", label: "Fitness & Nutrition" },
];

interface NewsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  selected: NewsCategory[];
  onChange: (categories: NewsCategory[]) => void;
  // "Local" only returns anything once the viewer has a city saved on
  // their profile — shown as a hint under that row rather than hiding it
  // outright, same "tell them what's missing" spirit as the leaderboard's
  // separate username/city setup banners.
  hasCity: boolean;
}

const NewsFilterSheet = ({
  visible,
  onClose,
  selected,
  onChange,
  hasCity,
}: NewsFilterSheetProps) => {
  const insets = useSafeAreaInsets();

  const toggle = (value: NewsCategory) => {
    if (selected.includes(value)) {
      onChange(selected.filter((c) => c !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filter by category</Text>
            {selected.length > 0 && (
              <TouchableOpacity onPress={() => onChange([])}>
                <Text style={styles.clearText}>Show all</Text>
              </TouchableOpacity>
            )}
          </View>

          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.value);
            const isLocalWithoutCity = option.value === "local" && !hasCity;
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.row}
                onPress={() => toggle(option.value)}
              >
                <View>
                  <Text style={styles.rowLabel}>{option.label}</Text>
                  {isLocalWithoutCity && (
                    <Text style={styles.rowHint}>
                      Add your city in Profile to see local news
                    </Text>
                  )}
                </View>
                <View
                  style={[styles.checkbox, isSelected && styles.checkboxChecked]}
                >
                  {isSelected && <Feather name="check" size={14} color="white" />}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
};

export default NewsFilterSheet;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderGray,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
  clearText: {
    color: colors.primaryBlue,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  rowHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  doneButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
  },
});
