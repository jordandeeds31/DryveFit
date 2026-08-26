import { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "@/components/shared/TextInput/TextInput";
import { spacing } from "@/constants/spacing";
import Button from "@/components/shared/Button/Button";
import GoogleSignInButton from "@/components/shared/GoogleSignInButton/GoogleSignInButton";
import { useAuth } from "@/hooks/useAuth";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/colors";
import { fontSizes } from "@/constants/typography";
import { detectAndSaveCity } from "@/lib/location/detectAndSaveCity";

const Signin = () => {
    const { passwordResetSuccess } = useLocalSearchParams<{ passwordResetSuccess?: string }>();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, error } = useAuth();

    const handleSignin = async () => {
        setIsSubmitting(true);
        try {
            const result = await login(email, password);
            if ((result as any).meta?.requestStatus === "fulfilled") {
                router.replace("/(tabs)")
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    const toSignup = () => {
        router.push("/(auth)/signup");
    }

    const handleGoogleSuccess = (isNewUser: boolean) => {
        if (isNewUser) detectAndSaveCity();
        router.replace("/(tabs)");
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <SafeAreaView style={styles.container}>
                <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                {passwordResetSuccess === "1" && (
                    <Text style={styles.successText}>Password reset — sign in with your new password.</Text>
                )}
                <View style={styles.textInputContainer}>
                    <Input label="Email" placeholder="Enter email" autoCapitalize="none" autoCorrect={false} spellCheck={false} textContentType="emailAddress" value={email} onChangeText={setEmail} keyboardType="email-address" />
                    <Input label="Password" placeholder="Enter password" autoCapitalize="none" value={password} onChangeText={setPassword} isPassword />
                    <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </TouchableOpacity>
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.buttonContainer}>
                    <Button title={isSubmitting ? "Signing In..." : "Sign In"} onPress={handleSignin} disabled={isSubmitting} />
                </View>
                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>
                <View style={styles.buttonContainer}>
                    <GoogleSignInButton onSuccess={handleGoogleSuccess} />
                </View>
                <View style={styles.accountRow}>
                    <Text>Don't have an account?</Text>
                    <TouchableOpacity onPress={toSignup}>
                        <Text style={styles.signupText}>Sign up</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    )
}

export default Signin;

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
    textInputContainer: {
        gap: spacing.md,
        marginBottom: spacing.lg
    },
    forgotPasswordText: {
        color: colors.primaryBlue,
        fontSize: fontSizes.sm,
        textAlign: "right"
    },
    successText: {
        color: colors.completedGreen,
        fontSize: fontSizes.sm,
        textAlign: "center",
        marginBottom: spacing.md
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
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.lg
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.borderGray
    },
    dividerText: {
        color: colors.textSecondary,
        fontSize: fontSizes.sm
    },
    accountRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        justifyContent: "center"
    },
    signupText: {
        color: colors.primaryBlue
    }
})