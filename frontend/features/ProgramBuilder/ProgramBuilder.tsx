import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native"
import { BodyPart, ProgramDurationDays } from "@/types/programs.types";
import Duration from "./components/Duration/Duration";
import SelectedDays from "./components/SelectedDays/SelectedDays";
import SessionMinutes from "./components/SessionMinutes/SessionMinutes";
import FocusAreas from "./components/FocusAreas/FocusAreas";
import styles from "./ProgramBuilder.styles";
import Button from "@/components/shared/Button/Button";
import { useCreateProgram } from "@/hooks/usePrograms";
import ProgramGenerationModal from "./components/ProgramGenerationModal/ProgramGenerationModal";

interface ProgramBuilderProps {
    onCancel: () => void;
    onCreated?: () => void;
}

const ProgramBuilder = ({ onCancel, onCreated }: ProgramBuilderProps) => {
    const [durationDays, setDurationDays] = useState<ProgramDurationDays>(30);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [sessionMinutes, setSessionMinutes] = useState<number>(30);
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [selectedFocusAreas, setSelectedFocusAreas] = useState<BodyPart[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [generatingProgramId, setGeneratingProgramId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const { mutate: createProgram, isPending } = useCreateProgram();

    const handleBuildProgram = () => {
        setValidationError(null);

        if (selectedDays.length === 0) {
            setValidationError("Select at least one preferred day.");
            return;
        }

        if (selectedFocusAreas.length === 0) {
            setValidationError("Select at least one focus area.");
            return;
        }

        createProgram(
            {
                startDate: startDate.toISOString(),
                durationDays,
                preferredDays: selectedDays,
                focusArea: selectedFocusAreas,
                sessionMinutes,
            },
            {
                onSuccess: (program) => {
                    setGeneratingProgramId(program.id);
                    setModalVisible(true);
                },
                onError: (error: any) => {
                    setValidationError(error?.message ?? "Something went wrong. Please try again.");
                },
            },
        );
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setGeneratingProgramId(null);
        onCreated?.();
    };

    return (
        <View style={styles.container}>
            <View style={styles.programFormContainer}>
                <Duration durationDays={durationDays} setDurationDays={setDurationDays} />
                <SelectedDays selectedDays={selectedDays} setSelectedDays={setSelectedDays} />
                <SessionMinutes sessionMinutes={sessionMinutes} setSessionMinutes={setSessionMinutes} />
                <FocusAreas selectedFocusAreas={selectedFocusAreas} setSelectedFocusAreas={setSelectedFocusAreas} />
            </View>
            {validationError && <Text style={styles.errorText}>{validationError}</Text>}
            <View style={styles.buttonsRow}>
                <TouchableOpacity onPress={onCancel} style={styles.cancelButton} disabled={isPending}>
                    <Text style={styles.cancel}>CANCEL</Text>
                </TouchableOpacity>
                <Button
                    title={isPending ? "BUILDING..." : "BUILD & ACTIVATE PROGRAM"}
                    onPress={handleBuildProgram}
                    disabled={isPending}
                />
            </View>
            <ProgramGenerationModal
                visible={modalVisible}
                programId={generatingProgramId}
                onClose={handleModalClose}
            />
        </View>
    )
}

export default ProgramBuilder;