import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import DropdownExerciseSelect from "@/components/shared/DropdownExerciseSelect/DropdownExerciseSelect";
import Modal from "@/components/shared/Modal/Modal";
import Graph from "@/features/Graph/Graph";
import { Exercise, OneRepMaxEntry } from "@/types/exercise.types";
import { use1RMHistories } from "@/hooks/useExercises";
import { useCurrentStreak } from "@/hooks/usePrograms";

// Same options as the Nutrition tab's Macro Trends screen — a familiar,
// consistent time-range picker rather than a one-off design here.
const HISTORY_RANGES = ["1w", "1m", "3m", "6m", "1y", "all"] as const;
type HistoryRange = (typeof HISTORY_RANGES)[number];
const HISTORY_RANGE_LABELS: Record<HistoryRange, string> = {
  "1w": "1W",
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  all: "All",
};
// Matches the backend's own RANGE_CONFIG day-counts for Macro Trends
// (nutrition.service.ts) — this filtering happens client-side instead
// since 1RM history is already fetched in full and is a much smaller
// dataset (at most one entry per logged day per exercise).
const RANGE_DAYS: Record<Exclude<HistoryRange, "all">, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const filterHistoryByRange = (
  history: OneRepMaxEntry[],
  range: HistoryRange,
): OneRepMaxEntry[] => {
  if (range === "all") return history;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
  return history.filter((entry) => new Date(entry.date) >= cutoff);
};

const screenWidth = Dimensions.get("window").width;
const SCREEN_HORIZONTAL_PADDING = spacing.sm;
const GRID_COLUMN_GAP = spacing.sm;
const availableWidth = screenWidth - SCREEN_HORIZONTAL_PADDING * 2;
// A single selected exercise gets the full-width graph it always used to;
// two or more lay out two per row instead of stacking full-width, one
// under another, down the whole screen.
const GRID_ITEM_WIDTH = (availableWidth - GRID_COLUMN_GAP) / 2;
// The expanded-graph modal's own overlay/card padding (see Modal.styles.ts)
// eats into the screen width beyond just this page's own padding above.
const MODAL_GRAPH_WIDTH = screenWidth - spacing.sm * 2 - spacing.md * 2;

