import { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import { colors } from "@/constants/colors";
import { useUpdateNutritionProfile } from "@/hooks/useNutrition";
import {
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_LABELS,
  ActivityLevel,
  GOAL_TYPES,
  GOAL_TYPE_LABELS,
  NutritionGoalType,
} from "@/types/nutrition.types";
import { Gender } from "@/types/user.types";
import styles from "./NutritionSetup.styles";

const formatDate = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const MAX_BIRTHDATE = new Date();
const MIN_BIRTHDATE = new Date();
MIN_BIRTHDATE.setFullYear(MIN_BIRTHDATE.getFullYear() - 100);
const DEFAULT_BIRTHDATE = new Date();
DEFAULT_BIRTHDATE.setFullYear(DEFAULT_BIRTHDATE.getFullYear() - 30);

interface NutritionSetupProps {
  onSaved: () => void;
}

const NutritionSetup = ({ onSaved }: NutritionSetupProps) => {
  const { mutate: saveProfile, isPending, error } = useUpdateNutritionProfile();

  const [gender, setGender] = useState<Gender | null>(null);
  const [weightLbs, setWeightLbs] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [birthdate, setBirthdate] = useState(DEFAULT_BIRTHDATE);
  const [showPicker, setShowPicker] = useState(false);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goalType, setGoalType] = useState<NutritionGoalType | null>(null);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== "dismissed" && date) {
      setBirthdate(date);
    }
    setShowPicker(false);
  };

  const parsedInches = parseFloat(heightInches) || 0;
  // 0-11 only — 12+ inches should be entered as another foot instead, same
  // as how anyone actually states a height.
  const isInchesValid = parsedInches >= 0 && parsedInches <= 11;
  const totalHeightInches = (parseFloat(heightFeet) || 0) * 12 + parsedInches;

  const isValid =
    !!gender &&
    parseFloat(weightLbs) > 0 &&
    totalHeightInches > 0 &&
    isInchesValid &&
    !!activityLevel &&
    !!goalType;

  const handleSubmit = () => {
    if (!isValid || !gender || !activityLevel || !goalType) return;

    saveProfile(
      {
        gender,
        weightLbs: parseFloat(weightLbs),
        heightInches: totalHeightInches,
        birthdate: birthdate.toISOString(),
        activityLevel,
        goalType,
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <View>
      <Text style={styles.title}>Set up your nutrition goals</Text>
      <Text style={styles.subtitle}>
        We'll calculate a daily calorie and macro target for you — you can
        always fine-tune it later.
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Sex</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[styles.option, gender === "male" && styles.optionActive]}
            onPress={() => setGender("male")}
          >
            <Text
              style={[
                styles.optionText,
                gender === "male" && styles.optionTextActive,
              ]}
            >
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, gender === "female" && styles.optionActive]}
            onPress={() => setGender("female")}
          >
            <Text
              style={[
                styles.optionText,
                gender === "female" && styles.optionTextActive,
              ]}
            >
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Input
          label="Weight (lbs)"
          placeholder="e.g. 165"
          keyboardType="numeric"
          value={weightLbs}
          onChangeText={setWeightLbs}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Height</Text>
        <View style={styles.heightRow}>
          <View style={styles.heightField}>
            <Text style={styles.heightFieldLabel}>Feet</Text>
            <Input
              placeholder="e.g. 5"
              keyboardType="numeric"
              maxLength={1}
              value={heightFeet}
              onChangeText={setHeightFeet}
            />
          </View>
          <View style={styles.heightField}>
            <Text style={styles.heightFieldLabel}>Inches</Text>
            <Input
              placeholder="e.g. 10"
              keyboardType="numeric"
              maxLength={2}
              value={heightInches}
              onChangeText={setHeightInches}
            />
          </View>
        </View>
        {!isInchesValid && heightInches !== "" && (
          <Text style={styles.fieldErrorText}>Inches must be 0-11</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Birthdate</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPicker((prev) => !prev)}
        >
          <Feather name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.dateText}>{formatDate(birthdate)}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={birthdate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={MIN_BIRTHDATE}
            maximumDate={MAX_BIRTHDATE}
            onChange={handleDateChange}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Activity level</Text>
        <View style={styles.stackedOptions}>
          {ACTIVITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.stackedOption,
                activityLevel === level && styles.optionActive,
              ]}
              onPress={() => setActivityLevel(level)}
            >
              <Text
                style={[
                  styles.optionText,
                  activityLevel === level && styles.optionTextActive,
                ]}
              >
                {ACTIVITY_LEVEL_LABELS[level]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Goal</Text>
        <View style={styles.stackedOptions}>
          {GOAL_TYPES.map((goal) => (
            <TouchableOpacity
              key={goal}
              style={[
                styles.stackedOption,
                goalType === goal && styles.optionActive,
              ]}
              onPress={() => setGoalType(goal)}
            >
              <Text
                style={[
                  styles.optionText,
                  goalType === goal && styles.optionTextActive,
                ]}
              >
                {GOAL_TYPE_LABELS[goal]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>
          {(error as { message?: string }).message ?? "Something went wrong"}
        </Text>
      )}

      <Button
        title={isPending ? "Calculating..." : "Calculate My Goals"}
        onPress={handleSubmit}
        disabled={!isValid || isPending}
        style={styles.submitButton}
      />
    </View>
  );
};

export default NutritionSetup;
