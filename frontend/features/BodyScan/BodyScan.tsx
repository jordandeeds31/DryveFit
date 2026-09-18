import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Feather from "@expo/vector-icons/Feather";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import { useCurrentUser } from "@/hooks/useUsers";
import { useNutritionProfile } from "@/hooks/useNutrition";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { useBodyScanHistory, useSubmitBodyScan } from "@/hooks/useBodyScan";
import { ensureProAccess } from "@/lib/purchases/requirePro";
import { cmToInches, inchesToCm, lbsToKg, weightUnitLabel } from "@/lib/utils/units";
import { Gender } from "@/types/user.types";
import { BodyScan as BodyScanResult } from "@/types/bodyScan.types";
import { colors } from "@/constants/colors";
import styles from "./BodyScan.styles";

const SCAN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const formatScanDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatMeasurementLabel = (key: string): string =>
  key
    .replace(/_?cm$/i, "")
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const MetricRow = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.metricRow}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const ResultsCard = ({ scan }: { scan: BodyScanResult }) => (
  <View style={styles.card}>
    <View style={styles.headlineRow}>
      <View style={styles.headlineStat}>
        <Text style={styles.headlineValue}>{scan.bodyFatPercentage}%</Text>
        <Text style={styles.headlineLabel}>Body Fat</Text>
      </View>
      <View style={styles.headlineStat}>
        <Text style={styles.headlineValue}>{scan.muscleScore}</Text>
        <Text style={styles.headlineLabel}>Muscle Score</Text>
      </View>
      <View style={styles.headlineStat}>
        <Text style={styles.headlineValue}>{scan.fitnessScore}</Text>
        <Text style={styles.headlineLabel}>Fitness Score</Text>
      </View>
    </View>

    <MetricRow label="Body Fat Category" value={scan.bodyFatCategory} />
    <MetricRow label="Body Type" value={scan.bodyType} />
    <MetricRow label="Lean Mass" value={`${scan.leanMassKg} kg`} />
    <MetricRow label="Symmetry Score" value={`${scan.symmetryScore}/100`} />
    <MetricRow label="BMI" value={scan.bmi} />

    {Object.keys(scan.circumferences).length > 0 && (
      <>
        <Text style={styles.sectionLabel}>Measurements</Text>
        {Object.entries(scan.circumferences).map(([key, value]) => (
          <MetricRow
            key={key}
            label={formatMeasurementLabel(key)}
            value={`${value} cm`}
          />
        ))}
      </>
    )}
  </View>
);

