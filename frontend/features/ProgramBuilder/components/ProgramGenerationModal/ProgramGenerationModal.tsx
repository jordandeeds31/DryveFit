import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import { useProgramGenerationStatus } from "@/hooks/usePrograms";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

interface ProgramGenerationModalProps {
  visible: boolean;
  programId: string | null;
  onClose: () => void;
}

const ProgramGenerationModal = ({
  visible,
  programId,
  onClose,
}: ProgramGenerationModalProps) => {
  const { data: program } = useProgramGenerationStatus(programId);
  const queryClient = useQueryClient();

  const isCompleted = program?.generationStatus === "completed";
  const isFailed = program?.generationStatus === "failed";
  const isInProgress = !isCompleted && !isFailed;

  useEffect(() => {
    if (isCompleted) {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      onClose();
      router.replace("/(tabs)");
    }
  }, [isCompleted]);

  return (
    <Modal visible={visible} onClose={onClose} closable={!isInProgress}>
      <View style={styles.content}>
        {!isFailed && (
          <ActivityIndicator
            size="large"
            style={{ marginBottom: spacing.md }}
          />
        )}

        <Text style={styles.title}>
          {program?.name ?? "Building your program..."}
        </Text>

        <Text style={styles.message}>
          {isFailed
            ? (program?.generationError ??
              "Something went wrong. Please try again.")
            : (program?.generationStep ??
              "Please wait while we generate your personalized plan.")}
        </Text>

        {program && !isFailed && (
          <Text style={styles.progress}>
            {program.generatedSessions} / {program.totalSessions} sessions
            generated
          </Text>
        )}

        {isFailed && (
          <Button
            title="CLOSE"
            onPress={onClose}
            style={{ marginTop: spacing.md }}
          />
        )}
      </View>
    </Modal>
  );
};

export default ProgramGenerationModal;

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  progress: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});
