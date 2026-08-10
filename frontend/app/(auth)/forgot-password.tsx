import { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes } from "@/constants/typography";
import { useForgotPassword } from "@/hooks/usePasswordReset";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const { mutate: sendCode, isPending, error } = useForgotPassword();

    const handleSend = () => {
        sendCode(email, {
            onSuccess: () => {
                router.push({ pathname: "/(auth)/reset-password", params: { email } });
            },
        });
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <SafeAreaView style={styles.container}>
                <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Forgot your password?</Text>
                <Text style={styles.subtitle}>
                    Enter your email and we'll send you a code to reset it.
                </Text>

                <View style={styles.textInputContainer}>
                    <Input
                        label="Email"
                        placeholder="Enter email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        textContentType="emailAddress"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                    />
                </View>

                {error && <Text style={styles.errorText}>{(error as any).message}</Text>}

                <View style={styles.buttonContainer}>
                    <Button
                        title={isPending ? "Sending..." : "Send Reset Code"}
                        onPress={handleSend}
                        disabled={isPending || email.trim() === ""}
                    />
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

export default ForgotPassword;

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
    backText: {
        color: colors.primaryBlue
    }
})
