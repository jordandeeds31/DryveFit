import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/constants/spacing";
import ProgramsList from "@/features/ProgramsList/ProgramsList";

const ProgramsScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ProgramsList />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProgramsScreen;

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
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
});
