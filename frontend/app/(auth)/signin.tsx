import { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "@/components/shared/TextInput/TextInput";
import { spacing } from "@/constants/spacing";
import Button from "@/components/shared/Button/Button";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { colors } from "@/constants/colors";
import { fontSizes } from "@/constants/typography";

const Signin = () => {
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
                    <Button title={isSubmitting ? "Signing In..." : "Sign In"} onPress={handleSignin} disabled={isSubmitting} />
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