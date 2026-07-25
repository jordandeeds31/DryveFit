import { View, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProgramBuilder from "@/features/ProgramBuilder/ProgramBuilder";
import Button from "@/components/shared/Button/Button";
import useToggle from "@/hooks/useToggle";
import { spacing } from "@/constants/spacing";
import NoPrograms from "@/components/shared/NoPrograms/NoPrograms";
import { usePrograms } from "@/hooks/usePrograms";

const HomeScreen = () => {
    const { isOpen, open, close, toggle } = useToggle();
    const { data: programs, isLoading } = usePrograms();

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1 }} />
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.buttonContainer}>
                    <Button title="CREATE NEW PROGRAM" onPress={toggle} />
                </View>
                {isOpen && <ProgramBuilder onCancel={close} onCreated={close} />}
                {(!programs || programs.length === 0) && (
                    <View style={styles.noProgramsContainer}>
                        <NoPrograms />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.sm,
        flexGrow: 1,
    },
    buttonContainer: {
        marginBottom: spacing.md
    },
    noProgramsContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    }
})