const BodyScan = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: nutritionProfile } = useNutritionProfile();
  const unitSystem = useUnitSystem();
  const isMetric = unitSystem === "metric";
  const { data: history, isLoading: isHistoryLoading } = useBodyScanHistory();
  const { mutate: submitScan, isPending } = useSubmitBodyScan();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  // Prefills once from the nutrition profile (falling back to the general
  // profile's gender), same one-time-hydration pattern as
  // NutritionSetup.tsx — a user who never completed Nutrition Setup just
  // starts with blank, freely-editable fields instead of being blocked.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !nutritionProfile) return;
    hydratedRef.current = true;

    const genderFallback = (nutritionProfile.gender as Gender | null) ?? currentUser?.gender ?? null;
    setGender(genderFallback);

    if (nutritionProfile.weightLbs != null) {
      setWeightInput(
        isMetric
          ? String(Math.round(lbsToKg(nutritionProfile.weightLbs) * 10) / 10)
          : String(nutritionProfile.weightLbs),
      );
    }
    if (nutritionProfile.heightInches != null) {
      if (isMetric) {
        setHeightCmInput(String(Math.round(inchesToCm(nutritionProfile.heightInches))));
      } else {
        setHeightFeet(String(Math.floor(nutritionProfile.heightInches / 12)));
        setHeightInches(String(Math.round(nutritionProfile.heightInches % 12)));
      }
    }
    if (nutritionProfile.age != null) {
      setAgeInput(String(nutritionProfile.age));
    }
  }, [nutritionProfile, currentUser, isMetric]);

  const parsedAge = parseInt(ageInput, 10);
  const isAgeValid = ageInput !== "" && Number.isInteger(parsedAge) && parsedAge >= 13 && parsedAge <= 120;
  const totalHeightInches = isMetric
    ? cmToInches(parseFloat(heightCmInput) || 0)
    : (parseFloat(heightFeet) || 0) * 12 + (parseFloat(heightInches) || 0);
  const isFormValid =
    !!gender && parseFloat(weightInput) > 0 && totalHeightInches > 0 && isAgeValid;

  const latestScan = history?.[0] ?? null;
  const cooldownRemainingMs = latestScan
    ? SCAN_COOLDOWN_MS - (Date.now() - new Date(latestScan.createdAt).getTime())
    : 0;
  const isInCooldown = cooldownRemainingMs > 0;
  const viewedScan = selectedScanId
    ? (history?.find((scan: BodyScanResult) => scan.id === selectedScanId) ?? latestScan)
    : latestScan;

  const requestPhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      // Camera and photo-library access are separate iOS permissions —
      // granting one doesn't grant the other, and once either has been
      // denied once, iOS never shows its own prompt again (canAskAgain
      // goes false for good), so without this Settings deep link the
      // alert below would be a dead end repeating the same ask forever.
      Alert.alert(
        "Permission needed",
        fromCamera
          ? "Allow camera access to take a Body Scan photo."
          : "Allow photo library access to choose a Body Scan photo.",
        permission.canAskAgain
          ? undefined
          : [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });

    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!photoUri || !isFormValid || !gender) return;

    const granted = await ensureProAccess();
    if (!granted) return;

    const heightCm = Math.round(inchesToCm(totalHeightInches));
    const weightKg = Math.round(isMetric ? parseFloat(weightInput) : lbsToKg(parseFloat(weightInput)));

    submitScan(
      { photoUri, heightCm, weightKg, age: parsedAge, gender },
      {
        onSuccess: () => {
          setPhotoUri(null);
          setSelectedScanId(null);
        },
        onError: (error: unknown) => {
          const message =
            (error as { message?: string })?.message ??
            "Something went wrong running that scan — try again.";
          Alert.alert("Couldn't complete scan", message);
        },
      },
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Body Scan</Text>
      <Text style={styles.subtitle}>
        Get your body fat, muscle score, and measurements from a single photo
        — your program automatically adjusts using the same real exercise
        science (% of your 1-rep max, progressive overload) whether or not
        you scan.
      </Text>

      {viewedScan && <ResultsCard scan={viewedScan} />}

      {isInCooldown ? (
        <View style={styles.cooldownBanner}>
          <Feather name="clock" size={16} color={colors.textSecondary} />
          <Text style={styles.cooldownText}>
            Next scan available in{" "}
            {Math.ceil(cooldownRemainingMs / 86400000)} day
            {Math.ceil(cooldownRemainingMs / 86400000) === 1 ? "" : "s"}.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>New Scan</Text>
          <Text style={styles.instructions}>
            Stand 2-3m from the camera, front-facing, in good lighting.
          </Text>

          {photoUri ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => setPhotoUri(null)}
              >
                <Feather name="x" size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtonRow}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => requestPhoto(true)}
              >
                <Feather name="camera" size={18} color={colors.primaryBlue} />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => requestPhoto(false)}
              >
                <Feather name="image" size={18} color={colors.primaryBlue} />
                <Text style={styles.photoButtonText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.formSection}>
            <Text style={styles.label}>Sex</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.option, gender === "male" && styles.optionActive]}
                onPress={() => setGender("male")}
              >
                <Text style={[styles.optionText, gender === "male" && styles.optionTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.option, gender === "female" && styles.optionActive]}
                onPress={() => setGender("female")}
              >
                <Text style={[styles.optionText, gender === "female" && styles.optionTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formSection}>
            <Input
              label={`Weight (${weightUnitLabel(unitSystem)})`}
              placeholder={isMetric ? "e.g. 75" : "e.g. 165"}
              keyboardType="numeric"
              value={weightInput}
              onChangeText={setWeightInput}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Height</Text>
            {isMetric ? (
              <Input
                placeholder="e.g. 178"
                keyboardType="numeric"
                value={heightCmInput}
                onChangeText={setHeightCmInput}
              />
            ) : (
              <View style={styles.heightRow}>
                <View style={styles.heightField}>
                  <Input
                    placeholder="Feet"
                    keyboardType="numeric"
                    maxLength={1}
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                  />
                </View>
                <View style={styles.heightField}>
                  <Input
                    placeholder="Inches"
                    keyboardType="numeric"
                    maxLength={2}
                    value={heightInches}
                    onChangeText={setHeightInches}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Input
              label="Age"
              placeholder="e.g. 30"
              keyboardType="numeric"
              maxLength={3}
              value={ageInput}
              onChangeText={setAgeInput}
            />
          </View>

          <Button
            title={isPending ? "Scanning..." : "Run Body Scan"}
            onPress={handleSubmit}
            disabled={!photoUri || !isFormValid || isPending}
            style={styles.submitButton}
          />
        </View>
      )}

      {isHistoryLoading && <ActivityIndicator style={styles.historyLoading} />}

      {!!history && history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionLabel}>History</Text>
          {history.map((scan: BodyScanResult) => (
            <TouchableOpacity
              key={scan.id}
              style={[
                styles.historyRow,
                (viewedScan?.id === scan.id) && styles.historyRowActive,
              ]}
              onPress={() => setSelectedScanId(scan.id)}
            >
              <Text style={styles.historyDate}>{formatScanDate(scan.createdAt)}</Text>
              <Text style={styles.historyStat}>{scan.bodyFatPercentage}% body fat</Text>
              <Text style={styles.historyStat}>{scan.muscleScore} muscle score</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default BodyScan;