const PersonalRecordProgress = () => {
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  // Only meaningful in grid mode — tapping a small compact card opens
  // this same graph full-size instead. Tracked by id (not the whole
  // Exercise object) so it stays valid even if selectedExercises reorders.
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  // Defaults to "all" (not "1w" like Macro Trends) — this graph already
  // showed full history before this picker existed, and 1RM entries are
  // far sparser than logged food, so starting narrow would make an
  // existing lift's trend look empty by default instead of just adding a
  // way to narrow it.
  const [range, setRange] = useState<HistoryRange>("all");

  const histories = use1RMHistories(
    selectedExercises.map((exercise) => exercise.name),
  );
  const { data: streakData, isLoading: isStreakLoading } = useCurrentStreak();
  const currentStreak = streakData?.streak;
  const hasActiveProgram = streakData?.hasActiveProgram ?? false;

  const handleToggleExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) =>
      prev.some((selected) => selected.id === exercise.id)
        ? prev.filter((selected) => selected.id !== exercise.id)
        : [...prev, exercise],
    );
  };

  const isGrid = selectedExercises.length > 1;
  const graphWidth = isGrid ? GRID_ITEM_WIDTH : availableWidth;

  const expandedIndex = selectedExercises.findIndex(
    (exercise) => exercise.id === expandedExerciseId,
  );
  const expandedExercise =
    expandedIndex >= 0 ? selectedExercises[expandedIndex] : null;
  const expandedHistoryRaw =
    expandedIndex >= 0 ? histories[expandedIndex]?.data : undefined;
  const expandedHistory = expandedHistoryRaw
    ? filterHistoryByRange(expandedHistoryRaw, range)
    : undefined;

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Personal Record Progress</Text>
        <Text style={styles.subtitle}>
          Track how your estimated one-rep max for an exercise changes over
          time, based on the sets you've logged. Pick one or more exercises
          below to see their progress.
        </Text>

        {/* overlay (on the dropdown itself) makes its results float above
            the graphs below instead of pushing them down as it grows —
            but that only controls stacking within DropdownExerciseSelect's
            own children. Without this wrapper's zIndex/elevation, the
            grid View below (a later sibling here, in this same
            ScrollView) would still paint on top of it, since sibling
            paint order — not the dropdown's own internal zIndex — is
            what decides who's on top across this component boundary. */}
        <View style={styles.dropdownWrapper}>
          <DropdownExerciseSelect
            multiple
            selectedExercises={selectedExercises}
            onToggleExercise={handleToggleExercise}
            overlay
          />
        </View>

        {selectedExercises.length > 0 && (
          <View style={styles.rangeRow}>
            {HISTORY_RANGES.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.rangePill,
                  range === option && styles.rangePillActive,
                ]}
                onPress={() => setRange(option)}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    range === option && styles.rangePillTextActive,
                  ]}
                >
                  {HISTORY_RANGE_LABELS[option]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedExercises.length > 0 && (
          <View style={[styles.grid, isGrid && styles.gridSpaced]}>
            {selectedExercises.map((exercise, index) => {
              const result = histories[index];
              const history = result?.data
                ? filterHistoryByRange(result.data, range)
                : undefined;

              const handleRemove = () => handleToggleExercise(exercise);

              return (
                <View key={exercise.id} style={{ width: graphWidth }}>
                  {result?.isLoading ? (
                    <View
                      style={[
                        styles.placeholderCard,
                        !isGrid && styles.placeholderCardSpaced,
                        { width: graphWidth },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.placeholderRemoveButton}
                        onPress={handleRemove}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={styles.placeholderTitle} numberOfLines={1}>
                        {exercise.name}
                      </Text>
                      <ActivityIndicator style={{ marginTop: spacing.md }} />
                    </View>
                  ) : history && history.length === 0 ? (
                    <View
                      style={[
                        styles.placeholderCard,
                        !isGrid && styles.placeholderCardSpaced,
                        { width: graphWidth },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.placeholderRemoveButton}
                        onPress={handleRemove}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={styles.placeholderTitle} numberOfLines={1}>
                        {exercise.name}
                      </Text>
                      <Text style={styles.emptyText}>
                        {result?.data && result.data.length > 0
                          ? `No sets logged for this exercise in the last ${HISTORY_RANGE_LABELS[range]}. Try a wider range.`
                          : "No logged history yet. Log a set for this exercise and your progress will show up here."}
                      </Text>
                    </View>
                  ) : history && history.length > 0 ? (
                    <Graph
                      history={history}
                      title={exercise.name}
                      width={graphWidth}
                      compact={isGrid}
                      onRemove={handleRemove}
                      onPress={
                        isGrid
                          ? () => setExpandedExerciseId(exercise.id)
                          : undefined
                      }
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {!isStreakLoading && currentStreak != null && (
          <View style={styles.streakCard}>
            <View style={styles.streakIconWrap}>
              <Feather name="zap" size={18} color={colors.primaryBlue} />
            </View>
            <View>
              <Text style={styles.streakCount}>
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </Text>
              <Text style={styles.streakLabel}>
                {currentStreak === 0
                  ? "log today's workout to start a streak"
                  : hasActiveProgram
                    ? "stuck to your plan in a row"
                    : "day streak"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!expandedExercise}
        onClose={() => setExpandedExerciseId(null)}
      >
        {expandedExercise && expandedHistory && expandedHistory.length > 0 && (
          <Graph
            history={expandedHistory}
            title={expandedExercise.name}
            width={MODAL_GRAPH_WIDTH}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default PersonalRecordProgress;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    flexGrow: 1,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  dropdownWrapper: {
    zIndex: 10,
    elevation: 10,
  },
  // Matches nutrition-history.tsx's own range picker styling — same
  // control, same look, on a different screen.
  rangeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  rangePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  rangePillActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  rangePillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  rangePillTextActive: {
    color: "white",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 0,
    // Handles between-row spacing itself — Graph's own marginTop is 0 in
    // compact mode (see Graph.tsx's cardCompact) precisely so it doesn't
    // double up with this once there's more than one row.
    rowGap: spacing.sm,
  },
  // A bit more breathing room above the grid specifically when there's
  // more than one graph — the single-exercise case already gets its own
  // top margin from Graph's own (non-compact) card style.
  gridSpaced: {
    marginTop: spacing.sm,
  },
  // Only the single-exercise (non-grid) case needs its own extra top
  // margin — Graph's default (non-compact) card style already has one,
  // so this keeps the loading/empty placeholder visually consistent with
  // it when there's no real history to render yet.
  placeholderCardSpaced: {
    marginTop: spacing.md,
  },
  placeholderCard: {
    backgroundColor: "#f7f9fc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e6ec",
    padding: spacing.md,
    minHeight: 160,
  },
  placeholderRemoveButton: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e6ec",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  placeholderTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    textAlign: "center",
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    // The explicit "border bottom shadow" look — offset straight down,
    // no blur on the sides, so it reads as a shadow cast under the card
    // rather than a soft ambient glow all the way around it.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  streakIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
  streakLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
