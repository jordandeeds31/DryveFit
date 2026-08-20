import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import { useCurrentUser } from "@/hooks/useUsers";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import {
  hasCompletedHealthKitConnect,
  getHealthStatsOverview,
  HealthStatsOverview,
} from "@/lib/health/healthkit";
import { formatWeight, formatDistance, cmToInches } from "@/lib/utils/units";

const formatHeight = (inches: number, isMetric: boolean): string => {
  if (isMetric) return `${Math.round(inches / cmToInches(1))} cm`;
  const feet = Math.floor(inches / 12);
  const remainder = Math.round(inches % 12);
  return `${feet}'${remainder}"`;
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const HealthStats = () => {
  const { data: currentUser } = useCurrentUser();
  const unitSystem = useUnitSystem();
  const isMetric = unitSystem === "metric";

  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<HealthStatsOverview | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    (async () => {
      const connected = await hasCompletedHealthKitConnect(currentUser.id);
      if (cancelled) return;
      setIsConnected(connected);

      if (connected) {
        const overview = await getHealthStatsOverview();
        if (!cancelled) setStats(overview);
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={safeGoBack}
        >
          <Feather name="chevron-left" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Stats</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading && <ActivityIndicator style={{ flex: 1 }} />}

      {!isLoading && !isConnected && (
        <View style={styles.emptyState}>
          <Feather name="heart" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Apple Health isn't connected</Text>
          <Text style={styles.emptySubtext}>
            Connect it from Profile to see your activity, vitals, and body
            stats here.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/Profile",
                params: { openDevices: "1" },
              })
            }
          >
            <Text style={styles.connectButtonText}>Go to Devices</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && isConnected && stats && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Section title="Today's Activity">
            <Row label="Steps" value={stats.activity.stepsToday.toLocaleString()} />
            <Row
              label="Active Energy"
              value={`${stats.activity.activeEnergyTodayKcal} kcal`}
            />
            <Row
              label="Resting Energy"
              value={`${stats.activity.basalEnergyTodayKcal} kcal`}
            />
            <Row
              label="Exercise Time"
              value={`${stats.activity.exerciseMinutesToday} min`}
            />
            <Row
              label="Stand Hours"
              value={`${stats.activity.standHoursToday} hr`}
            />
            <Row
              label="Flights Climbed"
              value={String(stats.activity.flightsClimbedToday)}
            />
            {stats.activity.walkingRunningDistanceMetersToday > 0 && (
              <Row
                label="Walking + Running"
                value={formatDistance(
                  stats.activity.walkingRunningDistanceMetersToday,
                  unitSystem,
                )}
              />
            )}
            {stats.activity.cyclingDistanceMetersToday > 0 && (
              <Row
                label="Cycling"
                value={formatDistance(
                  stats.activity.cyclingDistanceMetersToday,
                  unitSystem,
                )}
              />
            )}
            {stats.activity.swimmingDistanceMetersToday > 0 && (
              <Row
                label="Swimming"
                value={formatDistance(
                  stats.activity.swimmingDistanceMetersToday,
                  unitSystem,
                )}
              />
            )}
          </Section>

          <Section title="Heart & Vitals">
            <Row
              label="Resting Heart Rate"
              value={
                stats.vitals.restingHeartRate != null
                  ? `${stats.vitals.restingHeartRate} bpm`
                  : "No recent data"
              }
            />
            <Row
              label="Heart Rate Variability"
              value={
                stats.vitals.heartRateVariability != null
                  ? `${Math.round(stats.vitals.heartRateVariability)} ms`
                  : "No recent data"
              }
            />
            <Row
              label="Walking Heart Rate Avg"
              value={
                stats.vitals.walkingHeartRateAverage != null
                  ? `${Math.round(stats.vitals.walkingHeartRateAverage)} bpm`
                  : "No recent data"
              }
            />
            <Row
              label="VO2 Max"
              value={
                stats.vitals.vo2Max != null
                  ? `${stats.vitals.vo2Max.toFixed(1)} mL/kg/min`
                  : "No recent data"
              }
            />
          </Section>

          <Section title="Body Measurements">
            <Row
              label="Weight"
              value={
                stats.body.weightLbs != null
                  ? formatWeight(stats.body.weightLbs, unitSystem)
                  : "No recent data"
              }
            />
            <Row
              label="Height"
              value={
                stats.body.heightInches != null
                  ? formatHeight(stats.body.heightInches, isMetric)
                  : "No recent data"
              }
            />
            <Row
              label="Body Fat"
              value={
                stats.body.bodyFatPercentage != null
                  ? `${Math.round(stats.body.bodyFatPercentage * 100)}%`
                  : "No recent data"
              }
            />
            <Row
              label="Lean Body Mass"
              value={
                stats.body.leanBodyMassLbs != null
                  ? formatWeight(stats.body.leanBodyMassLbs, unitSystem)
                  : "No recent data"
              }
            />
            <Row
              label="BMI"
              value={stats.body.bmi != null ? stats.body.bmi.toFixed(1) : "No recent data"}
            />
          </Section>

          <Section title="Sleep">
            <Row
              label="Last Night"
              value={
                stats.sleep.lastNightHours != null
                  ? `${stats.sleep.lastNightHours} hr`
                  : "No recent data"
              }
            />
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default HealthStats;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  rowLabel: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  emptySubtext: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  connectButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
  },
  connectButtonText: {
    color: "white",
    fontWeight: fontWeights.semibold,
  },
});
