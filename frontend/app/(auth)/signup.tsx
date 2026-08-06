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

const Signup = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, error } = useAuth();

    const handleSignup = async () => {
        setIsSubmitting(true);
        try {
            const result = await register(email, password);
            if ((result as any).meta?.requestStatus === "fulfilled") {
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
                    <Input label="Email" placeholder="Enter email" autoCapitalize="none" value={email} onChangeText={setEmail} keyboardType="email-address" />
                    <Input label="Password" placeholder="Enter password" autoCapitalize="none" value={password} onChangeText={setPassword} isPassword />
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
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