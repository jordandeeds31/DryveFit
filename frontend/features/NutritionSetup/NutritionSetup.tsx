import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import {
  useNutritionProfile,
  useUpdateNutritionProfile,
} from "@/hooks/useNutrition";
import { useCurrentUser } from "@/hooks/useUsers";
import {
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_LABELS,
  ActivityLevel,
  GOAL_TYPES,
  GOAL_TYPE_LABELS,
  NutritionGoalType,
} from "@/types/nutrition.types";
import { Gender } from "@/types/user.types";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import {
  cmToInches,
  inchesToCm,
  kgToLbs,
  lbsToKg,
  weightUnitLabel,
} from "@/lib/utils/units";
import styles from "./NutritionSetup.styles";

interface NutritionSetupProps {
  onSaved: () => void;
}

const NutritionSetup = ({ onSaved }: NutritionSetupProps) => {
  const { mutate: saveProfile, isPending, error } = useUpdateNutritionProfile();
  const unitSystem = useUnitSystem();
  const isMetric = unitSystem === "metric";
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: existingProfile, isLoading: isProfileLoading } =
    useNutritionProfile();

  const [gender, setGender] = useState<Gender | null>(null);
  // Named for what's typed, not what's stored — this is kg when isMetric,
  // converted to lbs (the field the backend/Mifflin-St Jeor calc actually
  // expects) only at submit time in handleSubmit below.
  const [weightInput, setWeightInput] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goalType, setGoalType] = useState<NutritionGoalType | null>(null);

  // Runs once, the first time both queries have settled — not on every
  // refetch (e.g. right after saving), which would otherwise stomp on
  // whatever the user is mid-typing with the just-saved values.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || isUserLoading || isProfileLoading) return;
    hydratedRef.current = true;

    // A gender already saved specifically for the nutrition calc wins over
    // the general profile setting, but if this is the first time through,
    // fall back to what's already set in Profile/Settings so the user
    // isn't asked to pick something they've already told the app once.
    const genderFallback =
      (existingProfile?.gender as Gender | null | undefined) ??
      currentUser?.gender ??
      null;
    setGender(genderFallback);

    if (existingProfile?.weightLbs != null) {
      setWeightInput(
        isMetric
          ? String(Math.round(lbsToKg(existingProfile.weightLbs) * 10) / 10)
          : String(existingProfile.weightLbs),
      );
    }

    if (existingProfile?.heightInches != null) {
      if (isMetric) {
        setHeightCm(
          String(Math.round(inchesToCm(existingProfile.heightInches))),
        );
      } else {
        const totalInches = existingProfile.heightInches;
        setHeightFeet(String(Math.floor(totalInches / 12)));
        setHeightInches(String(Math.round(totalInches % 12)));
      }
    }

    if (existingProfile?.age != null) {
      setAgeInput(String(existingProfile.age));
    }

    if (existingProfile?.activityLevel) {
      setActivityLevel(existingProfile.activityLevel);
    }

    if (existingProfile?.nutritionGoalType) {
      setGoalType(existingProfile.nutritionGoalType);
    }
  }, [currentUser, existingProfile, isUserLoading, isProfileLoading, isMetric]);

  const parsedAge = parseInt(ageInput, 10);
  const isAgeValid =
    ageInput !== "" && Number.isInteger(parsedAge) && parsedAge >= 13 && parsedAge <= 120;

  const parsedInches = parseFloat(heightInches) || 0;
  // 0-11 only — 12+ inches should be entered as another foot instead, same
  // as how anyone actually states a height.
  const isInchesValid = isMetric || (parsedInches >= 0 && parsedInches <= 11);
  // The backend/Mifflin-St Jeor calc always takes heightInches regardless
  // of unitSystem — a metric user's single cm field is converted here,
  // rather than the feet+inches split ever existing for them at all.
  const totalHeightInches = isMetric
    ? cmToInches(parseFloat(heightCm) || 0)
    : (parseFloat(heightFeet) || 0) * 12 + parsedInches;

  const isValid =
    !!gender &&
    parseFloat(weightInput) > 0 &&
    totalHeightInches > 0 &&
    isInchesValid &&
    isAgeValid &&
    !!activityLevel &&
    !!goalType;

  const handleSubmit = () => {
    if (!isValid || !gender || !activityLevel || !goalType) return;

    const weightLbs = isMetric
      ? kgToLbs(parseFloat(weightInput))
      : parseFloat(weightInput);

    saveProfile(
      {
        gender,
        weightLbs,
        heightInches: totalHeightInches,
        age: parsedAge,
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
          label={`Weight (${weightUnitLabel(unitSystem)})`}
          placeholder={isMetric ? "e.g. 75" : "e.g. 165"}
          keyboardType="numeric"
          value={weightInput}
          onChangeText={setWeightInput}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Height</Text>
        {isMetric ? (
          <Input
            placeholder="e.g. 178"
            keyboardType="numeric"
            value={heightCm}
            onChangeText={setHeightCm}
          />
        ) : (
          <>
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
          </>
        )}
      </View>

      <View style={styles.section}>
        <Input
          label="Age"
          placeholder="e.g. 30"
          keyboardType="numeric"
          maxLength={3}
          value={ageInput}
          onChangeText={setAgeInput}
        />
        {!isAgeValid && ageInput !== "" && (
          <Text style={styles.fieldErrorText}>Age must be 13-120</Text>
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
