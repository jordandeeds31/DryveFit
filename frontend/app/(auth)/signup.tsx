import { useState } from "react";
import Input from "@/components/shared/TextInput/TextInput"
import { View, StyleSheet, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/shared/Button/Button";
import { useAuth } from "@/hooks/useAuth";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes } from "@/constants/typography";
import { router } from "expo-router";
import { detectAndSaveUnitSystem } from "@/lib/location/detectUnitSystem";

const Signup = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const { register, error } = useAuth();

    const handleSignup = async () => {
        if (password.length < 8) {
            setValidationError("Password must be at least 8 characters");
            return;
        }
        setValidationError(null);

        setIsSubmitting(true);
        try {
            const result = await register(email, password);
            if ((result as any).meta?.requestStatus === "fulfilled") {
                // Deliberately not awaited — the permission prompt + GPS
                // fix + reverse-geocode can take a few seconds, and none
                // of it should delay landing in the app. Best-effort and
                // silent either way (see detectAndSaveUnitSystem).
                detectAndSaveUnitSystem();
                router.replace("/(tabs)");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    const toSignin = () => {
        router.push("/(auth)/signin");
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <SafeAreaView style={styles.container}>
                <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <View style={styles.textInputContainer}>
                    <Input label="Email" placeholder="Enter email" autoCapitalize="none" autoCorrect={false} spellCheck={false} textContentType="emailAddress" value={email} onChangeText={setEmail} keyboardType="email-address" />
                    <Input label="Password" placeholder="Enter password (min. 8 characters)" autoCapitalize="none" value={password} onChangeText={setPassword} isPassword />
                </View>
                {(validationError || error) && (
                    <Text style={styles.errorText}>{validationError ?? error}</Text>
                )}
                <View style={styles.buttonContainer}>
                    <Button title={isSubmitting ? "Signing Up..." : "Sign Up"} onPress={handleSignup} disabled={isSubmitting} />
                </View>
                <View style={styles.accountRow}>
                    <Text>Already have an account?</Text>
                    <TouchableOpacity onPress={toSignin}>
                        <Text style={styles.signupText}>Sign in</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    )
}

export default Signup;

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
    signupText: {
        color: colors.primaryBlue
    }
})