import { useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import styles from "./ProgramsList.styles";
import Button from "@/components/shared/Button/Button";
import Toast from "@/components/shared/Toast/Toast";
import { colors } from "@/constants/colors";
import { usePrograms, useDeleteProgram } from "@/hooks/usePrograms";
import { formatCalendarDate } from "@/lib/utils/date.utils";

const formatDate = (dateStr: string) =>
  formatCalendarDate(dateStr, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const ProgramsList = () => {
  const { data: programs, isLoading } = usePrograms();
  const { mutate: deleteProgram, isPending } = useDeleteProgram();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDelete = (programId: string, programName: string) => {
    Alert.alert(
      "Delete program?",
      `This will permanently delete "${programName}" and any logged workouts for it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDeletingId(programId);
            deleteProgram(programId, {
              onSuccess: () => setToastMessage("Program deleted"),
              onSettled: () => setDeletingId(null),
            });
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 32 }} />;
  }

  if (!programs || programs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>You haven't created any programs yet.</Text>
        <Toast
          visible={!!toastMessage}
          message={toastMessage ?? ""}
          onHide={() => setToastMessage(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {programs.map((program) => (
        <View key={program.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{program.name}</Text>
            <Text style={program.isActive ? styles.activeBadge : styles.inactiveBadge}>
              {program.isActive ? "Active" : "Inactive"}
            </Text>
          </View>

          <Text style={styles.meta}>
            {formatDate(program.startDate)} - {formatDate(program.endDate)}
          </Text>
          <Text style={styles.meta}>
            {program.daysPerWeek} days/week - {program.fitnessLevel}
          </Text>

          <Button
            title={isPending && deletingId === program.id ? "DELETING..." : "DELETE"}
            backgroundColor={colors.dangerRed}
            style={styles.deleteButton}
            textStyle={styles.deleteButtonText}
            disabled={isPending && deletingId === program.id}
            onPress={() => handleDelete(program.id, program.name)}
          />
        </View>
      ))}
      <Toast
        visible={!!toastMessage}
        message={toastMessage ?? ""}
        onHide={() => setToastMessage(null)}
      />
    </View>
  );
};

export default ProgramsList;
