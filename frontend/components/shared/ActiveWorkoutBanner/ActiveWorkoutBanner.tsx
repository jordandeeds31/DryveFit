import { View, Text } from "react-native";
import { useWorkingOutCount } from "@/hooks/useActivity";
import styles from "./ActiveWorkoutBanner.styles";

const ActiveWorkoutBanner = () => {
  const { data, isLoading, isError } = useWorkingOutCount();

  // Nice-to-have motivational banner — fail silently rather than showing
  // a loading spinner or error state for something this low-stakes. Also
  // hidden entirely when nobody is currently active, even if some people
  // worked out earlier today — this banner is about "right now," and an
  // empty "in progress" count undercuts that.
  if (isLoading || isError || !data || data.inProgress.global === 0) {
    return null;
  }

  const { workedOutToday, inProgress, cityName } = data;

  return (
    <View style={styles.container}>
      <Text style={styles.primaryText}>
        🔥 {inProgress.global} {inProgress.global === 1 ? "person" : "people"}{" "}
        working out right now
      </Text>
      {inProgress.city !== null && inProgress.city > 0 && (
        <Text style={styles.secondaryText}>
          {inProgress.city} in {cityName}
        </Text>
      )}
      <Text style={styles.secondaryText}>
        {workedOutToday.global}{" "}
        {workedOutToday.global === 1 ? "person has" : "people have"} worked
        out today
      </Text>
    </View>
  );
};

export default ActiveWorkoutBanner;
