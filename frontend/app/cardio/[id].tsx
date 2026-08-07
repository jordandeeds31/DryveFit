import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import MapView, { Polyline } from "react-native-maps";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { cyberpunk } from "@/constants/cyberpunk";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import { useCardioSession, useDeleteCardioSession } from "@/hooks/useCardio";
import { CardioActivityType, CardioRoutePoint } from "@/types/cardio.types";

const METERS_PER_MILE = 1609.344;

const ACTIVITY_LABELS: Record<CardioActivityType, string> = {
  walk: "Walk",
  run: "Run",
  bike: "Bike Ride",
};

const formatPace = (meters: number, durationSecs: number): string => {
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.05 || durationSecs < 10) return "--:--";
  const paceSecondsPerMile = durationSecs / miles;
  const minutes = Math.floor(paceSecondsPerMile / 60);
  const seconds = Math.round(paceSecondsPerMile % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const CardioSessionDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session, isLoading, error } = useCardioSession(id ?? null);
  const { mutate: deleteSession, isPending: isDeleting } =
    useDeleteCardioSession();

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Delete this activity?",
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSession(id, {
              onSuccess: () => safeGoBack(),
              onError: () => Alert.alert("Couldn't delete activity", "Please try again."),
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={safeGoBack}
        >
          <Feather name="chevron-left" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          <Feather name="trash-2" size={20} color={colors.dangerRed} />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color="white" />
      )}

      {!isLoading && (error || !session) && (
        <Text style={styles.emptyText}>Couldn't load this activity.</Text>
      )}

      {!isLoading && session && (
        <>
          <View style={styles.mapContainer}>
            {session.route.length > 1 ? (
              <MapView
                style={StyleSheet.absoluteFill}
                userInterfaceStyle="dark"
                initialRegion={{
                  latitude: session.route[0].lat,
                  longitude: session.route[0].lng,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
              >
                {/* Wide, translucent under-layer simulates a neon glow —
                    RN has no real blur filter for map overlays. */}
                <Polyline
                  coordinates={session.route.map((p: CardioRoutePoint) => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  strokeColor="rgba(0, 246, 255, 0.35)"
                  strokeWidth={14}
                />
                <Polyline
                  coordinates={session.route.map((p: CardioRoutePoint) => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  strokeColor={cyberpunk.neonCyan}
                  strokeWidth={4}
                />
              </MapView>
            ) : (
              <View style={styles.noRoute}>
                <Ionicons name="map-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyText}>No route recorded.</Text>
              </View>
            )}
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.activityTitle}>
              {ACTIVITY_LABELS[session.activityType as CardioActivityType]}
            </Text>
            <Text style={styles.dateText}>
              {formatCalendarDate(session.startedAt, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {(session.distanceMeters / METERS_PER_MILE).toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>miles</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {Math.round(session.durationSeconds / 60)}
                </Text>
                <Text style={styles.statLabel}>minutes</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {formatPace(session.distanceMeters, session.durationSeconds)}
                </Text>
                <Text style={styles.statLabel}>pace /mi</Text>
              </View>
              {session.caloriesBurned != null && (
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{session.caloriesBurned}</Text>
                  <Text style={styles.statLabel}>calories</Text>
                </View>
              )}
              {session.stepCount != null && (
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{session.stepCount}</Text>
                  <Text style={styles.statLabel}>steps</Text>
                </View>
              )}
              {session.avgHeartRate != null && (
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{session.avgHeartRate}</Text>
                  <Text style={styles.statLabel}>avg bpm</Text>
                </View>
              )}
              {session.maxHeartRate != null && (
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{session.maxHeartRate}</Text>
                  <Text style={styles.statLabel}>max bpm</Text>
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CardioSessionDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: "white",
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "center",
  },
  mapContainer: {
    height: 260,
  },
  noRoute: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#111",
  },
  statsSection: {
    padding: spacing.md,
  },
  activityTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: "white",
  },
  dateText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  statBox: {
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: "white",
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.semibold,
  },
});
