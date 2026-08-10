import { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes } from "@/constants/typography";
import { useResetPassword } from "@/hooks/usePasswordReset";

const ResetPassword = () => {
    const { email } = useLocalSearchParams<{ email: string }>();
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [validationError, setValidationError] = useState<string | null>(null);

    const { mutate: reset, isPending, error } = useResetPassword();

    const handleReset = () => {
        if (newPassword.length < 8) {
            setValidationError("Password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setValidationError("Passwords don't match");
            return;
        }
        setValidationError(null);

        reset(
            { email, code, newPassword },
            {
                onSuccess: () => {
                    router.replace({
                        pathname: "/(auth)/signin",
                        params: { passwordResetSuccess: "1" },
                    });
                },
            },
        );
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <SafeAreaView style={styles.container}>
                <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>
                    Enter the code we sent to {email} along with your new password.
                </Text>

                <View style={styles.textInputContainer}>
                    <Input
                        label="Reset Code"
                        placeholder="6-digit code"
                        autoCapitalize="none"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={code}
                        onChangeText={setCode}
                    />
                    <Input
                        label="New Password"
                        placeholder="Enter new password (min. 8 characters)"
                        autoCapitalize="none"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        isPassword
                    />
                    <Input
                        label="Confirm New Password"
                        placeholder="Re-enter new password"
                        autoCapitalize="none"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        isPassword
                    />
                </View>

                {(validationError || error) && (
                    <Text style={styles.errorText}>
                        {validationError ?? (error as any)?.message}
                    </Text>
                )}

                <View style={styles.buttonContainer}>
                    <Button
                        title={isPending ? "Resetting..." : "Reset Password"}
                        onPress={handleReset}
                        disabled={isPending}
                    />
                </View>
                <View style={[styles.accountRow, styles.sendAgainRow]}>
                    <TouchableOpacity onPress={() => router.replace("/(auth)/forgot-password")}>
                        <Text style={styles.backText}>Didn't get a code? Send again</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.accountRow}>
                    <TouchableOpacity onPress={() => router.replace("/(auth)/signin")}>
                        <Text style={styles.backText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    )
}

export default ResetPassword;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
        backgroundColor: "white"
    },
    logo: {
        width: 96,
        height: 96,
        alignSelf: "center",
        marginBottom: spacing.lg
    },
    title: {
        fontSize: fontSizes.lg,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: spacing.xs
    },
    subtitle: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.md
    },
    textInputContainer: {
        gap: spacing.md,
        marginBottom: spacing.lg
    },
    errorText: {
        color: "red",
        fontSize: fontSizes.sm,
        textAlign: "center",
        marginBottom: spacing.md
    },
    buttonContainer: {
        marginBottom: spacing.lg
    },
    accountRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        justifyContent: "center"
    },
    sendAgainRow: {
        marginBottom: spacing.md
    },
    backText: {
        color: colors.primaryBlue
    }
})
